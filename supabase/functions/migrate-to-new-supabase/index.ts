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
    
    // Get request body for options
    const body = await req.json().catch(() => ({}));
    const clearBeforeMigration = body.clearBeforeMigration ?? false;
    
    console.log(`[Migration] Clear before migration: ${clearBeforeMigration}`);

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
      schemaSetup: { success: false, error: '' },
      tables: {} as Record<string, { rows: number; success: boolean; error?: string }>,
      users: { total: 0, migrated: 0, errors: [] as string[] },
      warnings: [] as string[],
    };

    // Map to track old user ID -> new user ID
    const userIdMapping = new Map<string, string>();

    // WARNING: Schema must be set up first
    migrationResults.warnings.push(
      'CRITICAL: Before running this migration, you must apply all schema migrations to the target database.',
      'This function only copies data, not table structures, RLS policies, or database functions.',
      'Steps required:',
      '1. Install Supabase CLI: npm install -g supabase',
      '2. Link to target project: supabase link --project-ref <target-project-ref>',
      '3. Apply migrations: supabase db push',
      '4. Deploy edge functions: supabase functions deploy',
      '5. Then run this migration to copy data',
      '',
      'See MIGRATION_GUIDE.md for complete instructions',
    );

    // Check if target has basic schema by checking for profiles table
    console.log('[Migration] Checking if target schema exists...');
    try {
      const { error: schemaCheckError } = await targetSupabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (schemaCheckError) {
        if (schemaCheckError.message.includes('relation') || schemaCheckError.message.includes('does not exist')) {
          throw new Error(
            'Target database schema not set up. Tables do not exist. ' +
            'You must apply migrations first using Supabase CLI or manually execute migration files.'
          );
        }
      } else {
        migrationResults.schemaSetup.success = true;
        console.log('[Migration] Target schema appears to be set up correctly');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      migrationResults.schemaSetup.error = errorMsg;
      console.error('[Migration] Schema check failed:', errorMsg);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Target database schema not ready',
          message: errorMsg,
          instructions: migrationResults.warnings,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Step 1: Migrate auth.users with full metadata
    console.log('[Migration] Step 1: Migrating auth.users and building ID mapping...');
    try {
      // First, get all profiles from source to use as base
      const PAGE_SIZE_USERS = 100;
      let page = 0;
      let hasMore = true;
      const sourceProfiles = [];

      while (hasMore) {
        const from = page * PAGE_SIZE_USERS;
        const to = from + PAGE_SIZE_USERS - 1;

        const { data: profilesPage, error: profilesError } = await sourceSupabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true })
          .range(from, to);

        if (profilesError) {
          console.error('[Migration] Error fetching source profiles:', profilesError);
          migrationResults.users.errors.push(
            `Error fetching profiles: ${profilesError.message ?? JSON.stringify(profilesError)}`,
          );
          break;
        }

        if (!profilesPage || profilesPage.length === 0) {
          hasMore = false;
          break;
        }

        sourceProfiles.push(...profilesPage);

        if (profilesPage.length < PAGE_SIZE_USERS) {
          hasMore = false;
        }

        page++;

        if (page > 1000) {
          console.warn('[Migration] Hit profiles page limit');
          hasMore = false;
        }
      }

      console.log(`[Migration] Found ${sourceProfiles.length} profiles in source`);
      migrationResults.users.total = sourceProfiles.length;

      // Create auth users for each profile
      for (const profile of sourceProfiles) {
        if (!profile.email) {
          console.warn(`[Migration] Profile ${profile.id} has no email, skipping`);
          migrationResults.users.errors.push(`${profile.id}: missing email`);
          continue;
        }

        try {
          const tempPassword = crypto.randomUUID();
          
          // Check if user already exists in target
          const { data: existingUsers } = await targetSupabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === profile.email);
          
          if (existingUser) {
            console.log(`[Migration] User ${profile.email} already exists in target`);
            userIdMapping.set(profile.id, existingUser.id);
            migrationResults.users.migrated++;
            continue;
          }

          // Create new user in target
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
              console.log(`[Migration] User ${profile.email} registered between checks`);
              const { data: recheckUsers } = await targetSupabase.auth.admin.listUsers();
              const recheckUser = recheckUsers?.users?.find(u => u.email === profile.email);
              if (recheckUser) {
                userIdMapping.set(profile.id, recheckUser.id);
                migrationResults.users.migrated++;
              }
            } else {
              console.error(`[Migration] Error creating user ${profile.email}:`, createError);
              migrationResults.users.errors.push(
                `${profile.email}: ${createError.message ?? JSON.stringify(createError)}`,
              );
            }
            continue;
          }

          if (newUser?.user) {
            userIdMapping.set(profile.id, newUser.user.id);
            migrationResults.users.migrated++;
            console.log(
              `[Migration] Created auth user: ${profile.email} (${profile.id} -> ${newUser.user.id})`,
            );
          }
        } catch (error) {
          console.error(`[Migration] Exception creating user ${profile.email}:`, error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          migrationResults.users.errors.push(`${profile.email}: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('[Migration] Exception in auth.users migration:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      migrationResults.users.errors.push(`General error: ${errorMsg}`);
    }

    console.log(`[Migration] User ID mapping built: ${userIdMapping.size} users mapped`);
    console.log('[Migration] Step 2: Migrating table data (including full profile data)...');
    
    // Step 2a: Optionally clear existing data
    if (clearBeforeMigration) {
      console.log('[Migration] Step 2a: Clearing existing data from target...');
      
      // Delete in reverse order to respect foreign keys
      const reverseTables = [...tablesToMigrate].reverse();
      
      for (const table of reverseTables) {
        try {
          console.log(`[Migration] Clearing table: ${table}`);
          const { error: deleteError } = await targetSupabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
          
          if (deleteError && !deleteError.message.includes('no rows')) {
            console.warn(`[Migration] Error clearing ${table}:`, deleteError);
          } else {
            console.log(`[Migration] Cleared table: ${table}`);
          }
        } catch (error) {
          console.warn(`[Migration] Exception clearing ${table}:`, error);
        }
      }
      console.log('[Migration] Finished clearing tables');
    }
    
    // Step 2b: Migrate table data with pagination for memory efficiency
    
    const PAGE_SIZE = 50; // Small page size to avoid memory issues
    const INSERT_BATCH_SIZE = 25; // Even smaller insert batches
    
    for (const table of tablesToMigrate) {
      try {
        console.log(`[Migration] Migrating table: ${table}`);
        
        let successCount = 0;
        let page = 0;
        let hasMore = true;
        
        // Paginate through source data to avoid loading everything into memory
        while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          
          // Fetch one page at a time
          const { data: pageData, error: fetchError, count } = await sourceSupabase
            .from(table)
            .select('*', { count: 'exact' })
            .range(from, to);

          if (fetchError) {
            console.error(`[Migration] Error fetching ${table} page ${page}:`, fetchError);
            migrationResults.tables[table] = {
              rows: successCount,
              success: false,
              error: fetchError.message,
            };
            break;
          }

          // If no data on first page, table is empty
          if (page === 0 && (!pageData || pageData.length === 0)) {
            console.log(`[Migration] No data in table: ${table}`);
            migrationResults.tables[table] = { rows: 0, success: true };
            hasMore = false;
            break;
          }

          // If no more data, we're done
          if (!pageData || pageData.length === 0) {
            hasMore = false;
            migrationResults.tables[table] = {
              rows: successCount,
              success: true,
            };
            break;
          }

          // Insert this page's data in small batches
          for (let i = 0; i < pageData.length; i += INSERT_BATCH_SIZE) {
            const batch = pageData.slice(i, i + INSERT_BATCH_SIZE);
            
            // Transform user IDs in the data
            const transformedBatch = batch.map(row => {
              const transformed = { ...row };
              
              // Transform user_id fields
              if (transformed.user_id && userIdMapping.has(transformed.user_id)) {
                transformed.user_id = userIdMapping.get(transformed.user_id);
              }
              
              // Transform id field for profiles table (references auth.users)
              if (table === 'profiles' && transformed.id && userIdMapping.has(transformed.id)) {
                transformed.id = userIdMapping.get(transformed.id);
              }
              
              // Transform reviewer_id for agents table
              if (table === 'agents' && transformed.reviewer_id && userIdMapping.has(transformed.reviewer_id)) {
                transformed.reviewer_id = userIdMapping.get(transformed.reviewer_id);
              }
              
              // Transform shared_by_user_id and shared_with_user_id
              if (transformed.shared_by_user_id && userIdMapping.has(transformed.shared_by_user_id)) {
                transformed.shared_by_user_id = userIdMapping.get(transformed.shared_by_user_id);
              }
              if (transformed.shared_with_user_id && userIdMapping.has(transformed.shared_with_user_id)) {
                transformed.shared_with_user_id = userIdMapping.get(transformed.shared_with_user_id);
              }
              
              // Transform created_by for user_temp_passwords
              if (transformed.created_by && userIdMapping.has(transformed.created_by)) {
                transformed.created_by = userIdMapping.get(transformed.created_by);
              }
              
              return transformed;
            });
            
            // Use upsert to handle duplicates
            const { error: insertError } = await targetSupabase
              .from(table)
              .upsert(transformedBatch, { onConflict: 'id' });

            if (insertError) {
              console.error(`[Migration] Error inserting batch into ${table}:`, insertError);
              migrationResults.tables[table] = {
                rows: successCount,
                success: false,
                error: insertError.message,
              };
              hasMore = false;
              break;
            }
            
            successCount += batch.length;
          }

          console.log(`[Migration] Migrated ${successCount} rows from ${table}`);
          
          // Check if we have more pages
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
            migrationResults.tables[table] = {
              rows: successCount,
              success: true,
            };
          }
          
          page++;
          
          // Safety limit to prevent infinite loops
          if (page > 1000) {
            console.warn(`[Migration] Hit page limit for ${table}, stopping pagination`);
            hasMore = false;
            migrationResults.tables[table] = {
              rows: successCount,
              success: true,
              error: 'Reached pagination limit (50,000 rows)',
            };
          }
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
        message: 'Data migration completed. Check results for details.',
        results: migrationResults,
        postMigrationSteps: [
          'Verify all data was migrated correctly',
          'Deploy edge functions manually: supabase functions deploy',
          'Update storage buckets and policies if needed',
          'Test authentication and user access',
          'Users will need to reset passwords to access their accounts',
          'See MIGRATION_GUIDE.md for complete instructions',
        ],
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
