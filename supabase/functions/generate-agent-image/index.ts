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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a simple colored avatar based on prompt
    let backgroundColor = '6366f1';
    let textColor = 'ffffff';
    
    if (prompt.toLowerCase().includes('research') || prompt.toLowerCase().includes('analysis')) {
      backgroundColor = '3b82f6'; // Blue
    } else if (prompt.toLowerCase().includes('creative') || prompt.toLowerCase().includes('art')) {
      backgroundColor = '8b5cf6'; // Purple
    } else if (prompt.toLowerCase().includes('assistant') || prompt.toLowerCase().includes('helper')) {
      backgroundColor = '10b981'; // Green
    } else if (prompt.toLowerCase().includes('expert') || prompt.toLowerCase().includes('professional')) {
      backgroundColor = 'f59e0b'; // Orange
    }

    // Extract initials from prompt (first two words)
    const words = prompt.split(' ').filter((w: string) => w.length > 0);
    const initials = words.slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
    
    const svg = `
      <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#${backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#${backgroundColor}DD;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#gradient)" rx="20"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#${textColor}" text-anchor="middle" dominant-baseline="middle">
          ${initials}
        </text>
      </svg>
    `;
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    
    // Generate unique filename
    const fileName = `agent-${Date.now()}-${Math.random().toString(36).substring(2)}.svg`;
    const filePath = fileName;

    console.log('Uploading generated image to profile-images bucket...');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, svgBlob, {
        contentType: 'image/svg+xml',
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