import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Step 3] Starting: Populate auth.users and build UUID crosswalk...');
    
    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');

    if (!sourceUrl || !sourceServiceKey || !targetUrl || !targetServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const sourceSupabase = createClient(sourceUrl, sourceServiceKey);
    const targetSupabase = createClient(targetUrl, targetServiceKey);

    // Fetch all source profiles
    console.log('[Step 3] Fetching source profiles...');
    const PAGE_SIZE = 100;
    let page = 0;
    let hasMore = true;
    const sourceProfiles = [];

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: profilesPage, error: profilesError } = await sourceSupabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, to);

      if (profilesError) {
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      if (!profilesPage || profilesPage.length === 0) {
        hasMore = false;
        break;
      }

      sourceProfiles.push(...profilesPage);

      if (profilesPage.length < PAGE_SIZE) {
        hasMore = false;
      }

      page++;

      if (page > 1000) {
        console.warn('[Step 3] Hit page limit');
        hasMore = false;
      }
    }

    console.log(`[Step 3] Found ${sourceProfiles.length} profiles to migrate`);

    // Build UUID crosswalk
    const uuidCrosswalk: Array<{ oldUuid: string; newUuid: string; email: string }> = [];
    let migrated = 0;
    const errors: string[] = [];

    for (const profile of sourceProfiles) {
      if (!profile.email) {
        console.warn(`[Step 3] Profile ${profile.id} has no email, skipping`);
        errors.push(`${profile.id}: missing email`);
        continue;
      }

      try {
        const tempPassword = crypto.randomUUID();

        // Check if user already exists
        const { data: existingUsers } = await targetSupabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === profile.email);

        if (existingUser) {
          console.log(`[Step 3] User ${profile.email} already exists`);
          uuidCrosswalk.push({
            oldUuid: profile.id,
            newUuid: existingUser.id,
            email: profile.email,
          });
          migrated++;
          continue;
        }

        // Create new user
        const { data: newUser, error: createError } = await targetSupabase.auth.admin.createUser({
          email: profile.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: profile.full_name,
          },
        });

        if (createError) {
          if (createError.message?.includes('already registered')) {
            const { data: recheckUsers } = await targetSupabase.auth.admin.listUsers();
            const recheckUser = recheckUsers?.users?.find(u => u.email === profile.email);
            if (recheckUser) {
              uuidCrosswalk.push({
                oldUuid: profile.id,
                newUuid: recheckUser.id,
                email: profile.email,
              });
              migrated++;
            }
          } else {
            console.error(`[Step 3] Error creating ${profile.email}:`, createError);
            errors.push(`${profile.email}: ${createError.message}`);
          }
          continue;
        }

        if (newUser?.user) {
          uuidCrosswalk.push({
            oldUuid: profile.id,
            newUuid: newUser.user.id,
            email: profile.email,
          });
          migrated++;
          console.log(`[Step 3] ✓ Created: ${profile.email} | ${profile.id} -> ${newUser.user.id}`);
        }
      } catch (error) {
        console.error(`[Step 3] Exception creating ${profile.email}:`, error);
        errors.push(`${profile.email}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`[Step 3] ✓ Complete: ${migrated}/${sourceProfiles.length} users migrated`);
    console.log(`[Step 3] UUID Crosswalk contains ${uuidCrosswalk.length} mappings`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${migrated} users and built UUID crosswalk`,
        totalProfiles: sourceProfiles.length,
        usersMigrated: migrated,
        uuidCrosswalk,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Step 3] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
