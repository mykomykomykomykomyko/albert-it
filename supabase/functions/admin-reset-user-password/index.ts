import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseClient.auth.getUser(token);

    if (!adminUser) {
      throw new Error('Unauthorized');
    }

    // Verify admin role using admin client (bypasses RLS)
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin role required');
    }

    const { user_id, expiry_days = 7 } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Generate secure temporary password (12 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(x => chars[x % chars.length])
      .join('');

    // Update user's password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: tempPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Hash the temp password for storage (simple hash for demo)
    const encoder = new TextEncoder();
    const data = encoder.encode(tempPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiry_days);

    // Mark any existing temp passwords as used
    await supabaseAdmin
      .from('user_temp_passwords')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('used', false);

    // Insert new temp password record
    const { error: insertError } = await supabaseAdmin
      .from('user_temp_passwords')
      .insert({
        user_id,
        temp_password_hash: hashHex,
        created_by: adminUser.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    // Update profile to require password change
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', user_id);

    if (profileError) {
      throw profileError;
    }

    console.log(`Temporary password created for user ${user_id} by admin ${adminUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        temp_password: tempPassword,
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in admin-reset-user-password:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});