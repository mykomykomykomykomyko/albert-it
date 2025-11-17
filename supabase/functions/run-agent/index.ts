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
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

    // Call Gemini AI
    const finalPrompt = combinedResults 
      ? `${userPrompt || "Please respond to the user's request."}\n\nTool Results:${combinedResults}` 
      : (userPrompt || "Please respond to the user's request.");
    
    console.log("Using direct Gemini API");
    
    // Process images if provided (same logic as gemini-chat-with-images)
    const processImageDataUrl = async (imageUrl: string) => {
      // 1) Data URL
      const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
      if (base64Regex.test(imageUrl)) {
        const mimeTypeMatch = imageUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
        const mimeType = mimeTypeMatch ? `image/${mimeTypeMatch[1]}` : 'image/jpeg';
        const base64Content = imageUrl.replace(base64Regex, '');
        return { mimeType, data: base64Content };
      }

      // 2) HTTP(S) fetch
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        return { mimeType: contentType, data: base64 };
      }

      throw new Error('Invalid image format. Must be a data URL or HTTP(S) URL.');
    };

    // Process all images
    const imageParts = await Promise.all(images.map(async (imageDataUrl: string) => {
      const { mimeType, data } = await processImageDataUrl(imageDataUrl);
      return {
        inlineData: {
          mimeType,
          data
        }
      };
    }));

    // Build parts array with text first, then images (order matters)
    const userParts = [{ text: finalPrompt }, ...imageParts];
    
    // Check if JSON output is requested (case-insensitive)
    const jsonKeywords = ['json', 'JSON', 'application/json', 'return a json', 'output json'];
    const promptText = `${enhancedSystemPrompt} ${finalPrompt}`.toLowerCase();
    const needsJsonOutput = jsonKeywords.some(keyword => promptText.includes(keyword.toLowerCase()));
    
    console.log("JSON output detected:", needsJsonOutput);
    
    // Build generation config
    const generationConfig: any = {
      temperature: 1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };
    
    // Add JSON mode if needed
    if (needsJsonOutput) {
      generationConfig.responseMimeType = "application/json";
      console.log("Enabling JSON response mode");
    }
    
    // OPTIMIZED: Add timeout to Gemini API call
    const API_TIMEOUT_MS = 60000; // 60 seconds for AI generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: enhancedSystemPrompt,
            contents: [
              {
                role: "user",
                parts: userParts
              }
            ],
            generationConfig
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated";
      
      console.log("Agent output generated:", output.substring(0, 100));

      return new Response(JSON.stringify({ output, toolOutputs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Gemini API request timeout');
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
