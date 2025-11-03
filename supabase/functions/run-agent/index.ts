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
    const { systemPrompt, userPrompt, tools = [] } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Running agent with system prompt:", systemPrompt.substring(0, 50));
    console.log("Tool instances:", tools);

    // Execute tools if any
    let toolResults = "";
    const toolOutputs: Array<{ toolId: string; toolName?: string; output: any }> = [];
    
    for (const toolInstance of tools) {
      const { toolId, config } = toolInstance;
      console.log("Executing tool:", toolId, "with config:", config);
      
      try {
        if (toolId === 'google_search') {
          console.log("Calling google-search with query:", userPrompt);
          const searchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: userPrompt, 
              overrideQuery: config?.overrideQuery,
              numResults: config?.numResults,
              apiKey: config?.apiKey, 
              searchEngineId: config?.searchEngineId 
            }),
          });
          const searchData = await searchResponse.json();
          console.log("Tool Output [google_search]:", JSON.stringify(searchData, null, 2));
          toolOutputs.push({ toolId: 'google_search', toolName: 'Google Search', output: searchData });
          toolResults += `\n\nGoogle Search Results: ${JSON.stringify(searchData)}`;
        } else if (toolId === 'brave_search') {
          console.log("Calling brave-search with query:", userPrompt);
          const searchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/brave-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: userPrompt, 
              apiKey: config?.apiKey
            }),
          });
          const searchData = await searchResponse.json();
          console.log("Tool Output [brave_search]:", JSON.stringify(searchData, null, 2));
          toolOutputs.push({ toolId: 'brave_search', toolName: 'Brave Search', output: searchData });
          toolResults += `\n\nBrave Search Results: ${JSON.stringify(searchData)}`;
        } else if (toolId === 'weather') {
          if (config?.apiKey) {
            const weatherResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/weather`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location: "New York", apiKey: config.apiKey }),
            });
            const weatherData = await weatherResponse.json();
            console.log("Tool Output [weather]:", JSON.stringify(weatherData, null, 2));
            toolOutputs.push({ toolId: 'weather', toolName: 'Weather', output: weatherData });
            toolResults += `\n\nWeather Data: ${JSON.stringify(weatherData)}`;
          }
        } else if (toolId === 'time') {
          const timeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timezone: 'UTC' }),
          });
          const timeData = await timeResponse.json();
          console.log("Tool Output [time]:", JSON.stringify(timeData, null, 2));
          toolOutputs.push({ toolId: 'time', toolName: 'Current Time', output: timeData });
          toolResults += `\n\nCurrent Time: ${JSON.stringify(timeData)}`;
        } else if (toolId === 'web_scrape') {
          if (config?.url) {
            const scrapeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/web-scrape`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: config.url }),
            });
            const scrapeData = await scrapeResponse.json();
            console.log("Tool Output [web_scrape]:", JSON.stringify(scrapeData, null, 2));
            toolOutputs.push({ toolId: 'web_scrape', toolName: 'Web Scraper', output: scrapeData });
            toolResults += `\n\nWeb Scrape Results: ${JSON.stringify(scrapeData)}`;
          }
        } else if (toolId === 'api_call') {
          if (config?.url) {
            const headers = config.headers ? JSON.parse(config.headers) : {};
            const apiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/api-call`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: config.url, 
                method: config.method || 'GET',
                headers 
              }),
            });
            const apiData = await apiResponse.json();
            console.log("Tool Output [api_call]:", JSON.stringify(apiData, null, 2));
            toolOutputs.push({ toolId: 'api_call', toolName: 'API Call', output: apiData });
            toolResults += `\n\nAPI Call Results: ${JSON.stringify(apiData)}`;
          }
        }
      } catch (toolError) {
        console.error(`Error executing tool ${toolId}:`, toolError);
        const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown error';
        console.log("Tool Output [" + toolId + "] ERROR:", errorMsg);
        toolOutputs.push({ toolId, toolName: toolId, output: { error: errorMsg } });
        toolResults += `\n\nTool ${toolId} Error: ${errorMsg}`;
      }
    }

    // Call Gemini AI
    const finalPrompt = toolResults ? `${userPrompt}\n\nTool Results:${toolResults}` : userPrompt;
    
    console.log("Using direct Gemini API");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: systemPrompt
                }
              ]
            },
            {
              role: "user",
              parts: [
                {
                  text: finalPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        }),
      }
    );

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
    console.error('Error in run-agent function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
