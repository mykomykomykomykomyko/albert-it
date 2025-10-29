import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  // Get request origin for CORS
  const origin = req.headers.get("origin");
  const responseHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 50, // 50 requests
      windowMs: 60 * 1000, // per minute
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt, responseHeaders);
    }

    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are Albert, an AI assistant created by the Government of Alberta. You are helpful, knowledgeable, and professional. Provide clear, accurate, and thoughtful responses.

When users discuss complex workflows, automation, or multi-step processes involving audio transcription, meetings, podcasts, or voice recordings, you can suggest creating workflows that start with audio input nodes that automatically transcribe audio files using ElevenLabs.`;

    // Format messages for Gemini API
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      ...messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Gemini API error" }),
        {
          status: 500,
          headers: { ...responseHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Transform Gemini's streaming format to SSE format
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text) {
                  const sseData = {
                    choices: [{
                      delta: { content: text },
                      index: 0
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { 
        ...responseHeaders, 
        "Content-Type": "text/event-stream",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
