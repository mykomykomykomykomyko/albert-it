import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to group words by speaker
function groupWordsBySpeaker(words: any[]) {
  if (!words || words.length === 0) return [];
  
  const groups: { speaker_id: string; text: string; words: any[]; start_time?: number; end_time?: number; word_count: number }[] = [];
  let currentGroup: { speaker_id: string; text: string; words: any[]; start_time?: number; end_time?: number; word_count: number } | null = null;
  
  words.forEach(word => {
    // Only process actual words, skip spacing
    if (word.type === 'word' && word.speaker_id) {
      const speakerId = word.speaker_id;
      
      if (!currentGroup || currentGroup.speaker_id !== speakerId) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          speaker_id: speakerId,
          text: word.text,
          words: [word],
          start_time: word.start,
          end_time: word.end,
          word_count: 1
        };
      } else {
        // Add space before word (except for punctuation)
        if (!word.text.match(/^[.!?:;,]/)) {
          currentGroup.text += ' ';
        }
        
        currentGroup.text += word.text;
        currentGroup.words.push(word);
        currentGroup.end_time = word.end;
        currentGroup.word_count++;
      }
    }
  });
  
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  return groups;
}

// Helper function to get unique speakers
function getUniqueSpeakers(words: any[]) {
  if (!words) return [];
  const speakers = new Set<string>();
  words.forEach((word: any) => {
    if (word.speaker_id && word.type === 'word') {
      speakers.add(word.speaker_id);
    }
  });
  return Array.from(speakers);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Support both multipart/form-data and JSON base64 payloads
    const contentType = req.headers.get('content-type') || '';

    let audioFile: File | null = null;
    let model: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Parse FormData from request
      const formData = await req.formData();
      audioFile = formData.get('audio') as File | null;
      model = (formData.get('model') as string) || null;
    } else {
      // Parse JSON with base64 audio
      const body = await req.json().catch(() => null);
      if (body && body.audio) {
        const base64 = body.audio as string;
        model = (body.model as string) || null;
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: body.mimeType || 'audio/webm' });
        audioFile = new File([blob], body.filename || 'audio.webm', { type: blob.type });
      }
    }

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Normalize model to ElevenLabs supported IDs
    const modelId = (!model || model === 'base' || model === 'default' || model === 'scribe') ? 'scribe_v1' : model;

    console.log(`Processing speech-to-text with model: ${modelId}, file: ${audioFile.name}`);

    // Create form data for ElevenLabs API
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('file', audioFile, audioFile.name);
    elevenlabsFormData.append('model_id', modelId);
    elevenlabsFormData.append('response_format', 'json');
    elevenlabsFormData.append('diarize', 'true');  // Enable speaker diarization

    // Call ElevenLabs Speech-to-Text API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
      body: elevenlabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT API error:', errorText);
      throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Process the result to create diarized sections if speaker information exists
    let processedResult: any = {
      text: result.text || '',
      language_code: result.language_code,
      language_probability: result.language_probability,
      words: result.words || [],
    };

    // If we have words with speaker information, create diarized sections
    if (result.words && result.words.some((w: any) => w.speaker_id && w.type === 'word')) {
      const diarizedSections = groupWordsBySpeaker(result.words);
      const uniqueSpeakers = getUniqueSpeakers(result.words);
      
      console.log(`Created ${diarizedSections.length} diarized sections for ${uniqueSpeakers.length} speakers`);
      
      processedResult = {
        ...processedResult,
        diarized_sections: diarizedSections.map(section => ({
          speaker: section.speaker_id,
          original_speaker_id: section.speaker_id,
          text: section.text,
          word_count: section.word_count,
          start_time: section.start_time,
          end_time: section.end_time
        })),
        total_speakers: uniqueSpeakers.length,
      };
    }

    // Return the result in the same format the frontend expects
    return new Response(
      JSON.stringify(processedResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});