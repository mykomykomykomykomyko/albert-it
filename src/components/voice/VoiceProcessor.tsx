import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Volume2 } from "lucide-react";
import { SpeechToTextTab } from "./SpeechToTextTab";
import { TextToSpeechTabContent } from "./TextToSpeechTab";
import { Voice, Model } from "./VoiceSidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VoiceProcessor = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"speech-to-text" | "text-to-speech">("speech-to-text");
  
  // Text-to-Speech state
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);

  // Speech-to-Text state
  const [sttModels, setSttModels] = useState<Model[]>([]);
  const [selectedSttModel, setSelectedSttModel] = useState<string>("");
  const [autoDetectSpeakers, setAutoDetectSpeakers] = useState(true);
  const [manualSpeakerCount, setManualSpeakerCount] = useState(2);

  // Fetch voices and models for Text-to-Speech only when needed
  useEffect(() => {
    // Only fetch if on text-to-speech tab and not already loaded
    if (activeTab !== "text-to-speech" || voices.length > 0) {
      return;
    }

    const fetchVoicesAndModels = async () => {
      setLoadingVoices(true);
      setLoadingModels(true);

      try {
        const { data: voicesData, error: voicesError } = await supabase.functions.invoke('get-elevenlabs-voices');
        if (voicesError) throw voicesError;
        
        if (voicesData?.voices) {
          setVoices(voicesData.voices);
          if (voicesData.voices.length > 0 && !selectedVoice) {
            setSelectedVoice(voicesData.voices[0].voice_id);
          }
        }

        const { data: modelsData, error: modelsError } = await supabase.functions.invoke('get-elevenlabs-models');
        if (modelsError) throw modelsError;

        if (modelsData?.models) {
          setModels(modelsData.models);
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
          description: "Using fallback options.",
          variant: "destructive",
        });
        
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
  }, [activeTab]);

  // Set up Speech-to-Text models
  useEffect(() => {
    const speechToTextModels: Model[] = [
      { model_id: "scribe_v1", name: "Scribe v1", can_do_text_to_speech: false },
      { model_id: "scribe_v1_experimental", name: "Scribe v1 Experimental", can_do_text_to_speech: false }
    ];
    
    setSttModels(speechToTextModels);
    if (speechToTextModels.length > 0) {
      setSelectedSttModel(speechToTextModels[0].model_id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        <Card className="shadow-sm">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "speech-to-text" | "text-to-speech")} className="w-full">
            <div className="border-b border-border/50">
              <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="speech-to-text"
                  className="flex items-center gap-3 py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-smooth"
                >
                  <Mic className="w-5 h-5" />
                  <span className="font-medium">Speech-to-Text</span>
                </TabsTrigger>
                <TabsTrigger
                  value="text-to-speech"
                  className="flex items-center gap-3 py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-smooth"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="font-medium">Text-to-Speech</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="speech-to-text" className="mt-0">
                <SpeechToTextTab />
              </TabsContent>
              
              <TabsContent value="text-to-speech" className="mt-0">
                <TextToSpeechTabContent
                  selectedVoice={selectedVoice}
                  selectedModel={selectedModel}
                  useStreaming={useStreaming}
                  voices={voices}
                  models={models}
                  loadingVoices={loadingVoices}
                  loadingModels={loadingModels}
                  onVoiceChange={setSelectedVoice}
                  onModelChange={setSelectedModel}
                  onStreamingChange={setUseStreaming}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default VoiceProcessor;