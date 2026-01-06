import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  prompt: string;
  enhancementType?: 'clarity' | 'detail' | 'creativity' | 'technical' | 'general';
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { prompt, enhancementType = 'general', context } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const enhancementInstructions: Record<string, string> = {
      clarity: "Make this prompt clearer, more specific, and easier to understand. Remove ambiguity and add precision.",
      detail: "Expand this prompt with more details, examples, and specific requirements. Add depth while maintaining focus.",
      creativity: "Make this prompt more creative and inspiring. Add imaginative elements while keeping the core intent.",
      technical: "Enhance this prompt with technical accuracy, proper terminology, and structured requirements.",
      general: "Improve this prompt overall - make it clearer, more effective, and better structured for optimal AI responses.",
    };

    const systemPrompt = `You are an expert prompt engineer. Your task is to enhance and improve prompts to get better AI responses.

Enhancement Goal: ${enhancementInstructions[enhancementType]}

Rules:
1. Maintain the original intent and purpose
2. Use clear, unambiguous language
3. Add helpful context where appropriate
4. Structure the prompt logically
5. Include specific requirements if missing
6. Remove redundancy and unnecessary words
7. Make it actionable and focused

${context ? `Additional Context: ${context}` : ''}

Return ONLY the enhanced prompt, nothing else. Do not include explanations or meta-commentary.`;

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
          { role: "user", content: `Please enhance this prompt:\n\n${prompt}` },
        ],
        temperature: 0.7,
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
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim() || prompt;

    return new Response(
      JSON.stringify({
        original: prompt,
        enhanced: enhancedPrompt,
        enhancementType,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Enhance prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
