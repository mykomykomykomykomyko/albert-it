import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStreamingAudio } from "@/hooks/useStreamingAudio";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, Download, Play, Pause, Loader2, Mic, Waves, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextToSpeechTabProps {
  apiKey?: string; // Made optional since we're using Supabase now
}

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

interface Model {
  model_id: string;
  name: string;
  can_do_text_to_speech: boolean;
  description?: string;
}

export const TextToSpeechTab: React.FC<TextToSpeechTabProps> = ({ apiKey }) => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true); // Default to streaming for better UX
  const [customMaxChars, setCustomMaxChars] = useState(3000);
  const [showCharLimitInput, setShowCharLimitInput] = useState(false);
  
  const {
    isStreaming,
    isPlaying,
    isFullyLoaded,
    audioUrl,
    error,
    audioRef,
    streamTextToSpeech,
    togglePlayback,
    downloadAudio,
    cleanup,
    handleAudioEnded,
    handleAudioPlay,
    handleAudioPause,
  } = useStreamingAudio();

  // Fetch available voices and models from ElevenLabs
  useEffect(() => {
    const fetchVoicesAndModels = async () => {
      setLoadingVoices(true);
      setLoadingModels(true);

      try {
        // Fetch voices
        const { data: voicesData, error: voicesError } = await supabase.functions.invoke('get-elevenlabs-voices');
        if (voicesError) throw voicesError;
        
        if (voicesData?.voices) {
          setVoices(voicesData.voices);
          // Set default voice to first available
          if (voicesData.voices.length > 0 && !selectedVoice) {
            setSelectedVoice(voicesData.voices[0].voice_id);
          }
        }

        // Fetch models
        const { data: modelsData, error: modelsError } = await supabase.functions.invoke('get-elevenlabs-models');
        if (modelsError) throw modelsError;

        if (modelsData?.models) {
          setModels(modelsData.models);
          // Set default model to first available or prefer eleven_v3
          if (modelsData.models.length > 0 && !selectedModel) {
            const v3Model = modelsData.models.find((m: Model) => m.model_id.includes('eleven_v3'));
            const defaultModel = v3Model || modelsData.models[0];
            setSelectedModel(defaultModel.model_id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch voices/models:', error);
        toast({
          title: "Failed to load voices/models",
          description: "Using fallback options. Check your ElevenLabs API configuration.",
          variant: "destructive",
        });
        
        // Fallback to hardcoded values
        setVoices([
          { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'English' },
          { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'English' },
        ]);
        setModels([
          { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', can_do_text_to_speech: true },
        ]);
        setSelectedVoice('JBFqnCBsd6RMkjVDRZzb');
        setSelectedModel('eleven_multilingual_v2');
      } finally {
        setLoadingVoices(false);
        setLoadingModels(false);
      }
    };

    fetchVoicesAndModels();
  }, []);

  // Update hook dependency array
  useEffect(() => {
    // This ensures we don't lose the selected voice/model when they're updated
  }, [selectedVoice, selectedModel]);

  const charCount = text.length;
  const isTextValid = charCount > 0 && charCount <= customMaxChars;

  const handleMaxCharsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 100 && numValue <= 10000) {
      setCustomMaxChars(numValue);
      setShowCharLimitInput(false);
      toast({
        title: "Character Limit Updated",
        description: `Maximum characters set to ${numValue}`,
      });
    } else {
      toast({
        title: "Invalid Limit",
        description: "Character limit must be between 100 and 10,000",
        variant: "destructive",
      });
    }
  };

  const generateSpeech = async () => {
    if (!selectedVoice || !selectedModel || !isTextValid) {
      toast({
        title: "Configuration Required",
        description: "Please select a voice and model, and provide valid text.",
        variant: "destructive",
      });
      return;
    }

    // Reset audio control for clean start
    cleanup();

    await streamTextToSpeech(text, selectedVoice, selectedModel, useStreaming);
  };

  const selectedVoiceData = voices.find(v => v.voice_id === selectedVoice);
  const selectedModelData = models.find(m => m.model_id === selectedModel);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Text Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="text-input">Enter text to convert to speech</Label>
              <div className="flex items-center gap-2">
                {showCharLimitInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      defaultValue={customMaxChars}
                      className="w-20 px-2 py-1 text-xs border rounded"
                      onBlur={(e) => handleMaxCharsChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleMaxCharsChange(e.currentTarget.value);
                        }
                        if (e.key === 'Escape') {
                          setShowCharLimitInput(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCharLimitInput(false)}
                      className="h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant={charCount > customMaxChars ? "destructive" : "outline"}
                    className="text-xs cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => setShowCharLimitInput(true)}
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    {charCount}/{customMaxChars}
                  </Badge>
                )}
              </div>
            </div>
            <Textarea
              id="text-input"
              placeholder="Type your text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={cn(
                "min-h-[120px] resize-none transition-smooth",
                charCount > customMaxChars && "border-destructive focus:ring-destructive"
              )}
              maxLength={customMaxChars + 100} // Allow slight overflow for better UX
            />
            {charCount > customMaxChars && (
              <p className="text-sm text-destructive">
                Text exceeds maximum character limit of {customMaxChars}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Click the character counter to customize the limit (100-10,000 characters)
            </p>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label>Select Voice</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={loadingVoices}>
              <SelectTrigger>
                <SelectValue placeholder={loadingVoices ? "Loading voices..." : "Choose a voice..."} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      <span>{voice.name}</span>
                      {voice.category && (
                        <Badge variant="secondary" className="text-xs">
                          {voice.category}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Streaming Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="streaming"
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="streaming" className="text-sm font-medium">
                Streaming (Progressive MP3 playback)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {useStreaming 
                ? "Audio will start playing as it streams (progressive MP3)"
                : "Audio will be generated completely before playing (MP3)"
              }
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Select Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={loadingModels}>
              <SelectTrigger>
                <SelectValue placeholder={loadingModels ? "Loading models..." : "Choose a model..."} />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      {model.model_id.includes('v3') && (
                        <Badge variant="default" className="text-xs ml-2">
                          Latest
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Speech</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateSpeech}
            disabled={!isTextValid || isStreaming || !selectedVoice || !selectedModel || loadingVoices || loadingModels}
            className="w-full mb-6"
            size="lg"
          >
            {useStreaming ? (
              <>
                <Waves className="w-5 h-5 mr-2 animate-bounce" />
                Generate & Stream Speech
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 mr-2" />
                Generate Speech
              </>
            )}
          </Button>

          {/* Audio Player */}
          {audioUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={togglePlayback}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={downloadAudio}
                  disabled={!isFullyLoaded}
                  className="flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isFullyLoaded ? "Download MP3" : "Loading..."}
                </Button>
              </div>

              <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                controls
                className="w-full rounded-lg"
                key={audioUrl} // Force re-render when audioUrl changes
                src={audioUrl || undefined}
              >
                Your browser does not support the audio element.
              </audio>
              
              {isStreaming && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                  <Waves className="w-4 h-4 animate-bounce" />
                  {useStreaming ? 
                    "Streaming live audio... Playing as data arrives" : 
                    "Streaming audio... Audio will start when ready"
                  }
                </div>
              )}
              
              {error && (
                <div className="text-sm text-destructive mt-2 text-center">
                  Error: {error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {selectedVoiceData && (
        <Card className="bg-gradient-surface border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Voice Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-primary">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium">{selectedVoiceData.name}</h3>
                {selectedVoiceData.category && (
                  <Badge variant="secondary" className="mt-1">
                    {selectedVoiceData.category}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};