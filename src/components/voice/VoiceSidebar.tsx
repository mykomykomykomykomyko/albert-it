import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageSidebar, PageSidebarSection } from "@/components/layout/PageSidebar";
import { Mic, Loader2 } from "lucide-react";

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

export interface Model {
  model_id: string;
  name: string;
  can_do_text_to_speech?: boolean;
  description?: string;
}

interface VoiceSidebarProps {
  activeTab: "speech-to-text" | "text-to-speech";
  // Text-to-Speech props
  voices?: Voice[];
  models?: Model[];
  selectedVoice?: string;
  selectedModel?: string;
  useStreaming?: boolean;
  loadingVoices?: boolean;
  loadingModels?: boolean;
  onVoiceChange?: (value: string) => void;
  onModelChange?: (value: string) => void;
  onStreamingChange?: (value: boolean) => void;
  // Speech-to-Text props
  sttModels?: Model[];
  selectedSttModel?: string;
  autoDetectSpeakers?: boolean;
  manualSpeakerCount?: number;
  onSttModelChange?: (value: string) => void;
  onAutoDetectSpeakersChange?: (value: boolean) => void;
  onManualSpeakerCountChange?: (value: number) => void;
}

export const VoiceSidebar = ({
  activeTab,
  voices = [],
  models = [],
  selectedVoice = "",
  selectedModel = "",
  useStreaming = true,
  loadingVoices = false,
  loadingModels = false,
  onVoiceChange,
  onModelChange,
  onStreamingChange,
  sttModels = [],
  selectedSttModel = "",
  autoDetectSpeakers = true,
  manualSpeakerCount = 2,
  onSttModelChange,
  onAutoDetectSpeakersChange,
  onManualSpeakerCountChange,
}: VoiceSidebarProps) => {
  return (
    <PageSidebar
      title="Configuration"
      description="Configure voice processing settings"
    >
      {activeTab === "text-to-speech" ? (
        <>
          <PageSidebarSection title="Voice Selection">
            <div className="space-y-3">
              <Label>Select Voice</Label>
              <Select value={selectedVoice} onValueChange={onVoiceChange} disabled={loadingVoices}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingVoices ? "Loading voices..." : "Choose a voice..."} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {loadingVoices ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    voices.map((voice) => (
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
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </PageSidebarSection>

          <PageSidebarSection title="Model Settings">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Model</Label>
                <Select value={selectedModel} onValueChange={onModelChange} disabled={loadingModels}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingModels ? "Loading models..." : "Choose a model..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingModels ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      models.map((model) => (
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
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PageSidebarSection>

          <PageSidebarSection title="Playback Options">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="streaming" className="text-sm">
                  Enable Streaming
                </Label>
                <Switch
                  id="streaming"
                  checked={useStreaming}
                  onCheckedChange={onStreamingChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {useStreaming 
                  ? "Audio plays as it streams (progressive MP3)"
                  : "Audio generates completely before playing"
                }
              </p>
            </div>
          </PageSidebarSection>
        </>
      ) : (
        <>
          <PageSidebarSection title="Transcription Model">
            <div className="space-y-3">
              <Label>Select Model</Label>
              <Select value={selectedSttModel} onValueChange={onSttModelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent>
                  {sttModels.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PageSidebarSection>

          <PageSidebarSection title="Speaker Detection">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-detect" className="text-sm">
                  Auto-detect Speakers
                </Label>
                <Switch
                  id="auto-detect"
                  checked={autoDetectSpeakers}
                  onCheckedChange={onAutoDetectSpeakersChange}
                />
              </div>
              
              {!autoDetectSpeakers && (
                <div className="space-y-2">
                  <Label htmlFor="speaker-count" className="text-sm">
                    Number of Speakers
                  </Label>
                  <Input
                    id="speaker-count"
                    type="number"
                    min="1"
                    max="10"
                    value={manualSpeakerCount}
                    onChange={(e) => onManualSpeakerCountChange?.(parseInt(e.target.value) || 2)}
                  />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {autoDetectSpeakers
                  ? "System will automatically identify different speakers"
                  : "Manually specify the number of speakers in the audio"
                }
              </p>
            </div>
          </PageSidebarSection>
        </>
      )}
    </PageSidebar>
  );
};
