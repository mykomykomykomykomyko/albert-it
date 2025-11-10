import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileAudio, Download, Users, Clock, Trash2, Play, Mic, Square, Copy, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SpeechToTextTabProps {
  // API key no longer needed - handled by edge function
}

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  transcription?: any;
}

interface Model {
  model_id: string;
  name: string;
  can_do_text_to_speech?: boolean;
}

export const SpeechToTextTab: React.FC<SpeechToTextTabProps> = () => {
  const { t } = useTranslation('voice');
  const { toast } = useToast();
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [autoDetectSpeakers, setAutoDetectSpeakers] = useState(true);
  const [manualSpeakerCount, setManualSpeakerCount] = useState(2);
  const [isDragOver, setIsDragOver] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  // Set available speech-to-text models
  useEffect(() => {
    // Only these models are valid for speech-to-text according to ElevenLabs API
    const speechToTextModels = [
      { model_id: "scribe_v1", name: "Scribe v1" },
      { model_id: "scribe_v1_experimental", name: "Scribe v1 Experimental" }
    ];
    
    setModels(speechToTextModels);
    
    // Select first available model
    if (speechToTextModels.length > 0) {
      setSelectedModel(speechToTextModels[0].model_id);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = (fileList: File[]) => {
    const audioFiles = fileList.filter(file => 
      file.type.startsWith("audio/") || 
      [".wav", ".mp3", ".flac", ".m4a", ".ogg"].some(ext => 
        file.name.toLowerCase().endsWith(ext)
      )
    );

    if (audioFiles.length === 0) {
      toast({
        title: t("speechToText.invalidFiles"),
        description: t("speechToText.invalidFilesDesc"),
        variant: "destructive",
      });
      return;
    }

    const newFiles: AudioFile[] = audioFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      status: "pending",
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const processFile = async (fileId: string) => {
    if (!selectedModel) {
      toast({
        title: t("speechToText.configRequired"), 
        description: t("speechToText.selectModel"),
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: "processing", progress: 10 }
        : f
    ));

    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      const formData = new FormData();
      formData.append("audio", file.file);
      formData.append("model", selectedModel);
      
      if (!autoDetectSpeakers) {
        formData.append("speaker_labels", manualSpeakerCount.toString());
      }

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 50 } : f
      ));

      // Call our Supabase edge function - use fetch directly for FormData
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/speech-to-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to transcribe audio' }));
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      console.log('Transcription response:', data); // Debug log

      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: "completed", progress: 100, transcription: data }
          : f
      ));

      // Auto-select this file to show results
      setSelectedFile(fileId);

      toast({
        title: t("speechToText.success"),
        description: `${t("speechToText.transcriptionComplete")} ${file.name}`,
      });

    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: "error", progress: 0 } : f
      ));
      
      toast({
        title: t("speechToText.transcriptionFailed"),
        description: error instanceof Error ? error.message : t("messages.error"),
        variant: "destructive",
      });
    }
  };

  const groupWordsBySpeaker = (words: any[]) => {
    if (!words || words.length === 0) return [];
    
    const groups: { speaker_id: string; text: string; words: any[] }[] = [];
    let currentGroup: { speaker_id: string; text: string; words: any[] } | null = null;
    
    words.forEach(word => {
      if (word.type === 'word') {
        const speakerId = word.speaker_id || 'unknown';
        
        if (!currentGroup || currentGroup.speaker_id !== speakerId) {
          if (currentGroup) {
            groups.push(currentGroup);
          }
          currentGroup = {
            speaker_id: speakerId,
            text: word.text,
            words: [word]
          };
        } else {
          // Add proper spacing between words
          const previousWord = currentGroup.words[currentGroup.words.length - 1];
          let spacing = '';
          
          // Add space if previous word doesn't end with punctuation that should be attached
          if (previousWord && !previousWord.text.match(/[.!?:;,]$/)) {
            spacing = ' ';
          }
          // Add space after punctuation
          else if (previousWord && previousWord.text.match(/[.!?:;,]$/)) {
            spacing = ' ';
          }
          
          currentGroup.text += spacing + word.text;
          currentGroup.words.push(word);
        }
      }
    });
    
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  const getSpeakerDisplayName = (speakerId: string) => {
    return speakerNames[speakerId] || speakerId;
  };

  const updateSpeakerName = (originalId: string, newName: string) => {
    setSpeakerNames(prev => ({
      ...prev,
      [originalId]: newName
    }));
  };

  const getUniqueSpeakers = (transcription: any) => {
    if (!transcription?.words) return [];
    const speakers = new Set<string>();
    transcription.words.forEach((word: any) => {
      if (word.speaker_id && word.type === 'word') {
        speakers.add(word.speaker_id);
      }
    });
    return Array.from(speakers);
  };

  const getUniqueSpeakersFromDiarizedSections = (diarizedSections: any[]) => {
    if (!diarizedSections) return [];
    const speakers = new Set<string>();
    diarizedSections.forEach((section: any) => {
      if (section.original_speaker_id) {
        speakers.add(section.original_speaker_id);
      }
    });
    return Array.from(speakers);
  };

  const downloadTranscription = (file: AudioFile, format: "txt" | "json") => {
    if (!file.transcription) return;

    let content = "";
    let filename = "";
    let mimeType = "";

    if (format === "txt") {
      if (file.transcription.words && file.transcription.words.some((w: any) => w.speaker_id)) {
        const speakerGroups = groupWordsBySpeaker(file.transcription.words);
        content = speakerGroups
          .map(group => `${getSpeakerDisplayName(group.speaker_id)}: ${group.text}`)
          .join('\n\n');
      } else {
        content = file.transcription.text || t("speechToText.noTranscription");
      }
      filename = `${file.name}_transcription.txt`;
      mimeType = "text/plain";
    } else {
      // Create structured JSON with diarized sections
      if (file.transcription.words && file.transcription.words.some((w: any) => w.speaker_id)) {
        const speakerGroups = groupWordsBySpeaker(file.transcription.words);
        const structuredData = {
          language_code: file.transcription.language_code,
          language_probability: file.transcription.language_probability,
          diarized_sections: speakerGroups.map(group => ({
            speaker: getSpeakerDisplayName(group.speaker_id),
            original_speaker_id: group.speaker_id,
            text: group.text,
            word_count: group.words.length,
            start_time: group.words[0]?.start,
            end_time: group.words[group.words.length - 1]?.end
          })),
          total_speakers: getUniqueSpeakers(file.transcription).length
        };
        content = JSON.stringify(structuredData, null, 2);
      } else {
        content = JSON.stringify(file.transcription, null, 2);
      }
      filename = `${file.name}_transcription.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyTranscriptionToClipboard = async (file: AudioFile) => {
    if (!file.transcription) return;

    let textContent = "";

    // Use diarized_sections if available, otherwise fallback to words
    if (file.transcription.diarized_sections && file.transcription.diarized_sections.length > 0) {
      textContent = file.transcription.diarized_sections
        .map((section: any) => `${getSpeakerDisplayName(section.original_speaker_id)}: ${section.text}`)
        .join('\n\n');
    } else if (file.transcription.words && file.transcription.words.some((w: any) => w.speaker_id)) {
      const speakerGroups = groupWordsBySpeaker(file.transcription.words);
      textContent = speakerGroups
        .map(group => `${getSpeakerDisplayName(group.speaker_id)}: ${group.text}`)
        .join('\n\n');
    } else {
      textContent = file.transcription.text || t("speechToText.noTranscription");
    }

    try {
      await navigator.clipboard.writeText(textContent);
      toast({
        title: t("speechToText.copied"),
        description: t("speechToText.copiedDesc"),
      });
    } catch (error) {
      toast({
        title: t("speechToText.copyFailed"),
        description: t("speechToText.copyFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const saveToTranscripts = async (file: AudioFile) => {
    if (!file.transcription) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: t("common.error"),
          description: t("speechToText.loginRequired"),
          variant: "destructive",
        });
        return;
      }

      // Format the transcription content
      let formattedContent = "";
      let structuredData: any = null;
      let participants: string[] = [];

      if (file.transcription.diarized_sections && file.transcription.diarized_sections.length > 0) {
        formattedContent = file.transcription.diarized_sections
          .map((section: any) => `${getSpeakerDisplayName(section.original_speaker_id)}: ${section.text}`)
          .join('\n\n');
        
        structuredData = {
          language_code: file.transcription.language_code,
          language_probability: file.transcription.language_probability,
          diarized_sections: file.transcription.diarized_sections,
          total_speakers: file.transcription.total_speakers
        };

        participants = getUniqueSpeakersFromDiarizedSections(file.transcription.diarized_sections)
          .map(id => getSpeakerDisplayName(id));
      } else if (file.transcription.words && file.transcription.words.some((w: any) => w.speaker_id)) {
        const speakerGroups = groupWordsBySpeaker(file.transcription.words);
        formattedContent = speakerGroups
          .map(group => `${getSpeakerDisplayName(group.speaker_id)}: ${group.text}`)
          .join('\n\n');

        const uniqueSpeakers = getUniqueSpeakers(file.transcription);
        participants = uniqueSpeakers.map(id => getSpeakerDisplayName(id));

        structuredData = {
          language_code: file.transcription.language_code,
          language_probability: file.transcription.language_probability,
          total_speakers: uniqueSpeakers.length
        };
      } else {
        formattedContent = file.transcription.text || t("speechToText.noTranscription");
      }

      // Save to meeting_transcripts table
      const { error } = await supabase
        .from("meeting_transcripts")
        .insert({
          user_id: session.user.id,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          original_filename: file.name,
          file_format: 'voice',
          content: formattedContent,
          structured_data: structuredData,
          participants: participants.length > 0 ? participants : null,
        });

      if (error) throw error;

      toast({
        title: t("speechToText.savedToTranscripts"),
        description: t("speechToText.savedDesc"),
      });
    } catch (error) {
      console.error('Error saving to transcripts:', error);
      toast({
        title: t("speechToText.saveFailed"),
        description: t("speechToText.saveFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile === fileId) {
      setSelectedFile(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `recording-${timestamp}.webm`;
        
        // Create a File object from the blob
        const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
        
        // Add to files list using existing handler
        handleFiles([audioFile]);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        
        toast({
          title: t("speechToText.recordingComplete"),
          description: `${t("speechToText.recordingCompleteDesc")} ${fileName}`,
        });
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
      
      toast({
        title: t("speechToText.startRecording"),
        description: t("speechToText.recording"),
      });
      
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("messages.error"),
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    
    setIsRecording(false);
    setRecordingTime(0);
    
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedFileData = files.find(f => f.id === selectedFile);
  
  // Debug log to see what's happening
  console.log('Selected file:', selectedFile);
  console.log('Selected file data:', selectedFileData);
  console.log('Transcription data:', selectedFileData?.transcription);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - File Upload */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t("speechToText.uploadAudio")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-smooth",
                isDragOver
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <FileAudio className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{t("speechToText.uploadAudio")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("speechToText.uploadAudio")}
              </p>
              <input
                type="file"
                multiple
                accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg"
                onChange={handleFileInput}
                className="hidden"
                id="audio-upload"
              />
              <div className="flex gap-3 justify-center">
                <Button asChild variant="outline">
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    {t("speechToText.uploadAudio")}
                  </label>
                </Button>
                
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "default"}
                  className="min-w-[120px]"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      {t("speechToText.stopRecording")} ({formatRecordingTime(recordingTime)})
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      {t("speechToText.recordAudio")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-medium">Uploaded Files</h4>
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file.id)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-smooth",
                      selectedFile === file.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-5 h-5" />
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          file.status === "completed" ? "default" :
                          file.status === "processing" ? "secondary" :
                          file.status === "error" ? "destructive" : "outline"
                        }>
                          {file.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {file.status === "processing" && (
                      <Progress value={file.progress} className="mt-3" />
                    )}
                    
                    {file.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          processFile(file.id);
                        }}
                        className="mt-3 w-full"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Process
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Configuration & Results */}
      <div className="space-y-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t("textToSpeech.configuration")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label>{t("speechToText.model")}</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder={t("speechToText.selectModelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speaker Detection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-detect">{t("speechToText.autoDetectSpeakers")}</Label>
                <Switch
                  id="auto-detect"
                  checked={autoDetectSpeakers}
                  onCheckedChange={setAutoDetectSpeakers}
                />
              </div>
              
              {!autoDetectSpeakers && (
                <div className="space-y-2">
                  <Label>{t("speechToText.manualSpeakerCount")}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={manualSpeakerCount}
                    onChange={(e) => setManualSpeakerCount(parseInt(e.target.value) || 2)}
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Speaker Names */}
        {selectedFileData?.transcription && (
          (selectedFileData.transcription.diarized_sections && selectedFileData.transcription.diarized_sections.length > 1) ||
          (selectedFileData.transcription.words && getUniqueSpeakers(selectedFileData.transcription).length > 0)
        ) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("speechToText.autoDetectSpeakers")} ({selectedFileData.transcription.total_speakers || getUniqueSpeakers(selectedFileData.transcription).length} {t("speechToText.speakers")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedFileData.transcription.diarized_sections ? 
                  // Use unique speakers from diarized_sections
                  getUniqueSpeakersFromDiarizedSections(selectedFileData.transcription.diarized_sections).map((speakerId) => (
                    <div key={speakerId} className="flex items-center gap-3">
                      <Label className="min-w-[80px]">{speakerId}:</Label>
                      <Input
                        placeholder="Enter speaker name"
                        value={getSpeakerDisplayName(speakerId)}
                        onChange={(e) => updateSpeakerName(speakerId, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  )) :
                  // Fallback to old method
                  getUniqueSpeakers(selectedFileData.transcription).map((speakerId) => (
                    <div key={speakerId} className="flex items-center gap-3">
                      <Label className="min-w-[80px]">{speakerId}:</Label>
                      <Input
                        placeholder="Enter speaker name"
                        value={getSpeakerDisplayName(speakerId)}
                        onChange={(e) => updateSpeakerName(speakerId, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {selectedFileData?.transcription && (
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t("speechToText.results")}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => saveToTranscripts(selectedFileData)}
                  >
                    <FolderInput className="w-4 h-4 mr-2" />
                    {t("speechToText.saveToLibrary")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyTranscriptionToClipboard(selectedFileData)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("speechToText.copyText")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadTranscription(selectedFileData, "txt")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    TXT
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadTranscription(selectedFileData, "json")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedFileData.transcription.diarized_sections && selectedFileData.transcription.diarized_sections.length > 0 ? (
                  // Use diarized_sections from backend if available
                  <div className="space-y-3">
                    {selectedFileData.transcription.diarized_sections.map((section: any, index: number) => (
                      <div key={index} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" />
                          <Badge variant="outline">{getSpeakerDisplayName(section.original_speaker_id)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {section.word_count} words • {section.start_time?.toFixed(1)}s - {section.end_time?.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-sm">{section.text}</p>
                      </div>
                    ))}
                  </div>
                ) : selectedFileData.transcription.words && selectedFileData.transcription.words.some((w: any) => w.speaker_id) ? (
                  // Fallback to old method for backwards compatibility
                  <div className="space-y-3">
                    {groupWordsBySpeaker(selectedFileData.transcription.words).map((group, index) => (
                      <div key={index} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" />
                          <Badge variant="outline">{getSpeakerDisplayName(group.speaker_id)}</Badge>
                        </div>
                        <p className="text-sm">{group.text}</p>
                      </div>
                    ))}
                  </div>
                ) : selectedFileData.transcription.text ? (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">{selectedFileData.transcription.text}</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No transcription data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};