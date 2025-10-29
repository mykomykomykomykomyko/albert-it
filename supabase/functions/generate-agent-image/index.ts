import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate agent image function called');
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Prompt received:', prompt);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found');
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating image with Gemini API...');

    // Use Google Gemini API for image generation
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate a professional, high-quality avatar image for an AI agent with this description: ${prompt}. The image should be suitable as a profile picture, visually appealing, and represent the agent's purpose or personality.`
          }]
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Failed to generate image: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('Gemini response:', JSON.stringify(aiData, null, 2));
    
    // Extract image from response
    const parts = aiData.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No content generated');
    }

    // Find inline data with image
    const imagePart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
    if (!imagePart?.inlineData?.data) {
      throw new Error('No image data found in response');
    }

    const base64Data = imagePart.inlineData.data;

    console.log('Image generated, converting to blob...');

    // Convert base64 to blob
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    const imageBlob = new Blob([bytes], { type: 'image/png' });
    
    // Generate unique filename
    const fileName = `agent-${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
    const filePath = fileName;

    console.log('Uploading generated image to profile-images bucket...');

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    console.log('Image uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        fileName: fileName,
        prompt: prompt
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-agent-image function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate image',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
