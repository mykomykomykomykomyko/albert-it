import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { Conversation, Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, X, FileText, FileSpreadsheet, Sparkles, Bot, Bug } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PDFSelector } from './PDFSelector';
import { ExcelSelector } from './ExcelSelector';
import { extractTextFromFiles, isTextFile } from '@/utils/parseText';
import { isExcelFile, parseExcelFile } from '@/utils/parseExcel';
import { processPDFFile } from '@/utils/parsePdf';
import { AgentSelectorDialog } from './agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { Badge } from './ui/badge';

interface ImageAttachment {
  name: string;
  dataUrl: string;
  size: number;
  source?: string;
  pageNumber?: number;
}

interface FileAttachment {
  filename: string;
  content: string;
  pageCount?: number;
  totalSheets?: number;
  totalRows?: number;
  type?: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [showPDFSelector, setShowPDFSelector] = useState(false);
  const [showExcelSelector, setShowExcelSelector] = useState(false);
  const [currentPdfData, setCurrentPdfData] = useState<any>(null);
  const [currentExcelData, setCurrentExcelData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (id) {
      loadConversation(id);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadConversations();
    setLoading(false);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load conversations");
      return;
    }

    setConversations(data || []);
  };

  const loadConversation = async (conversationId: string) => {
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError) {
      toast.error("Failed to load conversation");
      navigate("/chat");
      return;
    }

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      toast.error("Failed to load messages");
      return;
    }

    console.log('📥 Loaded messages from DB:', messagesData);
    messagesData?.forEach((msg, idx) => {
      console.log(`Message ${idx}:`, {
        id: msg.id,
        role: msg.role,
        contentLength: msg.content?.length || 0,
        content: msg.content
      });
    });

    setCurrentConversation(convData);
    setMessages((messagesData || []) as Message[]);
  };

  const handleNewConversation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: session.user.id,
        title: "New Conversation",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create conversation");
      return;
    }

    await loadConversations();
    navigate(`/chat/${data.id}`);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }

    await loadConversations();
    if (currentConversation?.id === conversationId) {
      navigate("/chat");
    }
    toast.success("Conversation deleted");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    
    for (const file of uploadedFiles) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img: ImageAttachment = {
            name: file.name,
            dataUrl: e.target?.result as string,
            size: file.size,
            source: 'user_upload'
          };
          setImages(prev => [...prev, img]);
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.pdf')) {
        try {
          const pdfData = await processPDFFile(file);
          setCurrentPdfData(pdfData);
          setShowPDFSelector(true);
        } catch (error) {
          toast.error(`Failed to process PDF: ${file.name}`);
        }
      } else if (isExcelFile(file)) {
        try {
          const excelData = await parseExcelFile(file);
          setCurrentExcelData(excelData);
          setShowExcelSelector(true);
        } catch (error) {
          toast.error(`Failed to process Excel: ${file.name}`);
        }
      } else if (isTextFile(file)) {
        const results = await extractTextFromFiles([file]);
        if (results.length > 0) {
          setFiles(prev => [...prev, ...results]);
        }
      }
    }
    event.target.value = '';
  };

  const handleSend = async () => {
    if (!currentConversation || (!input.trim() && images.length === 0 && files.length === 0) || isLoading) return;
    
    const userContent = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Prepare file content
      let fullContent = userContent;
      if (files.length > 0) {
        const fileContent = files.map(file => {
          let content = `\n\n=== ${file.filename} ===\n\n${file.content}`;
          if (file.pageCount) {
            content = `\n\n=== ${file.filename} (${file.pageCount} pages) ===\n\n${file.content}`;
          } else if (file.totalSheets) {
            content = `\n\n=== ${file.filename} (${file.totalSheets} sheets, ${file.totalRows} rows) ===\n\n${file.content}`;
          }
          return content;
        }).join('\n\n');
        fullContent = userContent + fileContent;
      }

      // Save user message
      const { data: savedUserMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "user" as const,
          content: fullContent,
        })
        .select()
        .single();

      if (userError) throw userError;

      const updatedMessages = [...messages, savedUserMessage as Message];
      setMessages(updatedMessages);
      setFiles([]);

      // Update conversation title if first message
      if (messages.length === 0) {
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? "..." : "");
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", currentConversation.id);
        setCurrentConversation({ ...currentConversation, title });
        await loadConversations();
      }

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Prepare request - maintain full message history
      const requestPayload: any = {
        message: fullContent,
        messageHistory: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // Apply agent persona if selected - only affects system prompt and current message wrapping
      if (currentAgent) {
        requestPayload.systemPrompt = currentAgent.system_prompt;
        // Wrap the current message with agent's user prompt template
        requestPayload.message = currentAgent.user_prompt.replace('{input}', fullContent);
      }

      // Store payload for troubleshooting
      setLastPayload({
        timestamp: new Date().toISOString(),
        endpoint: images.length > 0 ? 'gemini-chat-with-images' : 'gemini-chat',
        payload: requestPayload,
        agent: currentAgent ? {
          name: currentAgent.name,
          system_prompt: currentAgent.system_prompt,
          user_prompt: currentAgent.user_prompt
        } : null
      });

      if (images.length > 0) {
        requestPayload.images = images.map(img => img.dataUrl);
      }

      // Call appropriate endpoint
      const endpoint = images.length > 0 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat-with-images`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);

      // Create assistant message
      const { data: assistantMessage, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "assistant" as const,
          content: "",
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      const finalMessages = [...updatedMessages, assistantMessage as Message];
      setMessages(finalMessages);

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        console.log('📖 Starting to read stream...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('✅ Stream complete. Final content length:', accumulatedContent.length);
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (jsonStr && jsonStr !== '{}') {
                  const data = JSON.parse(jsonStr);
                  if (data.text) {
                    accumulatedContent += data.text;
                    console.log('📝 Accumulated content:', accumulatedContent);
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  }
                }
              } catch (e) {
                console.warn('Failed to parse line:', line, e);
              }
            }
          }
        }
      }

      console.log('💾 Saving final content to DB. Length:', accumulatedContent.length, 'Content:', accumulatedContent);
      
      // Save final assistant message
      const { error: updateError } = await supabase
        .from("messages")
        .update({ content: accumulatedContent })
        .eq("id", assistantMessage.id);

      if (updateError) {
        console.error('❌ Failed to update message:', updateError);
      } else {
        console.log('✅ Message saved successfully');
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation.id);

      setImages([]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    // Messages are maintained, only the system prompt and message wrapping changes
    if (messages.length > 0 && currentAgent?.id !== agent.id) {
      toast.info(`Switching to ${agent.name}. History maintained, new persona applied.`);
    } else if (messages.length === 0) {
      toast.success(`${agent.name} selected`);
    }
    setCurrentAgent(agent);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onNewConversation={handleNewConversation}
        onSelectConversation={(id) => navigate(`/chat/${id}`)}
        onDeleteConversation={handleDeleteConversation}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatHeader />
        
        {!currentConversation ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Welcome to Albert</h2>
              <p className="text-muted-foreground mb-6">
                Your AI assistant from the Government of Alberta. Start a new conversation to begin.
              </p>
              <Button onClick={handleNewConversation} size="lg">
                Start New Conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                     <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      {message.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-muted-foreground italic text-sm">
                          [Empty message]
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-4 py-3">
                      <div className="text-sm text-muted-foreground">Thinking...</div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
              <div className="max-w-4xl mx-auto">
                {currentAgent && (
                  <div className="mb-3 flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-lg border">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{currentAgent.name}</span>
                    <Badge variant="secondary" className="ml-auto">Active</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setCurrentAgent(null)}
                      title="Remove agent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {(images.length > 0 || files.length > 0) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img.dataUrl} alt={img.name} className="h-20 w-20 object-cover rounded-lg border" />
                        <button
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                          {img.name}
                        </div>
                      </div>
                    ))}
                    {files.map((file, idx) => (
                      <div key={idx} className="relative group flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg border">
                        {file.type === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                        <span className="text-sm">{file.filename}</span>
                        <button
                          onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAgentSelector(true)}
                    disabled={isLoading}
                    title="Select Agent"
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowTroubleshoot(true)}
                    disabled={!lastPayload}
                    title="View Last LLM Payload"
                  >
                    <Bug className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isLoading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[60px] max-h-[200px] resize-none"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={(!input.trim() && images.length === 0 && files.length === 0) || isLoading}
                    size="icon"
                    className="h-[60px] w-[60px] shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {showPDFSelector && currentPdfData && (
          <PDFSelector
            pdfData={currentPdfData}
            onSelect={(selectedImages) => {
              setImages(prev => [...prev, ...selectedImages]);
              setShowPDFSelector(false);
              setCurrentPdfData(null);
            }}
            onClose={() => {
              setShowPDFSelector(false);
              setCurrentPdfData(null);
            }}
          />
        )}

        {showExcelSelector && currentExcelData && (
          <ExcelSelector
            excelData={currentExcelData}
            onSelect={(result) => {
              const fileData: FileAttachment = {
                filename: result.fileName,
                content: result.formattedContent,
                totalSheets: result.selectedData.length,
                totalRows: result.totalRows,
                type: 'excel'
              };
              setFiles(prev => [...prev, fileData]);
              setShowExcelSelector(false);
              setCurrentExcelData(null);
            }}
            onClose={() => {
              setShowExcelSelector(false);
              setCurrentExcelData(null);
            }}
          />
        )}

        <AgentSelectorDialog
          open={showAgentSelector}
          onOpenChange={setShowAgentSelector}
          onSelectAgent={handleSelectAgent}
        />

        {/* Troubleshoot Dialog */}
        {showTroubleshoot && lastPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-lg w-[90%] h-[90%] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Last LLM Payload</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowTroubleshoot(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Timestamp:</div>
                    <div className="bg-secondary/50 p-3 rounded">{lastPayload.timestamp}</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground mb-1">Endpoint:</div>
                    <div className="bg-secondary/50 p-3 rounded">{lastPayload.endpoint}</div>
                  </div>

                  {lastPayload.agent && (
                    <div>
                      <div className="text-muted-foreground mb-1">Active Agent:</div>
                      <div className="bg-secondary/50 p-3 rounded space-y-2">
                        <div><strong>Name:</strong> {lastPayload.agent.name}</div>
                        <div><strong>System Prompt:</strong><br/>{lastPayload.agent.system_prompt}</div>
                        <div><strong>User Prompt Template:</strong><br/>{lastPayload.agent.user_prompt}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-muted-foreground mb-1">Current Message:</div>
                    <div className="bg-secondary/50 p-3 rounded whitespace-pre-wrap break-words">
                      {lastPayload.payload.message}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-1">System Prompt:</div>
                    <div className="bg-secondary/50 p-3 rounded whitespace-pre-wrap">
                      {lastPayload.payload.systemPrompt || '(none)'}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-1">Message History ({lastPayload.payload.messageHistory.length} messages):</div>
                    <div className="bg-secondary/50 p-3 rounded space-y-3">
                      {lastPayload.payload.messageHistory.map((msg: any, idx: number) => (
                        <div key={idx} className="border-b border-border pb-2 last:border-0">
                          <div className="font-semibold text-primary">{msg.role}:</div>
                          <div className="whitespace-pre-wrap break-words mt-1">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {lastPayload.payload.images && (
                    <div>
                      <div className="text-muted-foreground mb-1">Images:</div>
                      <div className="bg-secondary/50 p-3 rounded">
                        {lastPayload.payload.images.length} image(s) attached
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
