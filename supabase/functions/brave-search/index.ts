import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, numResults = 20, apiKey: userApiKey } = await req.json();
    
    if (!query) {
      throw new Error("Query parameter is required");
    }
    
    // Clamp numResults between 1 and 100
    const requestedResults = Math.max(1, Math.min(100, Number(numResults) || 20));
    
    // Use provided key or fall back to environment secret
    const apiKey = userApiKey || Deno.env.get("BRAVE_SEARCH_API_KEY");
    
    if (!apiKey) {
      throw new Error("Brave Search API key is required (not configured in secrets or provided)");
    }

    console.log(`Performing Brave search for: "${query}" (${requestedResults} results)`);

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${requestedResults}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract web results
    const results = (data.web?.results || []).map((item: any) => ({
      title: item.title,
      url: item.url,
      description: item.description,
    }));

    return new Response(JSON.stringify({ 
      results,
      totalResults: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in brave-search function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
