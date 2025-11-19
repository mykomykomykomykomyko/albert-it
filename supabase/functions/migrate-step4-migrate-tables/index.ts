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
    console.log('[Step 4] Starting: Migrate all tables with UUID transformation...');
    
    const body = await req.json();
    const uuidCrosswalk = body.uuidCrosswalk as Array<{ oldUuid: string; newUuid: string; email: string }>;

    if (!uuidCrosswalk || !Array.isArray(uuidCrosswalk)) {
      throw new Error('Missing uuidCrosswalk in request body');
    }

    console.log(`[Step 4] Received UUID crosswalk with ${uuidCrosswalk.length} mappings`);

    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');

    if (!sourceUrl || !sourceServiceKey || !targetUrl || !targetServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const sourceSupabase = createClient(sourceUrl, sourceServiceKey);
    const targetSupabase = createClient(targetUrl, targetServiceKey);

    // Build mapping for fast lookups
    const uuidMap = new Map<string, string>();
    uuidCrosswalk.forEach(entry => {
      uuidMap.set(entry.oldUuid, entry.newUuid);
    });

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

    const results: Record<string, { rows: number; success: boolean; error?: string }> = {};
    const PAGE_SIZE = 1000; // Increased from 50 to reduce iterations and CPU time

    for (const table of tablesToMigrate) {
      try {
        console.log(`[Step 4] Migrating table: ${table}`);
        
        let successCount = 0;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          const { data: pageData, error: fetchError } = await sourceSupabase
            .from(table)
            .select('*')
            .range(from, to);

          if (fetchError) {
            console.error(`[Step 4] Error fetching ${table}:`, fetchError);
            results[table] = { rows: successCount, success: false, error: fetchError.message };
            break;
          }

          if (!pageData || pageData.length === 0) {
            hasMore = false;
            results[table] = { rows: successCount, success: true };
            break;
          }

          // Transform UUIDs in the data
          const transformedData = pageData.map(row => {
            const transformed = { ...row };

            // Transform user_id
            if (transformed.user_id && uuidMap.has(transformed.user_id)) {
              transformed.user_id = uuidMap.get(transformed.user_id);
            }

            // Transform id for profiles table
            if (table === 'profiles' && transformed.id && uuidMap.has(transformed.id)) {
              transformed.id = uuidMap.get(transformed.id);
            }

            // Transform reviewer_id
            if (transformed.reviewer_id && uuidMap.has(transformed.reviewer_id)) {
              transformed.reviewer_id = uuidMap.get(transformed.reviewer_id);
            }

            // Transform shared_by_user_id and shared_with_user_id
            if (transformed.shared_by_user_id && uuidMap.has(transformed.shared_by_user_id)) {
              transformed.shared_by_user_id = uuidMap.get(transformed.shared_by_user_id);
            }
            if (transformed.shared_with_user_id && uuidMap.has(transformed.shared_with_user_id)) {
              transformed.shared_with_user_id = uuidMap.get(transformed.shared_with_user_id);
            }

            // Transform created_by
            if (transformed.created_by && uuidMap.has(transformed.created_by)) {
              transformed.created_by = uuidMap.get(transformed.created_by);
            }

            return transformed;
          });

          const { error: insertError } = await targetSupabase
            .from(table)
            .upsert(transformedData, { onConflict: 'id' });

          if (insertError) {
            console.error(`[Step 4] Error inserting into ${table}:`, insertError);
            results[table] = { rows: successCount, success: false, error: insertError.message };
            hasMore = false;
            break;
          }

          successCount += transformedData.length;
          console.log(`[Step 4] ${table}: ${successCount} rows migrated`);

          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
            results[table] = { rows: successCount, success: true };
          }

          page++;

          if (page > 1000) {
            console.warn(`[Step 4] Hit page limit for ${table}`);
            hasMore = false;
            results[table] = { rows: successCount, success: true, error: 'Reached pagination limit' };
          }
        }
      } catch (error) {
        console.error(`[Step 4] Exception migrating ${table}:`, error);
        results[table] = {
          rows: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const totalRows = Object.values(results).reduce((sum, r) => sum + r.rows, 0);
    console.log(`[Step 4] ✓ Complete: Migrated ${totalRows} total rows across ${tablesToMigrate.length} tables`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migrated ${totalRows} rows across ${tablesToMigrate.length} tables`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Step 4] Fatal error:', error);
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
