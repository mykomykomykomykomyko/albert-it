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
    console.log('[Step 1] Starting: Clear all public tables...');
    
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');

    if (!targetUrl || !targetServiceKey) {
      throw new Error('Missing JR_URL or JR_SECRET_KEY');
    }

    const targetSupabase = createClient(targetUrl, targetServiceKey);

    const tablesToClear = [
      'chat_history',
      'voice_analysis_results',
      'meeting_transcripts',
      'image_analysis_results',
      'image_analysis_prompts',
      'image_analysis_images',
      'image_analysis_sessions',
      'saved_stages',
      'saved_canvases',
      'workflow_executions',
      'workflow_shares',
      'workflows',
      'prompt_executions',
      'prompt_shares',
      'prompts',
      'file_attachments',
      'messages',
      'conversations',
      'agent_shares',
      'agents',
      'frameworks',
      'access_codes',
      'user_temp_passwords',
      'user_preferences',
      'user_roles',
      'profiles',
    ];

    const results: Record<string, { deleted: number; success: boolean; error?: string }> = {};

    for (const table of tablesToClear) {
      try {
        console.log(`[Step 1] Clearing table: ${table}`);
        const { error, count } = await targetSupabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

        if (error) {
          console.error(`[Step 1] Error clearing ${table}:`, error);
          results[table] = { deleted: 0, success: false, error: error.message };
        } else {
          results[table] = { deleted: count || 0, success: true };
          console.log(`[Step 1] ✓ Cleared ${table}: ${count || 0} rows`);
        }
      } catch (error) {
        console.error(`[Step 1] Exception clearing ${table}:`, error);
        results[table] = {
          deleted: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const totalCleared = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);
    console.log(`[Step 1] ✓ Complete: ${totalCleared} total rows cleared from ${tablesToClear.length} tables`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleared ${totalCleared} rows from ${tablesToClear.length} tables`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Step 1] Fatal error:', error);
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
