import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.21.0"

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
];

// Helper: Process image (data URL or HTTP URL) to base64
const processImageDataUrl = async (imageUrl: string) => {
  // Check if it's a data URL
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
  if (base64Regex.test(imageUrl)) {
    const mimeTypeMatch = imageUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
    const mimeType = mimeTypeMatch ? `image/${mimeTypeMatch[1]}` : 'image/jpeg';
    const base64Content = imageUrl.replace(base64Regex, '');
    
    return {
      mimeType,
      data: base64Content
    };
  }
  
  // Check if it's an HTTP/HTTPS URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      return {
        mimeType: contentType,
        data: base64
      };
    } catch (error) {
      console.error('Error fetching image URL:', error);
      throw new Error('Failed to fetch image from URL');
    }
  }
  
  throw new Error('Invalid image format. Must be a data URL (data:image/...) or HTTP(S) URL.');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      message, 
      images = [], 
      userEmail, 
      messageHistory = [], 
      systemPrompt = '' 
    } = await req.json()

    console.log('gemini-chat-with-images REQUEST:', { 
      message: message?.substring(0, 100) + '...', 
      userEmail, 
      imagesCount: images.length,
      historyLength: messageHistory.length,
      systemPrompt: systemPrompt?.substring(0, 100) + '...'
    });

    if (!message && (!images || images.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Message or images are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (images && !Array.isArray(images)) {
      return new Response(
        JSON.stringify({ error: 'Images must be an array of data URLs or HTTP(S) image URLs' }),
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

    // Process images (supports both data URLs and HTTP URLs)
    const imageParts = await Promise.all(images.map(async (imageDataUrl: string) => {
      const { mimeType, data } = await processImageDataUrl(imageDataUrl);
      return {
        inlineData: {
          mimeType,
          data
        }
      };
    }));

    // Add current message with images
    const currentMessageParts = [];
    if (message) {
      currentMessageParts.push({ text: message });
    }
    currentMessageParts.push(...imageParts);

    contents.push({
      role: 'user',
      parts: currentMessageParts,
    });

    console.log('Starting Gemini stream with contents length:', contents.length, 'and', imageParts.length, 'images');

    const result = await model.generateContentStream({
      contents,
      systemInstruction: systemPrompt || 'You are Albert, an AI assistant created by the Government of Alberta. You are helpful, knowledgeable, and professional. Provide clear, accurate, and thoughtful responses. You can analyze images and answer questions about them.',
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
          const errorMessage = error instanceof Error ? error.message : 'Streaming failed';
          const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
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
    console.error('❌ Gemini Chat with Images Error:', error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
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

