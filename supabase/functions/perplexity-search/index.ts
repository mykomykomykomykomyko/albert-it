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
    const { query, model = 'sonar' } = await req.json();
    
    if (!query) {
      throw new Error("Query parameter is required");
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Normalize legacy model names and validate against allowed models
    const legacyModelMap: Record<string, string> = {
      'llama-3.1-sonar-small-128k-online': 'sonar',
      'llama-3.1-sonar-large-128k-online': 'sonar-pro',
      'llama-3.1-sonar-huge-128k-online': 'sonar-pro',
    };
    const allowedModels = new Set([
      'sonar',
      'sonar-pro',
      'sonar-reasoning',
      'sonar-reasoning-pro',
      'sonar-deep-research',
    ]);

    let selectedModel = legacyModelMap[model] ?? model;
    if (!allowedModels.has(selectedModel)) {
      console.warn(`Invalid or unsupported model received: ${model}. Falling back to 'sonar'.`);
      selectedModel = 'sonar';
    }

    console.log(`Perplexity search with model: ${selectedModel} (requested: ${model}), query:`, query);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'Be precise and concise. Provide factual, up-to-date information.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errMsg = `Perplexity API error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) errMsg += ` - ${parsed.error.message}`;
      } catch (_) {
        // ignore JSON parse errors
      }
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(errMsg);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No answer generated";
    
    console.log("Perplexity response:", answer.substring(0, 100));

    return new Response(JSON.stringify({ 
      answer,
      model: selectedModel,
      query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in perplexity-search function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
