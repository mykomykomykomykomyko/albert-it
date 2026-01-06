import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  content: string;
  style?: 'brief' | 'detailed' | 'bullet_points';
  maxLength?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { content, style = 'brief', maxLength } = body;

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

    const styleInstructions: Record<string, string> = {
      brief: "Create a brief 1-2 sentence summary capturing the key points.",
      detailed: "Create a detailed paragraph summary covering all main points and important details.",
      bullet_points: "Create a bullet-point summary with the key takeaways. Use • for each point.",
    };

    const systemPrompt = `You are a professional summarizer. ${styleInstructions[style]}

Guidelines:
- Be accurate and faithful to the source content
- Prioritize the most important information
- Use clear, concise language
- Maintain objectivity
${maxLength ? `- Keep the summary under ${maxLength} characters` : ''}

Return ONLY the summary, no explanations or meta-commentary.`;

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
          { role: "user", content: `Please summarize the following content:\n\n${content}` },
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
    const summary = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({
        summary,
        style,
        originalLength: content.length,
        summaryLength: summary.length,
        compressionRatio: Math.round((1 - summary.length / content.length) * 100),
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Summarize error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
