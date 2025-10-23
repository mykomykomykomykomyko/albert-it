import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Create a Gemini client
const createGeminiClient = () => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Helper: Common safety settings
const getSafetySettings = () => [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, userEmail, messageHistory = [], systemPrompt = '' } = await req.json()

    console.log('gemini-chat REQUEST:', { 
      message: message?.substring(0, 100) + '...', 
      userEmail, 
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

    const client = createGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare conversation history
    const contents = messageHistory.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    console.log('Starting Gemini stream with contents length:', contents.length);

    const result = await model.generateContentStream({
      contents,
      systemInstruction: systemPrompt || 'You are a helpful AI assistant.',
      safetySettings: getSafetySettings(),
    });

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              const data = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          
          // Send completion event
          controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorData = `data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Gemini Chat Error:', error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorData = `data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
})

