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

    const { messages, model = "google/gemini-3-pro-preview" } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Extract model name for API call (remove provider prefix)
    const modelName = model.replace('google/', '');

    const systemPrompt = `You are Albert, an AI assistant created by the Government of Alberta. You are helpful, knowledgeable, and professional. Provide clear, accurate, and thoughtful responses.

CRITICAL INSTRUCTION - REAL-TIME INFORMATION:
When you receive messages containing "[Real-Time Search Result]" sections, you MUST prioritize and use this information as the authoritative source. This data is current and verified from live web searches. Always base your answer on this real-time data when provided, as it overrides any conflicting information from your training data.

When users discuss complex workflows, automation, or multi-step processes involving audio transcription, meetings, podcasts, or voice recordings, you can suggest creating workflows that start with audio input nodes that automatically transcribe audio files using ElevenLabs.

FORMATTING GUIDELINES:
- Use bullet points (- or *) for lists and multiple items
- Use **bold** for important terms, labels, and headings
- Structure responses with clear paragraphs separated by blank lines
- Use proper spacing between sections for readability
- Format like ChatGPT with clean, well-organized text`;

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${GEMINI_API_KEY}`, {
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
        let hasContent = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (!hasContent) {
                console.error("Stream completed but no content was sent");
              }
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
                  hasContent = true;
                  const sseData = {
                    choices: [{
                      delta: { content: text },
                      index: 0
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
                } else {
                  // Log when we receive a chunk without text
                  console.log("Received chunk without text:", JSON.stringify(json).substring(0, 200));
                }
              } catch (e) {
                console.error("Error parsing chunk:", e, "Raw line:", line.substring(0, 100));
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
