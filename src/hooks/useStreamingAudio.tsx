import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamingAudioState {
  isStreaming: boolean;
  isPlaying: boolean;
  isFullyLoaded: boolean;
  audioUrl: string | null;
  downloadUrl: string | null;
  error: string | null;
}

export const useStreamingAudio = () => {
  const { toast } = useToast();
  const [state, setState] = useState<StreamingAudioState>({
    isStreaming: false,
    isPlaying: false,
    isFullyLoaded: false,
    audioUrl: null,
    downloadUrl: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const currentDownloadUrlRef = useRef<string | null>(null);
  const streamingChunks = useRef<Uint8Array[]>([]);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const lastAppendedChunkCount = useRef<number>(0);

  const streamTextToSpeech = useCallback(async (text: string, voiceId: string, modelId?: string, streaming?: boolean) => {
    try {
      setState(prev => ({ ...prev, isStreaming: true, error: null, isFullyLoaded: false }));
      streamingChunks.current = [];
      lastAppendedChunkCount.current = 0;

      // Clean up previous audio URLs
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
      if (currentDownloadUrlRef.current) {
        URL.revokeObjectURL(currentDownloadUrlRef.current);
        currentDownloadUrlRef.current = null;
      }

      console.log(`Starting ${streaming ? 'streaming' : 'standard'} audio generation...`);

      // Use Supabase client to call the edge function
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            text,
            voice_id: voiceId,
            model_id: modelId,
            streaming: streaming || false,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      console.log('Response received, starting stream processing...');

      const reader = response.body.getReader();
      let hasStartedPlaying = false;
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunkCount++;
          streamingChunks.current.push(value);
          
          console.log(`Received chunk ${chunkCount}, size: ${value.length} bytes`);

          // For streaming mode: continuously update the progressive playback
          if (streaming) {
            if (!hasStartedPlaying && chunkCount >= 4) {
              hasStartedPlaying = true;
              console.log('Starting progressive MP3 playback...');
              tryProgressivePlayback();
            } else if (hasStartedPlaying && chunkCount % 4 === 0) {
              // Update every 4 chunks to maintain smooth playback with less interruption
              console.log(`Updating progressive playback at chunk ${chunkCount}`);
              tryProgressivePlayback();
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Create final complete audio
      createFinalAudio(streaming);

    } catch (error) {
      console.error('Audio generation error:', error);
      setState(prev => ({ 
        ...prev, 
        isStreaming: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Separate method for progressive playback using MediaSource Extensions
  const tryProgressivePlayback = useCallback(async () => {
    try {
      const chunks = streamingChunks.current;
      if (chunks.length === 0) return;

      // If MediaSource isn't supported, fall back to blob approach
      if (!window.MediaSource) {
        console.warn('MediaSource not supported, using blob fallback');
        // Fall back to original blob approach for unsupported browsers
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combinedArray = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          combinedArray.set(chunk, offset);
          offset += chunk.length;
        }

        const progressiveBlob = new Blob([combinedArray], { type: 'audio/mpeg' });
        const progressiveUrl = URL.createObjectURL(progressiveBlob);
        
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
        }
        
        currentAudioUrlRef.current = progressiveUrl;
        setState(prev => ({ ...prev, audioUrl: progressiveUrl, isStreaming: true }));

        if (audioRef.current) {
          audioRef.current.src = progressiveUrl;
          audioRef.current.load();
        }
        return;
      }

      // Use MediaSource Extensions for true progressive streaming
      if (!mediaSourceRef.current) {
        console.log('Initializing MediaSource for streaming...');
        mediaSourceRef.current = new MediaSource();
        
        const mediaUrl = URL.createObjectURL(mediaSourceRef.current);
        currentAudioUrlRef.current = mediaUrl;
        setState(prev => ({ ...prev, audioUrl: mediaUrl, isStreaming: true }));

        if (audioRef.current) {
          audioRef.current.src = mediaUrl;
        }

        mediaSourceRef.current.addEventListener('sourceopen', () => {
          console.log('MediaSource opened, creating source buffer...');
          try {
            if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
              sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
              
              sourceBufferRef.current.addEventListener('updateend', () => {
                console.log('SourceBuffer update completed');
              });

              sourceBufferRef.current.addEventListener('error', (e) => {
                console.error('SourceBuffer error:', e);
              });

              // Append the first chunks
              appendChunksToBuffer();
            }
          } catch (error) {
            console.error('Error creating source buffer:', error);
          }
        });

        // Try to start playback once we have some data - delay 2 seconds for better buffering
        setTimeout(async () => {
          try {
            if (audioRef.current && chunks.length >= 3) {
              console.log('Attempting MediaSource playback after buffer delay...');
              await audioRef.current.play();
              setState(prev => ({ ...prev, isPlaying: true }));
              console.log('MediaSource playback started!');
              
              toast({
                title: "Streaming Audio",
                description: "Progressive streaming started!",
              });
            }
          } catch (playError) {
            console.warn('MediaSource auto-play failed:', playError);
            toast({
              title: "Audio Ready", 
              description: "Audio is streaming. Click play when ready!",
            });
          }
        }, 2000);
      } else {
        // MediaSource already exists, just append new chunks
        appendChunksToBuffer();
      }
    } catch (error) {
      console.warn('Progressive playback failed:', error);
      // Fall back to blob approach
      console.log('Falling back to blob approach...');
    }
  }, [toast]);

  // Helper function to append chunks to MediaSource buffer
  const appendChunksToBuffer = useCallback(() => {
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) {
      // Buffer is busy, try again later
      setTimeout(appendChunksToBuffer, 100);
      return;
    }

    const chunks = streamingChunks.current;
    const newChunkCount = chunks.length - lastAppendedChunkCount.current;
    
    if (newChunkCount === 0) return;

    try {
      // Only process NEW chunks that haven't been appended yet
      const newChunks = chunks.slice(lastAppendedChunkCount.current);
      const totalLength = newChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      
      if (totalLength === 0) return;
      
      const combinedNewArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of newChunks) {
        combinedNewArray.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`Appending ${newChunkCount} new chunks (${totalLength} bytes) to MediaSource buffer`);
      
      // Simply append the new data without removing existing buffer
      sourceBufferRef.current.appendBuffer(combinedNewArray);
      
      // Update our tracking of what's been appended
      lastAppendedChunkCount.current = chunks.length;
      
    } catch (error) {
      console.error('Error appending to source buffer:', error);
    }
  }, []);

  // Separate method for final audio creation
  const createFinalAudio = useCallback(async (streaming?: boolean) => {
    try {
      const chunks = streamingChunks.current;
      console.log(`Creating final audio from ${chunks.length} chunks`);

      if (chunks.length === 0) {
        throw new Error('No audio data received');
      }

      // Always create a downloadable blob from chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`Final audio size: ${combinedArray.length} bytes`);
      
      // Create downloadable blob (always MP3 now)
      const downloadBlob = new Blob([combinedArray], { type: 'audio/mpeg' });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      
      // Clean up previous download URL
      if (currentDownloadUrlRef.current) {
        URL.revokeObjectURL(currentDownloadUrlRef.current);
      }
      currentDownloadUrlRef.current = downloadUrl;

      // If we were using MediaSource, finalize it but keep the download URL
      if (streaming && mediaSourceRef.current && sourceBufferRef.current) {
        try {
          if (!sourceBufferRef.current.updating && mediaSourceRef.current.readyState === 'open') {
            console.log('Finalizing MediaSource stream...');
            mediaSourceRef.current.endOfStream();
            setState(prev => ({ 
              ...prev, 
              isStreaming: false, 
              isFullyLoaded: true,
              downloadUrl: downloadUrl
            }));
            
            toast({
              title: "Success",
              description: "Streaming complete! Full audio ready.",
            });
            return;
          }
        } catch (error) {
          console.warn('Error finalizing MediaSource:', error);
        }
      }

      // For non-streaming or fallback, use the same blob for both playback and download
      const finalUrl = downloadUrl;
      
      // Clean up previous URL
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      
      currentAudioUrlRef.current = finalUrl;
      
      console.log(`Created final audio URL: ${finalUrl.substring(0, 50)}...`);

      setState(prev => ({ 
        ...prev, 
        audioUrl: finalUrl, 
        downloadUrl: downloadUrl,
        isStreaming: false, 
        isFullyLoaded: true 
      }));

      // Set up final audio playback
      if (audioRef.current) {
        const wasPlaying = !audioRef.current.paused;
        const currentTime = audioRef.current.currentTime || 0;
        
        audioRef.current.src = finalUrl;
        audioRef.current.load();
        
        // Restore playback position if it was playing
        if (wasPlaying && currentTime > 0) {
          audioRef.current.currentTime = currentTime;
        }
        
        // Try to start/resume playback if not already playing
        if (!wasPlaying) {
          setTimeout(async () => {
            try {
              if (audioRef.current) {
                console.log('Attempting final audio playback...');
                await audioRef.current.play();
                setState(prev => ({ ...prev, isPlaying: true }));
                console.log('Final audio playback started!');
              }
            } catch (playError) {
              console.warn('Final auto-play failed:', playError);
              toast({
                title: "Audio Ready",
                description: "Audio generation complete! Click play to listen.",
              });
            }
          }, 100);
        }
      }

      toast({
        title: "Success",
        description: streaming ? "Streaming complete! Full audio ready." : "Speech generated successfully!",
      });

    } catch (error) {
      console.error('Final audio creation failed:', error);
      throw error;
    }
  }, [toast]);

  const togglePlayback = useCallback(async () => {
    if (!audioRef.current || !state.audioUrl) {
      console.log('No audio element or URL available');
      toast({
        title: "No Audio",
        description: "Please generate speech first",
        variant: "destructive",
      });
      return;
    }

    try {
      if (state.isPlaying) {
        console.log('Pausing audio...');
        audioRef.current.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
      } else {
        console.log('Starting manual playback...');
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
        console.log('Manual playback started successfully!');
      }
    } catch (error) {
      console.error('Manual playback error:', error);
      setState(prev => ({ ...prev, isPlaying: false }));
      
      toast({
        title: "Playback Error", 
        description: "Unable to play audio. The audio file may be corrupted.",
        variant: "destructive",
      });
    }
  }, [state.isPlaying, state.audioUrl, toast]);

  const downloadAudio = useCallback(() => {
    if (!state.downloadUrl || !state.isFullyLoaded) {
      toast({
        title: "Download Not Ready",
        description: "Audio is still generating or not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const a = document.createElement("a");
      a.href = state.downloadUrl;
      a.download = `generated_speech_${Date.now()}.mp3`; // Always MP3 now
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your MP3 file is downloading",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download audio file",
        variant: "destructive",
      });
    }
  }, [state.downloadUrl, state.isFullyLoaded, toast]);

  const handleAudioEnded = useCallback(() => {
    console.log('Audio playback ended');
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handleAudioPlay = useCallback(() => {
    console.log('Audio play event');
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const handleAudioPause = useCallback(() => {
    console.log('Audio pause event');
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const cleanup = useCallback(() => {
    console.log('Cleaning up audio resources');
    
    // Clean up MediaSource
    if (sourceBufferRef.current) {
      sourceBufferRef.current = null;
    }
    
    if (mediaSourceRef.current) {
      if (mediaSourceRef.current.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch (error) {
          console.warn('Error ending MediaSource stream:', error);
        }
      }
      mediaSourceRef.current = null;
    }
    
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    
    if (currentDownloadUrlRef.current) {
      URL.revokeObjectURL(currentDownloadUrlRef.current);
      currentDownloadUrlRef.current = null;
    }
    
    streamingChunks.current = [];
    lastAppendedChunkCount.current = 0;
    
    setState({
      isStreaming: false,
      isPlaying: false,
      isFullyLoaded: false,
      audioUrl: null,
      downloadUrl: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    audioRef,
    streamTextToSpeech,
    togglePlayback,
    downloadAudio,
    handleAudioEnded,
    handleAudioPlay,
    handleAudioPause,
    cleanup,
  };
};