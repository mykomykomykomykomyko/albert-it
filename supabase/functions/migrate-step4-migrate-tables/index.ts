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

    let sqlStatements = `-- Albert Junior Migration SQL\n-- Generated: ${new Date().toISOString()}\n\n`;
    const PAGE_SIZE = 100; // Fetch in larger batches since we're not inserting

    const escapeString = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return String(val);
    };

    for (const table of tablesToMigrate) {
      try {
        console.log(`[Step 4] Generating SQL for table: ${table}`);
        sqlStatements += `\n-- Table: ${table}\n`;
        
        let totalRows = 0;
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
            sqlStatements += `-- ERROR fetching ${table}: ${fetchError.message}\n`;
            break;
          }

          if (!pageData || pageData.length === 0) {
            hasMore = false;
            break;
          }

          // Transform UUIDs in the data
          const transformedData = pageData.map(row => {
            const transformed = { ...row };

            if (transformed.user_id && uuidMap.has(transformed.user_id)) {
              transformed.user_id = uuidMap.get(transformed.user_id);
            }

            if (table === 'profiles' && transformed.id && uuidMap.has(transformed.id)) {
              transformed.id = uuidMap.get(transformed.id);
            }

            if (transformed.reviewer_id && uuidMap.has(transformed.reviewer_id)) {
              transformed.reviewer_id = uuidMap.get(transformed.reviewer_id);
            }

            if (transformed.shared_by_user_id && uuidMap.has(transformed.shared_by_user_id)) {
              transformed.shared_by_user_id = uuidMap.get(transformed.shared_by_user_id);
            }
            if (transformed.shared_with_user_id && uuidMap.has(transformed.shared_with_user_id)) {
              transformed.shared_with_user_id = uuidMap.get(transformed.shared_with_user_id);
            }

            if (transformed.created_by && uuidMap.has(transformed.created_by)) {
              transformed.created_by = uuidMap.get(transformed.created_by);
            }

            return transformed;
          });

          // Generate INSERT statements
          for (const row of transformedData) {
            const columns = Object.keys(row);
            const values = columns.map(col => escapeString(row[col]));
            sqlStatements += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')};\n`;
          }

          totalRows += transformedData.length;
          console.log(`[Step 4] ${table}: Generated SQL for ${totalRows} rows`);

          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          }

          page++;

          if (page > 1000) {
            console.warn(`[Step 4] Hit page limit for ${table}`);
            hasMore = false;
          }
        }

        sqlStatements += `-- ${table}: ${totalRows} rows\n`;
      } catch (error) {
        console.error(`[Step 4] Exception generating SQL for ${table}:`, error);
        sqlStatements += `-- ERROR processing ${table}: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    }

    console.log(`[Step 4] ✓ Complete: Generated SQL file`);

    return new Response(
      sqlStatements,
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="albert-junior-migration.sql"'
        },
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
