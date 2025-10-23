import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mic, Volume2, Bot } from "lucide-react";
import { SpeechToTextTab } from "./SpeechToTextTab";
import { TextToSpeechTab } from "./TextToSpeechTab";

const VoiceProcessor = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-6 py-16">
          <div className="text-center text-white">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Bot className="w-16 h-16 animate-pulse-glow" />
                <div className="absolute -inset-2 bg-white/20 rounded-full blur-xl" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 tracking-tight">
              Academy Voice Processor
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-4">
              AI-powered voice processing with ElevenLabs integration
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 bg-white/20 text-white border-white/30">
                <Volume2 className="w-3 h-3" />
                Text-to-Speech
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 bg-white/20 text-white border-white/30">
                <Mic className="w-3 h-3" />
                Speech-to-Text
              </Badge>
            </div>
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 -mt-8 relative z-10">
        {/* Main Tabs */}
        <Card className="glass shadow-strong animate-slide-up">
          <Tabs defaultValue="speech-to-text" className="w-full">
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
                <TextToSpeechTab />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p className="text-sm">
            Powered by <span className="gradient-text font-medium">ElevenLabs API</span> • 
            Built for Academy Voice Processing
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VoiceProcessor;