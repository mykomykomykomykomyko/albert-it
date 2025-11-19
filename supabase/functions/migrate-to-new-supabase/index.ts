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
    console.log('[Migration] Starting migration to new Supabase instance...');

    // Get secrets for the new Supabase instance
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');
    
    // Get current Supabase credentials
    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!targetUrl || !targetServiceKey || !sourceUrl || !sourceServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Create clients
    const sourceSupabase = createClient(sourceUrl, sourceServiceKey);
    const targetSupabase = createClient(targetUrl, targetServiceKey);

    console.log('[Migration] Clients created successfully');

    // Define migration order (respecting foreign key dependencies)
    const tablesToMigrate = [
      'profiles',
      'user_roles',
      'user_preferences',
      'user_temp_passwords',
      'access_codes',
      'frameworks',
      'agents',
      'agent_shares',
      'conversations',
      'messages',
      'file_attachments',
      'prompts',
      'prompt_shares',
      'prompt_executions',
      'workflows',
      'workflow_shares',
      'workflow_executions',
      'saved_canvases',
      'saved_stages',
      'image_analysis_sessions',
      'image_analysis_images',
      'image_analysis_prompts',
      'image_analysis_results',
      'meeting_transcripts',
      'voice_analysis_results',
      'chat_history',
    ];

    const migrationResults = {
      success: true,
      tables: {} as Record<string, { rows: number; success: boolean; error?: string }>,
      users: { total: 0, migrated: 0, errors: [] as string[] },
    };

    // Step 1: Migrate users from auth.users
    console.log('[Migration] Step 1: Migrating users...');
    try {
      const { data: sourceUsers, error: sourceUsersError } = await sourceSupabase.auth.admin.listUsers();
      
      if (sourceUsersError) {
        console.error('[Migration] Error fetching source users:', sourceUsersError);
        migrationResults.users.errors.push(`Error fetching users: ${sourceUsersError.message}`);
      } else if (sourceUsers?.users) {
        migrationResults.users.total = sourceUsers.users.length;
        
        for (const user of sourceUsers.users) {
          try {
            // Create user in target with a temporary password (they'll need to reset)
            const tempPassword = crypto.randomUUID();
            const { error: createError } = await targetSupabase.auth.admin.createUser({
              email: user.email!,
              password: tempPassword,
              email_confirm: true,
              user_metadata: user.user_metadata,
              app_metadata: user.app_metadata,
            });

            if (createError) {
              console.error(`[Migration] Error creating user ${user.email}:`, createError);
              migrationResults.users.errors.push(`${user.email}: ${createError.message}`);
            } else {
              migrationResults.users.migrated++;
              console.log(`[Migration] Migrated user: ${user.email}`);
            }
          } catch (error) {
            console.error(`[Migration] Exception creating user ${user.email}:`, error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            migrationResults.users.errors.push(`${user.email}: ${errorMsg}`);
          }
        }
      }
    } catch (error) {
      console.error('[Migration] Exception in user migration:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      migrationResults.users.errors.push(`General error: ${errorMsg}`);
    }

    // Step 2: Migrate table data
    console.log('[Migration] Step 2: Migrating table data...');
    for (const table of tablesToMigrate) {
      try {
        console.log(`[Migration] Migrating table: ${table}`);
        
        // Fetch all data from source
        const { data: sourceData, error: fetchError } = await sourceSupabase
          .from(table)
          .select('*');

        if (fetchError) {
          console.error(`[Migration] Error fetching ${table}:`, fetchError);
          migrationResults.tables[table] = {
            rows: 0,
            success: false,
            error: fetchError.message,
          };
          continue;
        }

        if (!sourceData || sourceData.length === 0) {
          console.log(`[Migration] No data in table: ${table}`);
          migrationResults.tables[table] = { rows: 0, success: true };
          continue;
        }

        // Insert data into target in batches of 100
        const batchSize = 100;
        let successCount = 0;
        
        for (let i = 0; i < sourceData.length; i += batchSize) {
          const batch = sourceData.slice(i, i + batchSize);
          
          const { error: insertError } = await targetSupabase
            .from(table)
            .insert(batch);

          if (insertError) {
            console.error(`[Migration] Error inserting batch into ${table}:`, insertError);
            migrationResults.tables[table] = {
              rows: successCount,
              success: false,
              error: insertError.message,
            };
            break;
          }
          
          successCount += batch.length;
          console.log(`[Migration] Inserted ${successCount}/${sourceData.length} rows into ${table}`);
        }

        if (successCount === sourceData.length) {
          migrationResults.tables[table] = {
            rows: successCount,
            success: true,
          };
        }
      } catch (error) {
        console.error(`[Migration] Exception migrating ${table}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        migrationResults.tables[table] = {
          rows: 0,
          success: false,
          error: errorMsg,
        };
      }
    }

    console.log('[Migration] Migration complete!');
    console.log('[Migration] Results:', JSON.stringify(migrationResults, null, 2));

    return new Response(
      JSON.stringify({
        success: migrationResults.success,
        message: 'Migration completed. Check results for details.',
        results: migrationResults,
        note: 'Users have been created with temporary passwords. They will need to use password reset to access their accounts.',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg,
        details: 'Check edge function logs for more information',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
