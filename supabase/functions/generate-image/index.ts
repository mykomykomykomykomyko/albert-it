import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    // Note: Image editing is not supported with direct Gemini API
    // Only generation is supported
    if (sourceImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image editing is not currently supported. Only image generation is available.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating image with Google Imagen API...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_some",
            personGeneration: "allow_adult"
          }
        }),
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
    console.log('Imagen response received');

    const predictions = data.predictions;
    if (!predictions || predictions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const imageData = predictions[0];
    if (!imageData.bytesBase64Encoded) {
      return new Response(
        JSON.stringify({ error: 'No image data in response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const base64Data = imageData.bytesBase64Encoded;
    const imageUrl = `data:image/png;base64,${base64Data}`;
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
