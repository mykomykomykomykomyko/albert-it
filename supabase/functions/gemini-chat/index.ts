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

    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
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

**Input Node Types:**
- For text input: {"type": "input", "name": "Text Input", "description": "Enter text", "userPrompt": "{{input}}", "inputType": "text"}
- For file upload (including audio): {"type": "input", "name": "Audio Transcription", "description": "Upload audio files for transcription", "userPrompt": "{{input}}", "inputType": "file"}

**IMPORTANT**: When users mention audio files, voice recordings, transcripts, meetings, podcasts, or any audio-related workflows, create an input node with type "input" and inputType "file" and name it something like "Audio Transcription" or "Audio Upload". The file input supports automatic transcription of audio files (MP3, WAV, WebM, M4A, OGG, FLAC) using ElevenLabs.

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

**Stage Input Node Types:**
- For file input (including audio): {"id": "node-1", "nodeType": "function", "functionType": "content", "name": "Audio Transcription", "config": {}}

Use the content function node for Stage workflows when dealing with audio files or any file uploads, as it supports text files, PDFs, DOCX, Excel, and audio files (MP3, WAV, WebM, M4A, OGG, FLAC) with automatic transcription.

If users might benefit from the prompt library, suggest:
type: prompt-library
description: Check out our prompt library for pre-made prompts

Only suggest workflows when it genuinely makes sense. Continue providing regular text responses otherwise.`;

    // Prepare contents for Gemini API
    const contents = [];
    
    // Add system instruction as first user message
    if (enhancedSystemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: enhancedSystemPrompt }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I'll follow these instructions." }]
      });
    }
    
    // Add message history
    for (const msg of messageHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    
    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    console.log('Calling Gemini API with contents:', contents.length);

    // Call Gemini API directly
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${errorText}`);
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
              if (!line.trim()) continue;

              try {
                const parsed = JSON.parse(line);
                
                // Gemini API response format
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  const sseData = `data: ${JSON.stringify({ text: content })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
                
                // Check if stream is complete
                if (parsed.candidates?.[0]?.finishReason) {
                  break;
                }
              } catch (e) {
                console.error("Parse error:", e);
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
