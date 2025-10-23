import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice_id, model_id = 'eleven_multilingual_v2', streaming = false } = await req.json();

    if (!text || !voice_id) {
      throw new Error('Text and voice_id are required');
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log(`Generating speech for voice ${voice_id} with model ${model_id}, streaming: ${streaming}`);

    // Determine output format based on streaming preference
    const outputFormat = streaming ? 'mp3_44100_128' : 'mp3_44100_128'; // Use MP3 for both - WAV doesn't stream well
    const contentType = streaming ? 'audio/mpeg' : 'audio/mpeg';

    // Call ElevenLabs API for streaming text-to-speech
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg', // Always use MP3 for better streaming support
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: model_id,
        output_format: outputFormat,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          use_speaker_boost: true,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from ElevenLabs API');
    }

    // Stream the audio directly back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
  }
});