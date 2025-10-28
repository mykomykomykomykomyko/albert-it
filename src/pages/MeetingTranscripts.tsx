import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Search, Calendar, Users, Tag, Sparkles, ChevronRight } from "lucide-react";
import { parseVTT, parseTextTranscript } from "@/utils/parseVTT";
import * as mammoth from "mammoth";

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
        title: "Error",
        description: "Failed to load transcripts",
        variant: "destructive",
      });
      return;
    }

    setTranscripts(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
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
            title: "Unsupported Format",
            description: `${file.name} is not a supported format. Use VTT, DOCX, or TXT files.`,
            variant: "destructive",
          });
          continue;
        }

        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

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
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    fetchTranscripts();
    event.target.value = "";
  };

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
        title: "Analysis Complete",
        description: "Transcript has been analyzed successfully",
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
        title: "Analysis Failed",
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Meeting Transcripts</h1>
          <p className="text-muted-foreground">
            Upload, organize, and analyze your Microsoft Teams meeting transcripts with AI
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Transcripts
            </CardTitle>
            <CardDescription>
              Support for VTT, DOCX, and TXT files from Microsoft Teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".vtt,.docx,.txt"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="flex-1"
              />
              <Button
                onClick={() => navigate("/canvas")}
                variant="outline"
              >
                Process in Canvas
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transcript List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transcripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTranscripts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transcripts yet</p>
                    <p className="text-sm">Upload your first meeting transcript</p>
                  </div>
                ) : (
                  filteredTranscripts.map((transcript) => (
                     <Card
                      key={transcript.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedTranscript?.id === transcript.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedTranscript(transcript)}
                    >
                       <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">
                            {transcript.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {transcript.file_format}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(transcript.created_at).toLocaleDateString()}
                        </div>
                        {transcript.participants.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            {transcript.participants.slice(0, 2).join(", ")}
                            {transcript.participants.length > 2 && ` +${transcript.participants.length - 2}`}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transcript Detail */}
          <div className="lg:col-span-2">
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
                          {selectedTranscript.participants.length} participants
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => analyzeTranscript(selectedTranscript)}
                      disabled={isAnalyzing}
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isAnalyzing ? "Analyzing..." : "AI Analyze"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="transcript">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="transcript">Transcript</TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="actions">Action Items</TabsTrigger>
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
                          <p>No summary yet</p>
                          <p className="text-sm">Click "AI Analyze" to generate insights</p>
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
                          <p>No action items extracted</p>
                          <p className="text-sm">AI analysis will identify tasks and assignments</p>
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
                  <p className="text-lg font-medium">Select a transcript to view details</p>
                  <p className="text-sm">or upload a new meeting transcript to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
