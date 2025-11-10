import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatHeader } from "@/components/ChatHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Search, Calendar, Users, Sparkles, ChevronRight, Tag, Trash2 } from "lucide-react";
import { parseVTT, parseTextTranscript } from "@/utils/parseVTT";
import * as mammoth from "mammoth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface MeetingTranscript {
  id: string;
  title: string;
  meeting_date: string | null;
  file_format: string;
  content: string;
  structured_data: any;
  summary: string | null;
  action_items: any;
  participants: string[];
  tags: string[];
  created_at: string;
}



export default function MeetingTranscripts() {
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<MeetingTranscript | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('transcripts');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    const { data, error } = await supabase
      .from("meeting_transcripts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: t('messages.error'),
        description: t('messages.errorLoadTranscripts'),
        variant: "destructive",
      });
      return;
    }

    setTranscripts(data || []);
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      try {
        let content = "";
        let structuredData = null;
        let fileFormat = "";

        // Parse based on file type
        if (file.name.endsWith(".vtt")) {
          content = await file.text();
          const parsed = parseVTT(content);
          structuredData = parsed;
          content = parsed.fullText;
          fileFormat = "vtt";
        } else if (file.name.endsWith(".docx")) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
          const parsed = parseTextTranscript(content);
          structuredData = parsed;
          fileFormat = "docx";
        } else if (file.name.endsWith(".txt")) {
          content = await file.text();
          const parsed = parseTextTranscript(content);
          structuredData = parsed;
          content = parsed.fullText;
          fileFormat = "txt";
        } else {
          toast({
            title: t('page.unsupportedFormat'),
            description: `${file.name} ${t('page.unsupportedFormatDesc')}`,
            variant: "destructive",
          });
          continue;
        }

        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(t('messages.notAuthenticated'));

        // Insert transcript
        const { error } = await supabase.from("meeting_transcripts").insert({
          user_id: user.id,
          title: file.name.replace(/\.(vtt|docx|txt)$/, ""),
          original_filename: file.name,
          file_format: fileFormat,
          content,
          structured_data: structuredData,
          participants: structuredData?.speakers || [],
        });

        if (error) throw error;

        toast({
          title: t('messages.success'),
          description: `${file.name} ${t('messages.uploadSuccess')}`,
        });
      } catch (error: any) {
        toast({
          title: t('messages.uploadFailed'),
          description: error.message,
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    fetchTranscripts();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));
    event.target.value = "";
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/vtt': ['.vtt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: true,
    noClick: false,
    disabled: isUploading
  });

  const analyzeTranscript = async (transcript: MeetingTranscript) => {
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript: transcript.content }
      });

      if (error) throw error;

      console.log("Analysis response:", data);

      const summary = data.summary || "";
      const actionItems = data.action_items || [];
      const keyDecisions = data.key_decisions || "";

      // Combine summary and key decisions for display
      let fullSummary = summary;
      if (keyDecisions) {
        fullSummary += `\n\n**Key Decisions:**\n${keyDecisions}`;
      }

      // Update transcript with analysis
      const { error: updateError } = await supabase
        .from("meeting_transcripts")
        .update({
          summary: fullSummary,
          action_items: actionItems,
        })
        .eq("id", transcript.id);

      if (updateError) throw updateError;

      toast({
        title: t('messages.analysisComplete'),
        description: t('messages.analysisCompleteDesc'),
      });

      fetchTranscripts();
      if (selectedTranscript?.id === transcript.id) {
        const updated = transcripts.find(t => t.id === transcript.id);
        if (updated) {
          setSelectedTranscript({ 
            ...updated, 
            summary: fullSummary, 
            action_items: actionItems 
          });
        }
      }
    } catch (error: any) {
      toast({
        title: t('messages.analysisFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredTranscripts = transcripts.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteTranscript = async (transcript: MeetingTranscript, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`${t('page.deleteConfirm')} "${transcript.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("meeting_transcripts")
        .delete()
        .eq("id", transcript.id);

      if (error) throw error;

      toast({
        title: t('messages.deleted'),
        description: t('messages.deletedDesc'),
      });

      if (selectedTranscript?.id === transcript.id) {
        setSelectedTranscript(null);
      }

      fetchTranscripts();
    } catch (error: any) {
      toast({
        title: t('messages.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <ChatHeader />
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left side - Transcripts List */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <div className="p-4 flex-shrink-0 border-b border-border">
            <h2 className="text-base font-semibold mb-3">{t('title')}</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1.5 py-3">
              {filteredTranscripts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{t('noTranscripts')}</p>
                  <p className="text-xs mt-1">{t('noTranscriptsDesc')}</p>
                </div>
              ) : (
                filteredTranscripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedTranscript?.id === transcript.id 
                        ? "bg-accent border-l-2 border-primary" 
                        : "border-l-2 border-transparent"
                    }`}
                    onClick={() => setSelectedTranscript(transcript)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight flex-1">
                        {transcript.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                          {transcript.file_format.toUpperCase()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteTranscript(transcript, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">{new Date(transcript.created_at).toLocaleDateString()}</span>
                    </div>
                    {transcript.participants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {transcript.participants.slice(0, 2).join(", ")}
                          {transcript.participants.length > 2 && ` +${transcript.participants.length - 2}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('page.title')}</h1>
              <p className="text-muted-foreground">
                {t('page.subtitle')}
              </p>
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('page.uploadTitle')}
                </CardTitle>
                <CardDescription>
                  {t('page.uploadDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-primary animate-bounce' : 'text-muted-foreground'}`} />
                  <h3 className="text-lg font-medium mb-2">
                    {isDragActive ? t('page.dragDropActive') : t('page.dragDrop')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('page.clickBrowse')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('page.supportsFormats')}
                  </p>
                  {selectedTranscript && (
                    <div className="mt-6 flex gap-3 justify-center">
                      <Button
                        onClick={() => navigate("/canvas", { state: { transcript: selectedTranscript } })}
                        variant="outline"
                        size="sm"
                      >
                        {t('page.processInCanvas')}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transcript Detail */}
            {selectedTranscript ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{selectedTranscript.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(selectedTranscript.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {selectedTranscript.participants.length} {t('page.participants')}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => analyzeTranscript(selectedTranscript)}
                      disabled={isAnalyzing}
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isAnalyzing ? t('page.analyzing') : t('page.aiAnalyze')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="transcript">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="transcript">{t('tabs.transcript')}</TabsTrigger>
                      <TabsTrigger value="summary">{t('tabs.summary')}</TabsTrigger>
                      <TabsTrigger value="actions">{t('tabs.actionItems')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transcript" className="mt-4">
                      <div className="prose prose-sm max-w-none max-h-[500px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {selectedTranscript.content}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="summary" className="mt-4">
                      {selectedTranscript.summary ? (
                        <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg">
                          <p className="whitespace-pre-wrap">{selectedTranscript.summary}</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t('analysis.noSummary')}</p>
                          <p className="text-sm">{t('analysis.noSummaryDesc')}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="actions" className="mt-4">
                      {selectedTranscript.action_items && selectedTranscript.action_items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTranscript.action_items.map((item: any, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{item.task || item}</p>
                                    {item.owner && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Owner: {item.owner}
                                      </p>
                                    )}
                                    {item.deadline && (
                                      <p className="text-sm text-muted-foreground">
                                        Deadline: {item.deadline}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t('analysis.noActionItems')}</p>
                          <p className="text-sm">{t('analysis.noActionItemsDesc')}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('emptyState.selectTranscript')}</p>
                  <p className="text-sm">{t('emptyState.uploadToStart')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
