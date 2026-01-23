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
    const { systemPrompt, userPrompt, tools = [], knowledgeDocuments = [], images = [] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Running agent with system prompt:", systemPrompt.substring(0, 50));
    console.log("Tool instances:", tools);
    console.log("Knowledge documents:", knowledgeDocuments.length);
    console.log("Images:", images.length);

    // Build knowledge base section if documents are provided
    // OPTIMIZED: Truncate documents early to avoid loading entire large files
    let knowledgeBaseSection = "";
    if (knowledgeDocuments.length > 0) {
      knowledgeBaseSection = "\n\n=== KNOWLEDGE BASE ===\n";
      knowledgeBaseSection += "You have access to the following documents for context:\n\n";
      
      for (const doc of knowledgeDocuments) {
        knowledgeBaseSection += `--- ${doc.filename} ---\n`;
        // OPTIMIZED: Truncate immediately instead of loading full content first
        const maxChars = 10000;
        const content = doc.content.length > maxChars 
          ? doc.content.substring(0, maxChars) + "\n\n[Document truncated due to length...]"
          : doc.content;
        knowledgeBaseSection += content + "\n\n";
      }
      
      knowledgeBaseSection += "Please use this information when responding to user queries.\n";
      knowledgeBaseSection += "=== END OF KNOWLEDGE BASE ===\n";
    }

    // Combine system prompt with knowledge base
    const enhancedSystemPrompt = systemPrompt + knowledgeBaseSection;

    // OPTIMIZED: Execute all tools in parallel for better performance
    const TIMEOUT_MS = 30000; // 30 second timeout per tool
    
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    };

    const toolPromises = tools.map(async (toolInstance: any) => {
      const { toolId, config } = toolInstance;
      console.log("Executing tool:", toolId, "with config:", config);
      
      try {
        let response;
        let toolName = toolId;
        
        if (toolId === 'google_search') {
          console.log("Calling google-search with query:", userPrompt);
          toolName = 'Google Search';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-search`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: userPrompt, 
                overrideQuery: config?.overrideQuery,
                numResults: config?.numResults,
                apiKey: config?.apiKey, 
                searchEngineId: config?.searchEngineId 
              }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'brave_search') {
          console.log("Calling brave-search with query:", userPrompt);
          toolName = 'Brave Search';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/brave-search`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: userPrompt }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'perplexity_search') {
          console.log("Calling perplexity-search with query:", userPrompt);
          toolName = 'Perplexity Search';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/perplexity-search`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: userPrompt }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'weather' && config?.apiKey) {
          toolName = 'Weather';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/weather`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location: "New York", apiKey: config.apiKey }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'time') {
          toolName = 'Current Time';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/time`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ timezone: 'UTC' }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'web_scrape' && config?.url) {
          toolName = 'Web Scraper';
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/web-scrape`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: config.url }),
            },
            TIMEOUT_MS
          );
        } else if (toolId === 'api_call' && config?.url) {
          toolName = 'API Call';
          const headers = config.headers ? JSON.parse(config.headers) : {};
          response = await fetchWithTimeout(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/api-call`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: config.url, 
                method: config.method || 'GET',
                headers 
              }),
            },
            TIMEOUT_MS
          );
        }
        
        if (response) {
          const data = await response.json();
          console.log(`Tool Output [${toolId}]:`, JSON.stringify(data, null, 2));
          return {
            toolId,
            toolName,
            output: data,
            result: `\n\n${toolName} Results: ${JSON.stringify(data)}`
          };
        }
        
        return null;
      } catch (toolError) {
        console.error(`Error executing tool ${toolId}:`, toolError);
        const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown error';
        console.log(`Tool Output [${toolId}] ERROR:`, errorMsg);
        return {
          toolId,
          toolName: toolId,
          output: { error: errorMsg },
          result: `\n\nTool ${toolId} Error: ${errorMsg}`
        };
      }
    });
    
    // Wait for all tools to complete in parallel
    const toolResults = await Promise.all(toolPromises);
    const toolOutputs: Array<{ toolId: string; toolName?: string; output: any }> = [];
    let combinedResults = "";
    
    for (const result of toolResults) {
      if (result) {
        toolOutputs.push({
          toolId: result.toolId,
          toolName: result.toolName,
          output: result.output
        });
        combinedResults += result.result;
      }
    }

    // Build the final prompt
    const finalPrompt = combinedResults 
      ? `${userPrompt || "Please respond to the user's request."}\n\nTool Results:${combinedResults}` 
      : (userPrompt || "Please respond to the user's request.");
    
    console.log("Using Lovable AI Gateway with google/gemini-3-flash-preview");
    
    // Process images for Lovable AI Gateway (expects base64 data URLs)
    const processedImages: Array<{ type: "image_url"; image_url: { url: string } }> = [];
    
    for (const imageUrl of images) {
      // Data URLs can be passed directly
      if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
        processedImages.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      } else if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        // For HTTP URLs, fetch and convert to base64
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          processedImages.push({
            type: "image_url",
            image_url: { url: `data:${contentType};base64,${base64}` }
          });
        } catch (error) {
          console.error('Error fetching image:', error);
        }
      }
    }
    
    // Build message content (text + images for multimodal)
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: finalPrompt }
    ];
    
    // Add images if present
    for (const img of processedImages) {
      userContent.push(img);
    }

    // Call Lovable AI Gateway with stable model
    const API_TIMEOUT_MS = 45000; // 45 seconds for AI generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    
    try {
      console.log("Sending request to Lovable AI Gateway...");
      const startTime = Date.now();
      
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              { role: "user", content: userContent }
            ]
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      
      const elapsedMs = Date.now() - startTime;
      console.log(`Lovable AI Gateway responded in ${elapsedMs}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI Gateway error:", response.status, errorText);
        
        // Handle rate limits and payment errors
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment." 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ 
            error: "AI credits exhausted. Please add funds to continue." 
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || "No output generated";
      
      console.log("Agent output generated:", output.substring(0, 100));

      return new Response(JSON.stringify({ output, toolOutputs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Lovable AI Gateway request timeout after', API_TIMEOUT_MS, 'ms');
        return new Response(JSON.stringify({ 
          error: 'Analysis timed out. The request took too long to process. Please try with simpler content or fewer images.' 
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in run-agent function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
