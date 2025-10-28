import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, messageHistory = [], systemPrompt = '' } = await req.json()

    console.log('gemini-chat REQUEST:', { 
      message: message?.substring(0, 100) + '...', 
      historyLength: messageHistory.length,
      systemPrompt: systemPrompt?.substring(0, 100) + '...'
    });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const enhancedSystemPrompt = systemPrompt || `You are Albert, an AI assistant created by the Government of Alberta. You are helpful, knowledgeable, and professional. Provide clear, accurate, and thoughtful responses.

When users discuss complex workflows, automation, or multi-step processes, you can offer to create a visual workflow for them. You have access to two workflow types:

1. **Canvas Workflow**: For visual, node-based workflows with agents connected in a flow
2. **Stage Workflow**: For sequential, stage-based workflows with multiple steps

When you detect that a user's request could benefit from a workflow, include a suggestion in your response using this exact format:

[WORKFLOW_SUGGESTION]
type: canvas|stage|prompt-library
description: Brief description of what this workflow will do
workflow: {valid JSON workflow structure}
[/WORKFLOW_SUGGESTION]

For Canvas workflows, use this structure:
{
  "nodes": [
    {"id": "1", "type": "input", "name": "Input", "description": "Start here", "userPrompt": "{{input}}", "position": {"x": 100, "y": 100}},
    {"id": "2", "type": "agent", "name": "Summarizer", "description": "AI Summarizer", "systemPrompt": "You are a summarization expert...", "userPrompt": "Summarize: {{input}}", "position": {"x": 100, "y": 250}},
    {"id": "3", "type": "output", "name": "Result", "description": "Final output", "position": {"x": 100, "y": 400}}
  ],
  "edges": [
    {"id": "e1-2", "source": "1", "target": "2"},
    {"id": "e2-3", "source": "2", "target": "3"}
  ]
}

For Stage workflows, use this structure:
{
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage Name",
      "nodes": [
        {"id": "node-1", "nodeType": "agent", "type": "research", "name": "Research Agent", "systemPrompt": "...", "userPrompt": "..."}
      ]
    }
  ],
  "connections": []
}

If users might benefit from the prompt library, suggest:
type: prompt-library
description: Check out our prompt library for pre-made prompts

Only suggest workflows when it genuinely makes sense. Continue providing regular text responses otherwise.`;

    // Prepare messages for Lovable AI
    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messageHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log('Calling Lovable AI with messages:', messages.length);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    // Stream the response
    const reader = aiResponse.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!reader) throw new Error("No reader");

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const sseData = `data: ${JSON.stringify({ text: content })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }

          controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Streaming failed" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("gemini-chat error:", error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }
})
