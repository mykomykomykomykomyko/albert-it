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
    const { message, messageHistory = [], systemPrompt = '', knowledgeDocuments = [] } = await req.json()

    console.log('gemini-chat REQUEST:', { 
      message: message?.substring(0, 100) + '...', 
      historyLength: messageHistory.length,
      systemPrompt: systemPrompt?.substring(0, 100) + '...',
      knowledgeDocumentsCount: knowledgeDocuments.length
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

    const baseSystemPrompt = systemPrompt || `You are Albert, an AI assistant created by the Government of Alberta. You are helpful, knowledgeable, and professional. Provide clear, accurate, and thoughtful responses.

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

    // Combine base system prompt with knowledge base
    const enhancedSystemPrompt = baseSystemPrompt + knowledgeBaseSection;

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

    // OPTIMIZED: Call Gemini API with timeout
    const API_TIMEOUT_MS = 60000; // 60 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Gemini API error:", aiResponse.status, errorText);
        throw new Error(`Gemini API error: ${errorText}`);
      }

      const result = await aiResponse.json();
      console.log('Gemini API response:', JSON.stringify(result, null, 2));
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const fullText = parts.map((p: any) => p.text).filter(Boolean).join("");
      
      console.log('Extracted text length:', fullText.length);
      console.log('Full text preview:', fullText.substring(0, 200));

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          if (!fullText || fullText.trim().length === 0) {
            console.error('Empty response from Gemini API');
            const errorData = `data: ${JSON.stringify({ text: "I apologize, but I received an empty response. Please try rephrasing your message." })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
            controller.close();
            return;
          }
          // Send as single SSE chunk to fit the UI's streaming reader
          const sseData = `data: ${JSON.stringify({ text: fullText })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
          controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
          controller.close();
        }
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
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Gemini API request timeout');
      }
      throw error;
    }

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
