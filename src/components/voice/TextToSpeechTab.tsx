import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useStreamingAudio } from "@/hooks/useStreamingAudio";
import { Volume2, Download, Play, Pause, Mic, Waves, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Voice, Model } from "./VoiceSidebar";

interface TextToSpeechTabContentProps {
  selectedVoice: string;
  selectedModel: string;
  useStreaming: boolean;
  voices: Voice[];
  models: Model[];
  loadingVoices: boolean;
  loadingModels: boolean;
  onVoiceChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onStreamingChange: (value: boolean) => void;
}

export const TextToSpeechTabContent: React.FC<TextToSpeechTabContentProps> = ({
  selectedVoice,
  selectedModel,
  useStreaming,
  voices,
  models,
  loadingVoices,
  loadingModels,
  onVoiceChange,
  onModelChange,
  onStreamingChange,
}) => {
  const { toast } = useToast();
  const [text, setText] = useState("");
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
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Selection */}
          <div className="space-y-2">
            <Label htmlFor="voice-select">Voice</Label>
            <Select value={selectedVoice} onValueChange={onVoiceChange} disabled={loadingVoices}>
              <SelectTrigger id="voice-select">
                <SelectValue placeholder={loadingVoices ? "Loading voices..." : "Select a voice"} />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} {voice.category && `(${voice.category})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model-select">Model</Label>
            <Select value={selectedModel} onValueChange={onModelChange} disabled={loadingModels}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
              </SelectTrigger>
              <SelectContent>
                {models.filter(m => m.can_do_text_to_speech).map((model) => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="streaming-toggle">Enable Streaming</Label>
              <p className="text-sm text-muted-foreground">
                Stream audio as it's generated for faster playback
              </p>
            </div>
            <Switch
              id="streaming-toggle"
              checked={useStreaming}
              onCheckedChange={onStreamingChange}
            />
          </div>
        </CardContent>
      </Card>

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