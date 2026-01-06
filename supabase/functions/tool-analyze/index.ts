import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  content: string;
  analysisType?: 'general' | 'sentiment' | 'entities' | 'structure';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { content, analysisType = 'general' } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const analysisInstructions: Record<string, string> = {
      general: `Provide a comprehensive analysis including:
- Main topics and themes
- Key points and arguments
- Writing style and tone
- Strengths and potential areas for improvement
- Notable patterns or insights`,
      sentiment: `Perform sentiment analysis including:
- Overall sentiment (positive/negative/neutral with confidence score)
- Emotional tone breakdown (joy, sadness, anger, fear, surprise, etc.)
- Sentiment by section/paragraph
- Key phrases that influence sentiment
- Recommendations based on sentiment`,
      entities: `Extract and analyze entities including:
- People (names, roles, relationships)
- Organizations (companies, institutions)
- Locations (places, addresses)
- Dates and times
- Products/services mentioned
- Quantities and measurements
- Key concepts and topics`,
      structure: `Analyze the structural elements including:
- Document type and format
- Organization and flow
- Section breakdown
- Hierarchy of information
- Coherence and cohesion
- Readability assessment`,
    };

    const systemPrompt = `You are an expert content analyst. ${analysisInstructions[analysisType]}

Provide your analysis in a structured format. Be thorough but concise. Focus on actionable insights.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze the following content:\n\n${content}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${errorText}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({
        analysis,
        analysisType,
        contentLength: content.length,
        wordCount: content.split(/\s+/).length,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Analyze error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
