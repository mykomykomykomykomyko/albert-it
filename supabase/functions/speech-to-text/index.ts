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
    const { audio, model } = await req.json();

    if (!audio) {
      throw new Error('No audio data provided');
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Normalize model to ElevenLabs supported IDs
    const modelId = (!model || model === 'base' || model === 'default' || model === 'scribe') ? 'scribe_v1' : model;

    console.log(`Processing speech-to-text with model: ${modelId}`);

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });

    // Create form data for ElevenLabs API
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('file', audioBlob, 'audio.webm');
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