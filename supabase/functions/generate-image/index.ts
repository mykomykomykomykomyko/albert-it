import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, sourceImageUrl } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🎨 Generating/editing image with prompt:', prompt);
    if (sourceImageUrl) {
      console.log('📸 Editing existing image');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log(sourceImageUrl ? '🎨 Editing existing image with Nano Banana...' : '🎨 Generating new image with Nano Banana...');

    // Prepare request body
    const requestBody: any = {
      contents: [{
        parts: []
      }],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    };

    // If editing, fetch and include the source image
    if (sourceImageUrl) {
      try {
        const imageResponse = await fetch(sourceImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch source image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = base64Encode(imageBuffer);
        const mimeType = imageResponse.headers.get('content-type') || 'image/png';
        
        console.log(`Fetched source image: ${mimeType}, size: ${imageBuffer.byteLength} bytes`);
        
        // Add image first, then prompt (order matters for editing)
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Image
          }
        });
        requestBody.contents[0].parts.push({
          text: prompt
        });
      } catch (error) {
        console.error('Error fetching source image:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch source image for editing' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // For generation, just add the prompt
      requestBody.contents[0].parts.push({
        text: prompt
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Imagen API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to generate image: ${response.status}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Nano Banana response received');

    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the image part in the response
    const parts = candidates[0]?.content?.parts || [];
    let imageData = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      // Handle both snake_case and camelCase
      const inlineData = part.inline_data || part.inlineData;
      if (inlineData && inlineData.data) {
        imageData = inlineData.data;
        mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
        break;
      }
    }

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data in response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const imageUrl = `data:${mimeType};base64,${imageData}`;
    const textResponse = 'Generated image';

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Upload the generated image to Storage and return a public URL
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; returning data URL');
      return new Response(
        JSON.stringify({ 
          imageUrl,
          description: textResponse || 'Generated image'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Prepare binary from either data URL or http(s) url
    let mime = 'image/png';
    let bytes: Uint8Array;
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) throw new Error('Invalid data URL returned by AI gateway');
      mime = match[1];
      const base64 = match[2];
      const binaryString = atob(base64);
      const len = binaryString.length;
      bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('Failed to fetch generated image');
      const arrayBuf = await res.arrayBuffer();
      bytes = new Uint8Array(arrayBuf);
      const ct = res.headers.get('content-type');
      if (ct) mime = ct;
    }

    const ext = mime.split('/')[1] || 'png';
    const folder = sourceImageUrl ? 'edited' : 'generated';
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase
      .storage
      .from('generated-images')
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Fallback to returning data URL
      return new Response(
        JSON.stringify({ imageUrl, description: textResponse || 'Generated image' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: pub } = supabase.storage.from('generated-images').getPublicUrl(path);

    return new Response(
      JSON.stringify({ 
        imageUrl: pub.publicUrl,
        path,
        mime,
        description: textResponse || 'Generated image'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Generate Image Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
