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
    console.log('[Step 2] Starting: Clear auth.users...');
    
    const targetUrl = Deno.env.get('JR_URL');
    const targetServiceKey = Deno.env.get('JR_SECRET_KEY');

    if (!targetUrl || !targetServiceKey) {
      throw new Error('Missing JR_URL or JR_SECRET_KEY');
    }

    const targetSupabase = createClient(targetUrl, targetServiceKey);

    let page = 1;
    const perPage = 100;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: usersPage, error: listError } = await targetSupabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('[Step 2] Error listing users:', listError);
        break;
      }

      const users = usersPage?.users ?? [];
      if (users.length === 0) {
        hasMore = false;
        break;
      }

      for (const user of users) {
        try {
          const { error: deleteError } = await targetSupabase.auth.admin.deleteUser(user.id);
          if (!deleteError) {
            totalDeleted++;
            if (totalDeleted % 10 === 0) {
              console.log(`[Step 2] Deleted ${totalDeleted} users...`);
            }
          } else {
            console.error(`[Step 2] Error deleting ${user.email}:`, deleteError);
          }
        } catch (error) {
          console.error(`[Step 2] Exception deleting ${user.email}:`, error);
        }
      }

      if (users.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limiting delay
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[Step 2] ✓ Complete: Deleted ${totalDeleted} users from auth.users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${totalDeleted} users from auth.users`,
        usersDeleted: totalDeleted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Step 2] Fatal error:', error);
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
