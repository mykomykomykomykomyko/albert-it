import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Call Gemini AI to generate a short, descriptive title
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a short, descriptive title (max 6 words) for a conversation that starts with this message: "${message.slice(0, 500)}". Only return the title text, nothing else.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 50,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      // Return a truncated message as fallback instead of throwing
      const fallbackTitle = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      return new Response(
        JSON.stringify({ title: fallbackTitle }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract title from Gemini response
    let title = "New Conversation";
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      title = data.candidates[0].content.parts[0].text.trim();
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
    }

    // Fallback: if title is too long or invalid, truncate the original message
    if (!title || title === "New Conversation" || title.length > 60) {
      title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
    }

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating title:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        title: "New Conversation"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
