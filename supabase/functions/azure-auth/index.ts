import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
const AZURE_TENANT_URL = Deno.env.get('AZURE_TENANT_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('[Azure Auth] Action:', action);

    // Validate required env vars
    if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_URL) {
      console.error('[Azure Auth] Missing Azure configuration');
      return new Response(JSON.stringify({ error: 'Azure AD not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action 1: Get authorization URL
    if (action === 'authorize') {
      const body = await req.json();
      const redirectUri = body.redirectUri;
      const state = crypto.randomUUID();

      // Normalize tenant URL - extract base URL without any path
      const tenantUrlObj = new URL(AZURE_TENANT_URL);
      const baseUrl = `${tenantUrlObj.origin}${tenantUrlObj.pathname.replace(/\/oauth2\/v2\.0\/(authorize|token).*$/, '')}`;
      
      // Build Microsoft authorization URL
      const authUrl = new URL(`${baseUrl}/oauth2/v2.0/authorize`);
      authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', 'openid email profile offline_access');
      authUrl.searchParams.set('state', state);

      console.log('[Azure Auth] Generated auth URL for redirect:', redirectUri);

      return new Response(JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action 2: Exchange code for tokens and sign in user
    if (action === 'callback') {
      const body = await req.json();
      const { code, redirectUri } = body;

      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[Azure Auth] Exchanging code for tokens...');

      // Normalize tenant URL - extract base URL without any path
      const tenantUrlObj = new URL(AZURE_TENANT_URL);
      const baseUrl = `${tenantUrlObj.origin}${tenantUrlObj.pathname.replace(/\/oauth2\/v2\.0\/(authorize|token).*$/, '')}`;

      // Exchange code for tokens
      const tokenUrl = `${baseUrl}/oauth2/v2.0/token`;
      const tokenParams = new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email profile offline_access',
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('[Azure Auth] Token exchange failed:', tokenData);
        return new Response(JSON.stringify({ 
          error: 'Token exchange failed', 
          details: tokenData.error_description || tokenData.error 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[Azure Auth] Token exchange successful');

      // Decode ID token to get user info
      const idToken = tokenData.id_token;
      const tokenParts = idToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));

      const email = payload.email || payload.preferred_username;
      const name = payload.name || '';
      const azureId = payload.oid || payload.sub;

      console.log('[Azure Auth] User info:', { email, name, azureId });

      if (!email) {
        return new Response(JSON.stringify({ error: 'No email in Azure token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Supabase admin client
      const supabaseAdmin = createClient(
        SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Check if user exists (case-insensitive comparison since Azure may return mixed-case emails)
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailLower = email.toLowerCase();
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === emailLower);

      let userId: string;
      let session: any;

      if (existingUser) {
        // User exists - generate a magic link token for sign in
        // Use the stored email from Supabase (lowercase) to ensure magic link works
        const storedEmail = existingUser.email!;
        console.log('[Azure Auth] Existing user found, signing in:', storedEmail);
        
        // Generate a sign-in link (we'll use the token directly)
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: storedEmail,
        });

        if (signInError) {
          console.error('[Azure Auth] Sign-in link generation failed:', signInError);
          return new Response(JSON.stringify({ error: 'Failed to sign in user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = existingUser.id;
        
        // Extract the token from the link
        const linkUrl = new URL(signInData.properties.action_link);
        const token = linkUrl.searchParams.get('token');
        const type = linkUrl.searchParams.get('type');

        return new Response(JSON.stringify({ 
          success: true,
          userId,
          email,
          name,
          isNewUser: false,
          verifyUrl: signInData.properties.action_link,
          token,
          type,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Create new user
        console.log('[Azure Auth] Creating new user:', email);
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            azure_id: azureId,
            provider: 'azure',
          },
        });

        if (createError) {
          console.error('[Azure Auth] User creation failed:', createError);
          
          // If user already exists (race condition or wasn't found initially), try to sign them in
          if (createError.message?.includes('already') || createError.message?.includes('exists')) {
            console.log('[Azure Auth] User may already exist, attempting to sign in...');
            
            // Try to get user by email directly
            const { data: userByEmail } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = userByEmail?.users?.find(u => u.email?.toLowerCase() === emailLower);
            
            if (foundUser) {
              const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: foundUser.email!,
              });

              if (!signInError && signInData) {
                const linkUrl = new URL(signInData.properties.action_link);
                const token = linkUrl.searchParams.get('token');
                const type = linkUrl.searchParams.get('type');

                return new Response(JSON.stringify({ 
                  success: true,
                  userId: foundUser.id,
                  email: foundUser.email,
                  name,
                  isNewUser: false,
                  verifyUrl: signInData.properties.action_link,
                  token,
                  type,
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
          
          return new Response(JSON.stringify({ error: 'Failed to create user', details: createError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = newUser.user.id;

        // Generate sign-in link for the new user
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (signInError) {
          console.error('[Azure Auth] Sign-in link generation failed:', signInError);
          return new Response(JSON.stringify({ error: 'Failed to sign in new user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const linkUrl = new URL(signInData.properties.action_link);
        const token = linkUrl.searchParams.get('token');
        const type = linkUrl.searchParams.get('type');

        return new Response(JSON.stringify({ 
          success: true,
          userId,
          email,
          name,
          isNewUser: true,
          verifyUrl: signInData.properties.action_link,
          token,
          type,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Azure Auth] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
