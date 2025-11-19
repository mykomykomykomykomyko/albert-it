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

    // Fetch all data for the specified table
    const { data: allData, error: fetchError } = await sourceSupabase
      .from(tableName)
      .select('*');

    if (fetchError) {
      throw new Error(`Error fetching ${tableName}: ${fetchError.message}`);
    }

    if (!allData || allData.length === 0) {
      return new Response(
        '',
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${tableName}.csv"`
          },
          status: 200,
        }
      );
    }

    // Transform UUIDs in the data
    const transformedData = allData.map(row => {
      const transformed = { ...row };

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

    // Generate CSV
    const columns = Object.keys(transformedData[0]);
    let csv = columns.join(',') + '\n';

    for (const row of transformedData) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csv += values.join(',') + '\n';
    }

    console.log(`[Step 4] ✓ Generated CSV for ${tableName}: ${transformedData.length} rows`);

    return new Response(
      csv,
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${tableName}.csv"`
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
