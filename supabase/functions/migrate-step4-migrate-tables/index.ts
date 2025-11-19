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
    const body = await req.json();
    const uuidCrosswalk = body.uuidCrosswalk as Array<{ oldUuid: string; newUuid: string; email: string }>;
    const tableName = body.tableName as string;

    if (!uuidCrosswalk || !Array.isArray(uuidCrosswalk)) {
      throw new Error('Missing uuidCrosswalk in request body');
    }

    if (!tableName) {
      throw new Error('Missing tableName in request body');
    }

    console.log(`[Step 4] Processing table: ${tableName} with ${uuidCrosswalk.length} UUID mappings`);

    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');

    if (!sourceUrl || !sourceServiceKey || !targetUrl || !targetServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const sourceSupabase = createClient(sourceUrl, sourceServiceKey);

    // Build mapping for fast lookups
    const uuidMap = new Map<string, string>();
    uuidCrosswalk.forEach(entry => {
      uuidMap.set(entry.oldUuid, entry.newUuid);
    });

    // Fetch all data for the specified table in batches to bypass 1000 row limit
    const PAGE_SIZE = 1000;
    let offset = 0;
    let sql = '';
    let totalRows = 0;

    while (true) {
      const { data: batchData, error: fetchError } = await sourceSupabase
        .from(tableName)
        .select('*')
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) {
        throw new Error(`Error fetching ${tableName}: ${fetchError.message}`);
      }

      if (!batchData || batchData.length === 0) {
        break;
      }

      // Transform UUIDs in the batch
      const transformedBatch = batchData.map(row => {
        const transformed = { ...row } as Record<string, any>;

        if (transformed.user_id && uuidMap.has(transformed.user_id)) {
          transformed.user_id = uuidMap.get(transformed.user_id);
        }

        if (tableName === 'profiles' && transformed.id && uuidMap.has(transformed.id)) {
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

      // Generate SQL INSERT statements for this batch
      const columns = Object.keys(transformedBatch[0]);

      for (const row of transformedBatch) {
        const values = columns.map(col => {
          const val = (row as any)[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          if (typeof val === 'string') return `'${val.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          return val;
        });
        
        sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }

      totalRows += transformedBatch.length;
      offset += PAGE_SIZE;

      if (batchData.length < PAGE_SIZE) {
        break;
      }
    }

    if (!sql) {
      return new Response(
        '',
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/sql',
            'Content-Disposition': `attachment; filename="${tableName}.sql"`
          },
          status: 200,
        }
      );
    }

    console.log(`[Step 4] ✓ Generated SQL for ${tableName}: ${totalRows} rows`);

    return new Response(
      sql,
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${tableName}.sql"`
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
