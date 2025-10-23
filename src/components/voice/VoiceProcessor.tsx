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
      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Main Tabs */}
        <Card className="shadow-sm">
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

    </div>
  );
};

export default VoiceProcessor;