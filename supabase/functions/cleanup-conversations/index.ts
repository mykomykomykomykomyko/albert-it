import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting conversation cleanup process...')

    // Get all conversations with their user preferences
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        retention_days,
        user_id,
        title
      `)

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError)
      throw fetchError
    }

    console.log(`Found ${conversations?.length || 0} conversations to check`)

    // Get all user preferences in one query
    const { data: userPreferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('user_id, default_retention_days')

    if (prefError) {
      console.error('Error fetching user preferences:', prefError)
      throw prefError
    }

    // Create a map for quick lookup
    const prefsMap = new Map(
      userPreferences?.map(p => [p.user_id, p.default_retention_days]) || []
    )

    const conversationsToDelete: string[] = []
    const now = new Date()

    // Check each conversation
    for (const conv of conversations || []) {
      let retentionDays: number | null = null

      // Use conversation-level retention if set, otherwise use user default
      if (conv.retention_days !== null) {
        retentionDays = conv.retention_days
      } else {
        retentionDays = prefsMap.get(conv.user_id) || null
      }

      // If no retention policy, skip
      if (retentionDays === null) {
        continue
      }

      // Calculate if conversation should be deleted
      const createdAt = new Date(conv.created_at)
      const expirationDate = new Date(createdAt)
      expirationDate.setDate(expirationDate.getDate() + retentionDays)

      if (now > expirationDate) {
        conversationsToDelete.push(conv.id)
        console.log(`Marking for deletion: "${conv.title}" (${conv.id}) - expired ${Math.floor((now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`)
      }
    }

    console.log(`Found ${conversationsToDelete.length} conversations to delete`)

    // Delete conversations in batches
    if (conversationsToDelete.length > 0) {
      const batchSize = 100
      let deletedCount = 0

      for (let i = 0; i < conversationsToDelete.length; i += batchSize) {
        const batch = conversationsToDelete.slice(i, i + batchSize)
        
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .in('id', batch)

        if (deleteError) {
          console.error('Error deleting batch:', deleteError)
          throw deleteError
        }

        deletedCount += batch.length
        console.log(`Deleted batch of ${batch.length} conversations (${deletedCount}/${conversationsToDelete.length})`)
      }

      console.log(`✅ Successfully deleted ${deletedCount} conversations`)
    } else {
      console.log('No conversations to delete')
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: conversations?.length || 0,
        deleted: conversationsToDelete.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in cleanup-conversations:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})