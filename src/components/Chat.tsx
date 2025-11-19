import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import ChatSidebar from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { Conversation, Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, X, FileText, FileSpreadsheet, Sparkles, Bot, Bug, Download, Mic, HelpCircle, Copy, Share2, Trash2, File, Image as ImageIcon, Search, Pencil, Save, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PDFSelector } from './PDFSelector';
import { ExcelSelector } from './ExcelSelector';
import { isTextFile } from '@/utils/parseText';
import { isExcelFile, parseExcelFile } from '@/utils/parseExcel';
import { processPDFFile } from '@/utils/parsePdf';
import { extractTextFromFile } from '@/utils/fileTextExtraction';
import { AgentSelectorDialog } from './agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { Badge } from './ui/badge';
import { TransparencyPanel } from './chat/TransparencyPanel';
import { AgentSwitcher } from './chat/AgentSwitcher';
import { AudioUploader } from './chat/AudioUploader';
import { GettingStartedWizard } from './GettingStartedWizard';
import { WorkflowSuggestion, ActionType } from './chat/WorkflowSuggestion';
import { parseWorkflowSuggestion } from '@/utils/parseWorkflowSuggestion';
import { ShareConversationDialog } from './chat/ShareConversationDialog';
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { useAuth } from '@/hooks/useAuth';
import { useRef } from 'react';
import { FilePreviewCard } from './chat/FilePreviewCard';
import { Toggle } from './ui/toggle';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { streamManager } from '@/utils/streamManager';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
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
  const [showAudioUploader, setShowAudioUploader] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [realTimeSearchEnabled, setRealTimeSearchEnabled] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messagesToDelete, setMessagesToDelete] = useState<Message[]>([]);
  const [viewAllImagesOpen, setViewAllImagesOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("google/gemini-3-pro-preview");
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());

  // Detect if a question needs real-time data
  const needsRealTimeData = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const realTimeKeywords = [
      'current', 'latest', 'today', 'now', 'recent', 'recently',
      'this year', 'this month', 'this week', '2025', '2026',
      'who is the', "what's the current", 'what is the current',
      'how many', 'what happened', 'when did', 'price of',
      'stock', 'weather', 'news about', 'update on'
    ];
    
    return realTimeKeywords.some(keyword => lowerText.includes(keyword));
  };
  
  // Ref for auto-scrolling to bottom
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Presence for real-time typing indicators
  const { broadcastTyping, broadcastThinking } = useConversationPresence(currentConversation?.id || null);

  // Broadcast typing state when input changes (with debounce)
  useEffect(() => {
    if (!currentConversation) return;
    
    const userName = user?.email?.split('@')[0] || 'User';
    
    // Set typing to true immediately when typing
    if (input.trim()) {
      broadcastTyping(true, userName);
      
      // Debounce: Clear typing after 2 seconds of inactivity
      const timeoutId = setTimeout(() => {
        broadcastTyping(false, userName);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    } else {
      broadcastTyping(false, userName);
    }
  }, [input, currentConversation, user, broadcastTyping]);

  // Broadcast thinking state when AI is loading
  useEffect(() => {
    if (!currentConversation) return;
    
    broadcastThinking(isLoading);
  }, [isLoading, currentConversation, broadcastThinking]);

  // Auto-scroll when messages change or during streaming
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to get proper scrollHeight
      textarea.style.height = '60px';
      // Set new height based on content, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Add clipboard paste listener for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img: ImageAttachment = {
                name: `pasted-image-${Date.now()}.png`,
                dataUrl: e.target?.result as string,
                size: file.size,
                source: 'clipboard'
              };
              setImages(prev => [...prev, img]);
              toast.success('Image pasted from clipboard');
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Handle prompt text from location state
  useEffect(() => {
    if (location.state?.promptText && currentConversation) {
      setInput(location.state.promptText);
      // Clear the state so it doesn't persist
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, currentConversation, navigate, location.pathname]);

  // Handle agent from location state - auto-create conversation
  useEffect(() => {
    if (location.state?.agent && !id) {
      const agent = location.state.agent;
      setCurrentAgent(agent);
      // Automatically create a new conversation with this agent
      handleNewConversation();
      // Clear the state so it doesn't persist
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.agent) {
      setCurrentAgent(location.state.agent);
      // Clear the state so it doesn't persist
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, id]);

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    checkAuth();
    
    // Check if first visit
    const hasSeenGettingStarted = localStorage.getItem('getting-started-completed');
    if (!hasSeenGettingStarted) {
      setShowGettingStarted(true);
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    // Listen for manual logout (localStorage clear)
    const handleStorageChange = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          navigate("/auth");
        }
      });
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      // Cancel all active streams on unmount (async but fire-and-forget is ok on cleanup)
      streamManager.cancelAllStreams();
    };
  }, [navigate]);

  useEffect(() => {
    // Extract conversation ID directly from pathname to avoid useParams() issues with persistent pages
    const pathParts = location.pathname.split('/');
    const urlId = pathParts[2]; // /chat/[id] -> pathParts[2] is the id
    
    console.log('🔍 Chat useEffect triggered:', { urlId, pathname: location.pathname });
    
    if (urlId && urlId !== 'undefined' && urlId.trim() !== '') {
      loadConversation(urlId);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [location.pathname]);

  // Set up realtime subscriptions for message updates
  useEffect(() => {
    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📨 Message updated:', payload);
          const updatedMessage = payload.new as Message;
          
          // Only update if this message belongs to current conversation AND is not actively streaming
          if (currentConversation && 
              updatedMessage.conversation_id === currentConversation.id &&
              !streamManager.isStreaming(currentConversation.id)) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage as any : msg
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📨 Message inserted:', payload);
          const newMessage = payload.new as Message;
          
          // Only add if this message belongs to current conversation
          if (currentConversation && newMessage.conversation_id === currentConversation.id) {
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage as any];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation]);

  // Handle automatic message send after conversation creation
  useEffect(() => {
    if (location.state?.sendMessageOnLoad && currentConversation && input.trim()) {
      // Clear the flag
      navigate(location.pathname, { replace: true, state: {} });
      // Send the message
      handleSend();
    }
  }, [currentConversation, location.state]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadConversations();
    setLoading(false);
  };

  const loadConversations = async (skipCleanup = false) => {
    // Only run cleanup on initial page load, not on every action
    if (!skipCleanup) {
      await cleanupEmptyConversations();
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load conversations");
      return;
    }

    setConversations(data || []);
  };

  const cleanupEmptyConversations = async () => {
    try {
      // Get conversations older than 5 minutes without messages
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: allConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("id, created_at")
        .lt("created_at", fiveMinutesAgo); // Only check conversations older than 5 minutes

      if (fetchError || !allConversations) return;

      // For each conversation, check if it has any messages
      const emptyConversationIds: string[] = [];
      
      for (const conv of allConversations) {
        const { data: messages, error: msgError } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conv.id)
          .limit(1);

        if (!msgError && (!messages || messages.length === 0)) {
          emptyConversationIds.push(conv.id);
        }
      }

      // Delete all empty conversations
      if (emptyConversationIds.length > 0) {
        await supabase
          .from("conversations")
          .delete()
          .in("id", emptyConversationIds);
        
        console.log(`🗑️ Cleaned up ${emptyConversationIds.length} empty conversations`);
      }
    } catch (error) {
      console.error("Error cleaning up empty conversations:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError) {
      console.error("Error loading conversation:", convError);
      toast.error("Failed to load conversation");
      navigate("/chat");
      return;
    }

    // If conversation doesn't exist (was deleted or never created)
    if (!convData) {
      console.log("Conversation not found, redirecting to chat");
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
    setMessages((messagesData || []) as any);
    
    // Check if this conversation has an active stream
    if (streamManager.isStreaming(conversationId)) {
      setActiveStreams(prev => new Set(prev).add(conversationId));
    }
    
    // Auto-scroll to bottom after messages load
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };
  
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleNewConversation = async (sendMessageAfter = false) => {
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

    // Skip cleanup since we just created this conversation
    await loadConversations(true);
    
    // If we need to send a message right after, navigate and set a flag
    if (sendMessageAfter) {
      // Navigate to the new conversation
      navigate(`/chat/${data.id}`, { state: { sendMessageOnLoad: true } });
    } else {
      navigate(`/chat/${data.id}`);
    }
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to rename conversation");
      return;
    }

    await loadConversations(true); // Skip cleanup for immediate action
    if (currentConversation?.id === conversationId) {
      setCurrentConversation({ ...currentConversation, title: newTitle });
    }
    toast.success("Conversation renamed");
  };

  const handleUpdateRetention = async (conversationId: string, retentionDays: number | null) => {
    const { error } = await supabase
      .from("conversations")
      .update({ retention_days: retentionDays })
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to update retention policy");
      return;
    }

    await loadConversations(true); // Skip cleanup for immediate action
    if (currentConversation?.id === conversationId) {
      setCurrentConversation({ ...currentConversation, retention_days: retentionDays });
    }
    toast.success("Retention policy updated");
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

  const handleDownloadHistory = () => {
    if (!currentConversation || messages.length === 0) {
      toast.error("No messages to download");
      return;
    }

    // Generate markdown content
    let markdown = `# ${currentConversation.title}\n\n`;
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    messages.forEach((message) => {
      const role = message.role === "user" ? "**You**" : "**Assistant**";
      markdown += `### ${role}\n\n${message.content}\n\n---\n\n`;
    });

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConversation.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat history downloaded");
  };

  const processFiles = async (uploadedFiles: File[]) => {
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
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
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
      } else if (file.name.toLowerCase().endsWith('.docx') || isTextFile(file)) {
        // Handle DOCX and all text-based files (txt, json, js, css, html, etc.)
        try {
          const result = await extractTextFromFile(file);
          setFiles(prev => [...prev, {
            filename: result.filename,
            content: result.content,
            type: 'text'
          }]);
        } catch (error) {
          toast.error(`Failed to process file: ${file.name}`);
        }
      } else {
        toast.error(`Unsupported file type: ${file.name}`);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    await processFiles(uploadedFiles);
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await processFiles(droppedFiles);
    }
  };

  const handleGenerateImage = async (prompt: string, sourceImageUrl?: string) => {
    if (!currentConversation || isLoading) return;
    
    setInput("");
    setIsLoading(true);

    try {
      // Save user message with image generation request
      const userContent = sourceImageUrl 
        ? `Edit the image: ${prompt}`
        : `Generate an image: ${prompt}`;
        
      const { data: savedUserMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "user" as const,
          content: userContent,
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, savedUserMessage as any]);

      // Update conversation title if first message
      if (messages.length === 0) {
        // Generate AI title based on image prompt context
        let title = sourceImageUrl 
          ? `Edit: ${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}`
          : `Image: ${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}`;
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const titleResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-conversation-title`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ 
                  message: sourceImageUrl ? `Edit this image: ${prompt}` : `Generate image: ${prompt}`
                }),
              }
            );
            if (titleResponse.ok) {
              const { title: generatedTitle } = await titleResponse.json();
              if (generatedTitle) title = generatedTitle;
            }
          }
        } catch (e) {
          console.error("Failed to generate AI title:", e);
          // Use fallback title on error
        }
        
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", currentConversation.id);
        setCurrentConversation({ ...currentConversation, title });
        await loadConversations(true); // Skip cleanup for immediate action
      }

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Call generate-image function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            prompt,
            sourceImageUrl 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate image: ${response.status}`);
      }

      const { imageUrl, description } = await response.json();

      // Save assistant message with generated image
      const assistantContent = `${description}\n\n![Generated Image](${imageUrl})`;
      
      const { data: assistantMessage, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "assistant" as const,
          content: assistantContent,
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages(prev => [...prev, assistantMessage as any]);
      toast.success(sourceImageUrl ? "Image edited successfully!" : "Image generated successfully!");

    } catch (error: any) {
      console.error('💥 Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
      
      // Add error message
      const errorMessage = {
        conversation_id: currentConversation.id,
        role: "assistant" as const,
        content: `Sorry, I couldn't generate that image. ${error.message}`,
      };
      
      const { data } = await supabase
        .from("messages")
        .insert(errorMessage)
        .select()
        .single();
        
      if (data) {
        setMessages(prev => [...prev, data as any]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!currentConversation || (!input.trim() && images.length === 0 && files.length === 0) || isLoading) return;
    
    const userContent = input.trim();
    
    // Check if this is an image editing request (edit/change/modify the last image)
    const editWords = ['edit', 'change', 'modify', 'update', 'transform', 'turn', 'convert', 'alter', 'make'];
    const lowerContent = userContent.toLowerCase();
    
    // Look for the most recent generated image in the conversation
    let lastGeneratedImageUrl: string | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant') {
        const mdMatch = msg.content.match(/!\[[^\]]*\]\(([^)]+)\)/);
        const standaloneMatch = msg.content.match(/(data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+|https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif))/);
        const foundUrl = mdMatch?.[1] || standaloneMatch?.[1];
        if (foundUrl) {
          lastGeneratedImageUrl = foundUrl;
          break;
        }
      }
    }
    
    // Check if user wants to edit the last image
    const isEditRequest = editWords.some(word => lowerContent.includes(word));
    
    if (isEditRequest && lastGeneratedImageUrl) {
      await handleGenerateImage(userContent, lastGeneratedImageUrl);
      return;
    }
    
    // Check if user is requesting image generation using flexible pattern matching
    const actionWords = ['generate', 'create', 'make', 'draw', 'produce', 'design', 'build'];
    const imageWords = ['image', 'picture', 'photo', 'illustration', 'graphic', 'pic'];
    
    // Check if message contains an action word followed (somewhere) by an image word
    const isImageRequest = actionWords.some(action => {
      if (!lowerContent.includes(action)) return false;
      return imageWords.some(imageWord => {
        const actionIndex = lowerContent.indexOf(action);
        const imageIndex = lowerContent.indexOf(imageWord);
        // Action word should come before image word, within reasonable distance
        return imageIndex > actionIndex && (imageIndex - actionIndex) < 30;
      });
    });
    
    if (isImageRequest) {
      // Extract the actual prompt by removing the trigger phrases
      let imagePrompt = userContent;
      
      // Remove common image generation trigger patterns
      const patterns = [
        /^(generate|create|make|draw|produce|design|build)\s+(me\s+)?(an?\s+)?(image|picture|photo|illustration|graphic|pic)\s+(of\s+)?/gi,
        /^(can\s+you\s+)?(please\s+)?(generate|create|make|draw)\s+(me\s+)?(an?\s+)?(image|picture|photo)/gi
      ];
      
      for (const pattern of patterns) {
        imagePrompt = imagePrompt.replace(pattern, '').trim();
      }
      
      // Remove leading "of" or ":"
      imagePrompt = imagePrompt.replace(/^(of|:)\s*/i, '').trim();
      
      if (!imagePrompt) {
        toast.error('Please provide a description for the image');
        return;
      }
      
      await handleGenerateImage(imagePrompt);
      return;
    }
    
    setInput("");
    setIsLoading(true);

    try {
      // Prepare file content
      let fullContent = userContent;
      let enhancedContentForAI = userContent; // Separate variable for AI that includes search results
      
      // Auto-enable real-time search for questions needing current data
      const shouldUseRealTimeSearch = realTimeSearchEnabled || needsRealTimeData(userContent);

      // Notify user if real-time search was auto-activated
      if (!realTimeSearchEnabled && shouldUseRealTimeSearch) {
        toast.info("Auto-enabled Real-Time Search");
      }

      // If real-time search is enabled or auto-detected, fetch search results first
      if (shouldUseRealTimeSearch) {
        try {
          const { data: searchData, error: searchError } = await supabase.functions.invoke(
            "perplexity-search",
            {
              body: { query: userContent },
            }
          );

          if (searchError) throw searchError;

          if (searchData?.answer) {
            // Real-time search returns a direct answer - format it clearly for the AI
            enhancedContentForAI = `[User Question]: ${userContent}

[Real-Time Search Result]:
${searchData.answer}

INSTRUCTION: The above search result contains current, verified information from the web. You MUST use this real-time data to answer the user's question. If there is any conflict between this search result and your training data, prioritize the search result as it is more current and accurate.`;
            
            toast.success("Found current information");
          }
        } catch (searchErr) {
          console.error("Real-time search error:", searchErr);
          toast.error("Search failed, continuing without search results");
        }
      }
      
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
        enhancedContentForAI = enhancedContentForAI + fileContent;
      }

      // Prepare attachments data from image uploads
      const attachmentsData = images.map(img => ({
        name: img.name,
        type: 'image',
        size: img.size,
        url: img.dataUrl
      }));

      // Save files to database for file manager
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (userSession) {
        // Save images to file_attachments table
        for (const img of images) {
          await supabase.from('file_attachments').insert({
            user_id: userSession.user.id,
            conversation_id: currentConversation.id,
            filename: img.name,
            file_type: 'image',
            file_size: img.size,
            data_url: img.dataUrl,
            metadata: { source: img.source || 'upload' }
          });
        }

        // Save text files to file_attachments table
        for (const file of files) {
          await supabase.from('file_attachments').insert({
            user_id: userSession.user.id,
            conversation_id: currentConversation.id,
            filename: file.filename,
            file_type: file.type || 'text',
            file_size: new Blob([file.content]).size,
            metadata: { 
              pageCount: file.pageCount,
              totalSheets: file.totalSheets,
              totalRows: file.totalRows
            }
          });
        }
      }

      // Save user message with attachments
      const { data: savedUserMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "user" as const,
          content: fullContent,
          attachments: attachmentsData.length > 0 ? attachmentsData : null,
        })
        .select()
        .single();

      if (userError) throw userError;

      const updatedMessages = [...messages, savedUserMessage as any];
      setMessages(updatedMessages);
      setFiles([]);

      // Update conversation title if first message
      if (messages.length === 0) {
        // Generate AI title based on message context
        let title = userContent.slice(0, 100) + (userContent.length > 100 ? "..." : "");
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const titleResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-conversation-title`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ message: userContent }),
              }
            );
            if (titleResponse.ok) {
              const { title: generatedTitle } = await titleResponse.json();
              if (generatedTitle) title = generatedTitle;
            }
          }
        } catch (e) {
          console.error("Failed to generate AI title:", e);
          // Use fallback title on error
        }
        
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", currentConversation.id);
        setCurrentConversation({ ...currentConversation, title });
        await loadConversations(true); // Skip cleanup for immediate action
      }

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Prepare request - maintain full message history but strip large image data
      const sanitizedHistory = updatedMessages.map(msg => {
        let content = msg.content;
        // Remove image markdown and standalone URLs to reduce token count
        content = content.replace(/!\[[^\]]*\]\([^)]+\)/g, '[Image]');
        content = content.replace(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif))/gi, '[Image]');
        content = content.replace(/(data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi, '[Image]');
        return {
          role: msg.role,
          content: content
        };
      });

      const requestPayload: any = {
        message: enhancedContentForAI, // Use enhanced content with search results for AI
        messageHistory: sanitizedHistory
      };

      // Apply agent persona if selected - only affects system prompt and current message wrapping
      if (currentAgent) {
        requestPayload.systemPrompt = currentAgent.system_prompt;
        // Wrap the current message with agent's user prompt template
        // If user_prompt is empty or doesn't contain {input}, use the message as-is
        if (currentAgent.user_prompt && currentAgent.user_prompt.includes('{input}')) {
          requestPayload.message = currentAgent.user_prompt.replace('{input}', enhancedContentForAI);
        } else if (currentAgent.user_prompt) {
          // User prompt exists but no {input} placeholder - append the message
          requestPayload.message = currentAgent.user_prompt + '\n\n' + enhancedContentForAI;
        }
        // Otherwise, keep requestPayload.message as the original enhancedContentForAI
        
        // Include knowledge documents if available
        if ((currentAgent as any).knowledge_documents?.length > 0) {
          requestPayload.knowledgeDocuments = (currentAgent as any).knowledge_documents.map((doc: any) => ({
            filename: doc.filename,
            content: doc.content
          }));
        }
      }

      // Check if user is asking about a recent image
      const imageQuestionWords = ['what', 'tell me', 'describe', 'explain', 'about this', 'analyze', 'show me', 'see'];
      const isAskingAboutImage = imageQuestionWords.some(word => 
        fullContent.toLowerCase().includes(word)
      );

      // Find the most recent generated image if user is asking about it
      let recentImageForAnalysis: string | undefined;
      if (isAskingAboutImage && images.length === 0) {
        console.log('🔍 Looking for recent image to analyze...');
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.role === 'assistant') {
            const mdMatch = msg.content.match(/!\[[^\]]*\]\(([^)]+)\)/);
            const standaloneMatch = msg.content.match(/(data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+|https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif))/);
            const foundUrl = mdMatch?.[1] || standaloneMatch?.[1];
            if (foundUrl) {
              console.log('✅ Found recent image for analysis:', foundUrl.substring(0, 100) + '...');
              recentImageForAnalysis = foundUrl;
              break;
            }
          }
        }
        if (!recentImageForAnalysis) {
          console.log('❌ No recent image found in history');
        }
      }

      if (images.length > 0 || recentImageForAnalysis) {
        console.log('📸 Including images in request:', images.length > 0 ? `${images.length} uploaded` : '1 from history');
        requestPayload.images = images.length > 0 
          ? images.map(img => img.dataUrl)
          : [recentImageForAnalysis];
      }

      // Store payload for troubleshooting
      setLastPayload({
        timestamp: new Date().toISOString(),
        endpoint: (images.length > 0 || recentImageForAnalysis) ? 'gemini-chat-with-images' : 'gemini-chat',
        model: 'gemini-2.5-flash',
        systemPrompt: requestPayload.systemPrompt,
        messages: sanitizedHistory,
        attachments: [...images.map(img => ({ type: 'image', name: img.name })), ...files.map(f => ({ type: 'file', name: f.filename }))],
        fullRequest: requestPayload,
        payload: requestPayload,
        agent: currentAgent ? {
          name: currentAgent.name,
          system_prompt: currentAgent.system_prompt,
          user_prompt: currentAgent.user_prompt
        } : null
      });

      // Call appropriate endpoint - both use Gemini API
      const endpoint = (images.length > 0 || recentImageForAnalysis)
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

      const finalMessages = [...updatedMessages, assistantMessage as any];
      setMessages(finalMessages);

      // Update active streams state
      setActiveStreams(prev => new Set(prev).add(currentConversation.id));
      
      // Keep loading state active during streaming for visual feedback
      // Start token-by-token streaming with immediate UI updates
      const streamingConversationId = currentConversation.id;
      streamManager.startStream(
        streamingConversationId,
        assistantMessage.id,
        response,
        // Update UI immediately token-by-token - but only if still on same conversation
        (content) => {
          setMessages(prev => {
            // Only update if we're still viewing the conversation that's streaming
            if (currentConversation?.id === streamingConversationId) {
              return prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content }
                  : msg
              );
            }
            return prev;
          });
        }
      ).then(() => {
        // Stream completed - remove from active streams and stop loading
        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamingConversationId);
          return newSet;
        });
        // Only stop loading if we're still on the same conversation
        if (currentConversation?.id === streamingConversationId) {
          setIsLoading(false);
        }
      }).catch((error) => {
        console.error('Stream error:', error);
        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamingConversationId);
          return newSet;
        });
        // Only stop loading if we're still on the same conversation
        if (currentConversation?.id === streamingConversationId) {
          setIsLoading(false);
        }
      });

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

  const handleStartEdit = (message: Message) => {
    if (isLoading) {
      toast.error("Cannot edit while AI is responding");
      return;
    }
    
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveAndResend = async () => {
    if (!editingMessageId || !currentConversation || !editingContent.trim()) return;

    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    const messagesToDeleteArray = messages.slice(messageIndex + 1);
    
    // Show confirmation if there are messages to delete
    if (messagesToDeleteArray.length > 0) {
      setMessagesToDelete(messagesToDeleteArray);
      setShowDeleteConfirm(true);
      return;
    }

    // If no messages to delete, proceed immediately
    await confirmSaveAndResend();
  };

  const confirmSaveAndResend = async () => {
    if (!editingMessageId || !currentConversation || !editingContent.trim()) return;

    setShowDeleteConfirm(false);
    setIsLoading(true);

    try {
      const messageIndex = messages.findIndex(m => m.id === editingMessageId);
      const messagesToDeleteArray = messages.slice(messageIndex + 1);

      // Delete subsequent messages from database
      if (messagesToDeleteArray.length > 0) {
        const idsToDelete = messagesToDeleteArray.map(m => m.id);
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Update edited message in database
      const { error: updateError } = await supabase
        .from('messages')
        .update({ content: editingContent })
        .eq('id', editingMessageId);

      if (updateError) throw updateError;

      // Update local state
      const updatedMessages = messages.slice(0, messageIndex + 1).map(m =>
        m.id === editingMessageId ? { ...m, content: editingContent } : m
      );
      setMessages(updatedMessages);

      // Clear editing state
      setEditingMessageId(null);
      setEditingContent("");
      setMessagesToDelete([]);

      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Prepare conversation history for re-submission
      const sanitizedHistory = updatedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Prepare request payload
      const requestPayload: any = {
        messages: sanitizedHistory,
      };

      // Include agent prompts if available
      if (currentAgent) {
        requestPayload.systemPrompt = currentAgent.system_prompt;
        if (currentAgent.user_prompt) {
          requestPayload.userPrompt = currentAgent.user_prompt;
        }
        if ((currentAgent as any).knowledge_documents?.length > 0) {
          requestPayload.knowledgeDocuments = (currentAgent as any).knowledge_documents.map((doc: any) => ({
            filename: doc.filename,
            content: doc.content
          }));
        }
      }

      // Store payload for troubleshooting
      setLastPayload({
        timestamp: new Date().toISOString(),
        endpoint: 'gemini-chat',
        model: 'gemini-2.5-flash',
        systemPrompt: requestPayload.systemPrompt,
        messages: sanitizedHistory,
        fullRequest: requestPayload,
        payload: requestPayload,
        agent: currentAgent ? {
          name: currentAgent.name,
          system_prompt: currentAgent.system_prompt,
          user_prompt: currentAgent.user_prompt
        } : null
      });

      // Call Gemini API
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`;
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

      const finalMessages = [...updatedMessages, assistantMessage as any];
      setMessages(finalMessages);

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulatedContent += parsed.text;
                  setMessages(prevMessages =>
                    prevMessages.map(m =>
                      m.id === assistantMessage.id
                        ? { ...m, content: accumulatedContent }
                        : m
                    )
                  );
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
      }

      // Update assistant message in database
      await supabase
        .from("messages")
        .update({ content: accumulatedContent })
        .eq("id", assistantMessage.id);

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation.id);

      toast.success("Message edited and conversation regenerated");
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast.error(error.message || 'Failed to edit message');
      // Reload conversation to ensure consistency
      if (currentConversation) {
        await loadConversation(currentConversation.id);
      }
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header spans full width */}
      <ChatHeader />
      
      {/* Sidebar and content area below header */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onNewConversation={handleNewConversation}
          onSelectConversation={(id) => navigate(`/chat/${id}`)}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onUpdateRetention={handleUpdateRetention}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeStreams={activeStreams}
        />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {!currentConversation ? (
          <div 
            className={`flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-accent/5 transition-all ${isDragging ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center max-w-3xl w-full animate-fade-in">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 hover:scale-105 transition-transform duration-300">
                  <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                {t('chat:welcome.title')}
              </h2>
              <p className="text-muted-foreground mb-12 text-lg">
                {t('chat:welcome.subtitle')}
              </p>
              
              {/* Drag and drop hint */}
              {isDragging && (
                <div className="mb-6 p-4 bg-primary/10 border-2 border-dashed border-primary rounded-2xl animate-pulse">
                  <p className="text-primary font-medium">Drop files here to attach</p>
                </div>
              )}
              
              {/* File previews on welcome screen */}
              {(images.length > 0 || files.length > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">Attached Files ({images.length + files.length})</p>
                    {images.length > 5 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewAllImagesOpen(true)}
                        className="text-xs"
                      >
                        View All ({images.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.slice(0, 5).map((img, idx) => (
                      <FilePreviewCard
                        key={`welcome-img-${idx}`}
                        file={{
                          name: img.name,
                          dataUrl: img.dataUrl,
                          size: img.size,
                          type: 'image'
                        }}
                        onRemove={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        type="image"
                      />
                    ))}
                    {files.map((file, idx) => (
                      <FilePreviewCard
                        key={`welcome-file-${idx}`}
                        file={{
                          name: file.filename,
                          size: new Blob([file.content]).size,
                          type: file.type || 'text',
                          content: file.content
                        }}
                        onRemove={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                        type="file"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Header Controls */}
              <div className="mb-4">
                <div className="bg-card/50 border border-border/50 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1 w-full sm:w-auto">
                      <AgentSwitcher
                        selectedAgent={currentAgent}
                        onAgentChange={(agent) => setCurrentAgent(agent)}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                          <SelectItem value="google/gemini-3-pro-preview">Gemini 3 Pro Preview</SelectItem>
                        </SelectContent>
                      </Select>
                      <Toggle
                        pressed={realTimeSearchEnabled}
                        onPressedChange={setRealTimeSearchEnabled}
                        size="sm"
                        className="h-10 px-3 rounded-xl data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all"
                        aria-label="Toggle real-time search for current information"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium whitespace-nowrap">
                          {realTimeSearchEnabled ? "Search: ON" : "Search: OFF"}
                        </span>
                      </Toggle>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern input card */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative bg-card border border-border/50 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
                  <div className="flex flex-col gap-4">

                    <div className="relative">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (input.trim()) {
                              handleNewConversation(true);
                            }
                          }
                        }}
                        placeholder={t('chat:placeholderEmpty')}
                        className="min-h-[100px] sm:min-h-[120px] max-h-[240px] resize-none w-full bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-2xl text-base placeholder:text-muted-foreground/60 pr-24"
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50 hidden sm:block">
                        {t('chat:pressEnterToSend')}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-accent/50"
                          onClick={() => document.getElementById('welcome-file-upload')?.click()}
                          title="Attach files"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-accent/50"
                          onClick={() => setShowAudioUploader(!showAudioUploader)}
                          title="Voice input"
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        onClick={() => {
                          if (input.trim()) {
                            handleNewConversation(true);
                          }
                        }}
                        disabled={!input.trim()}
                        className="h-10 sm:h-12 px-4 sm:px-8 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        <span className="font-medium hidden sm:inline">{t('chat:startChatting')}</span>
                        <span className="font-medium sm:hidden">Send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hidden file input for welcome screen */}
              <input
                id="welcome-file-upload"
                type="file"
                className="hidden"
                multiple
                accept="image/*,.pdf,.txt,.docx,.doc,.xlsx,.xls,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.xml,.md,.log,.py,.java,.c,.cpp,.h,.hpp,.rb,.go,.rs,.php,.sh,.bat,.yaml,.yml"
                onChange={handleFileUpload}
              />
              
              {/* Audio uploader */}
              {showAudioUploader && (
                <div className="mt-6 animate-fade-in">
                  <AudioUploader
                    onTranscriptionComplete={(transcript) => {
                      setInput(transcript);
                      setShowAudioUploader(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <ScrollArea 
              ref={scrollAreaRef} 
              className={`flex-1 p-4 transition-all ${isDragging ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="max-w-7xl mx-auto space-y-4">
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
                     <div className={`flex flex-col gap-3 max-w-[80%] min-w-0`}>
                         <div
                           className={`rounded-2xl px-4 py-3 relative group overflow-hidden ${
                             message.role === "user"
                               ? "bg-primary text-primary-foreground"
                               : "bg-card border border-border"
                           }`}
                         >
                              {(() => {
                              // Only use image_url from database, not from markdown content
                              // Markdown images will be rendered by ReactMarkdown
                              const imageUrl = message.image_url;
                              const textContent = message.content;
                              
                              return (
                                <>
                                   {/* Edit Mode - Show textarea with action buttons */}
                                   {editingMessageId === message.id ? (
                                     <div className="space-y-3">
                                       <Textarea
                                         value={editingContent}
                                         onChange={(e) => setEditingContent(e.target.value)}
                                         className="min-h-[100px] bg-background/50 border-primary/30 focus:border-primary resize-none"
                                         autoFocus
                                       />
                                       <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isLoading}
                            className="bg-background text-foreground border-border hover:bg-accent"
                          >
                            Cancel
                          </Button>
                                         <Button
                                           variant="default"
                                           size="sm"
                                           onClick={handleSaveAndResend}
                                           disabled={isLoading || !editingContent.trim()}
                                         >
                                           <Save className="h-4 w-4 mr-2" />
                                           Save & Resend
                                         </Button>
                                       </div>
                                     </div>
                                   ) : (
                                     <>
                                       {textContent ? (
                                         <div className={`prose prose-sm max-w-none break-words ${
                                           message.role === "user" 
                                             ? "prose-invert" 
                                             : "dark:prose-invert"
                                         } 
                                         prose-p:leading-relaxed prose-p:my-3 prose-p:text-base prose-p:break-words
                                         prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-semibold prose-headings:break-words
                                         prose-ul:my-3 prose-ul:space-y-2 prose-ul:list-disc prose-ul:pl-6
                                         prose-ol:my-3 prose-ol:space-y-2 prose-ol:list-decimal prose-ol:pl-6
                                         prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-base prose-li:break-words
                                         prose-strong:font-bold prose-strong:text-foreground
                                         prose-a:text-accent prose-a:underline prose-a:font-medium hover:prose-a:text-accent/80 prose-a:break-all
                                         prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:break-words
                                         prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:max-w-full
                                         prose-blockquote:border-l-accent prose-blockquote:my-4 prose-blockquote:break-words
                                         [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words [&_pre_code]:whitespace-pre-wrap`}>
                                           <ReactMarkdown 
                                             remarkPlugins={[remarkGfm]}
                                              components={{
                                                table: ({ node, ...props }) => (
                                                  <div className="w-full overflow-x-auto -mx-2 md:mx-0">
                                                    <table
                                                      className="w-full min-w-[720px] border-collapse [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_*]:break-words [&_td]:whitespace-normal"
                                                      {...props}
                                                    >
                                                      {props.children}
                                                    </table>
                                                  </div>
                                                ),
                                                thead: (props) => (
                                                  <thead className="bg-muted/50">
                                                    {props.children}
                                                  </thead>
                                                ),
                                                tr: (props) => (
                                                  <tr className="border-b border-border">
                                                    {props.children}
                                                  </tr>
                                                ),
                                              }}
                                           >
                                             {(() => {
                                               const { cleanContent } = parseWorkflowSuggestion(textContent);
                                               return cleanContent;
                                             })()}
                                           </ReactMarkdown>
                                         </div>
                                        ) : !imageUrl ? (
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            {activeStreams.has(currentConversation.id) && message.id === messages[messages.length - 1]?.id ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Generating response...</span>
                                              </>
                                            ) : (
                                              <div className="text-sm italic">[Empty message]</div>
                                            )}
                                          </div>
                                        ) : null}
                                     </>
                                   )}

                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {message.attachments.map((file: any, idx: number) => {
                                        const isImage = file.type === 'image' || file.url?.startsWith('data:image/');
                                        
                                        if (isImage && file.url) {
                                          return (
                                            <button
                                              key={idx}
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                                    <!DOCTYPE html>
                                                    <html>
                                                      <head>
                                                        <title>${file.name}</title>
                                                        <style>
                                                          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
                                                          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                                        </style>
                                                      </head>
                                                      <body>
                                                        <img src="${file.url}" alt="${file.name}" />
                                                      </body>
                                                    </html>
                                                  `);
                                                  newWindow.document.close();
                                                }
                                              }}
                                              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                                                message.role === "user"
                                                  ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                                  : "bg-secondary/50 hover:bg-secondary"
                                              }`}
                                            >
                                              <ImageIcon className={`h-4 w-4 ${
                                                message.role === "user"
                                                  ? "text-primary-foreground/70 group-hover:text-primary-foreground"
                                                  : "text-muted-foreground group-hover:text-foreground"
                                              } transition-colors`} />
                                              <span className={`text-sm ${
                                                message.role === "user"
                                                  ? "text-primary-foreground"
                                                  : "text-foreground"
                                              }`}>{file.name}</span>
                                            </button>
                                          );
                                        }
                                        
                                        return (
                                          <a
                                            key={idx}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group ${
                                              message.role === "user"
                                                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                                : "bg-secondary/50 hover:bg-secondary"
                                            }`}
                                          >
                                            <File className={`h-4 w-4 ${
                                              message.role === "user"
                                                ? "text-primary-foreground/70 group-hover:text-primary-foreground"
                                                : "text-muted-foreground group-hover:text-foreground"
                                            } transition-colors`} />
                                            <span className={`text-sm ${
                                              message.role === "user"
                                                ? "text-primary-foreground"
                                                : "text-foreground"
                                            }`}>{file.name}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                 
                                  {imageUrl && (
                                    <div className="mt-3 relative group">
                                      <img 
                                        src={imageUrl} 
                                        alt="Generated image" 
                                        className="max-w-full h-auto rounded-lg border border-border shadow-lg"
                                      />
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(imageUrl);
                                            const blob = await response.blob();
                                            const blobUrl = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            link.download = `generated-image-${Date.now()}.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(blobUrl);
                                            toast.success('Image downloaded!');
                                          } catch (error) {
                                            console.error('Download failed:', error);
                                            toast.error('Failed to download image');
                                          }
                                        }}
                                        title="Download image"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                               </>
                             );
                           })()}
                           
                            {/* Message Actions - Edit (user only), Copy and Download */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {message.role === 'user' && !isLoading && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                                  onClick={() => handleStartEdit(message)}
                                  title="Edit message"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content);
                                  toast.success('Message copied to clipboard');
                                }}
                                title="Copy message"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                                onClick={() => {
                                  const blob = new Blob([message.content], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `message-${message.role}-${Date.now()}.md`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  toast.success('Message downloaded');
                                }}
                                title="Download message"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                         </div>
                       
                       {message.role === "assistant" && (() => {
                         const { suggestion } = parseWorkflowSuggestion(message.content);
                         return suggestion ? (
                           <WorkflowSuggestion
                             actionType={suggestion.type}
                             workflowData={suggestion.workflow}
                             description={suggestion.description}
                           />
                         ) : null;
                       })()}
                       
                       {message.role === "assistant" && message.metadata?.generation_time_sec && (
                         <div className="text-xs text-muted-foreground px-2">
                           Generated in {message.metadata.generation_time_sec}s
                         </div>
                       )}
                     </div>
                   </div>
                ))}
                 {isLoading && (
                   <div className="flex gap-3 items-start">
                     <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 animate-pulse">
                       <Sparkles className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '3s' }} />
                     </div>
                     <div className="bg-gradient-to-r from-card/50 to-card border border-primary/20 rounded-2xl px-5 py-4 backdrop-blur-sm shadow-lg shadow-primary/5">
                       <div className="flex items-center gap-3">
                         <div className="flex gap-1.5">
                           <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                           <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                           <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                         </div>
                         <div className="relative">
                           <div className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
                             Thinking
                           </div>
                           <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-sm -z-10 animate-pulse" />
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            </ScrollArea>

            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
              <div className="max-w-7xl mx-auto">
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
                  <div className="mb-3">
                    {images.length > 5 && (
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">{images.length} images attached</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewAllImagesOpen(true)}
                          className="text-xs h-7"
                        >
                          View All
                        </Button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.slice(0, 5).map((img, idx) => (
                        <FilePreviewCard
                          key={`img-${idx}`}
                          file={{
                            name: img.name,
                            dataUrl: img.dataUrl,
                            size: img.size,
                            type: 'image'
                          }}
                          onRemove={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          type="image"
                        />
                      ))}
                      {files.map((file, idx) => (
                        <FilePreviewCard
                          key={`file-${idx}`}
                          file={{
                            name: file.filename,
                            size: new Blob([file.content]).size,
                            type: file.type || 'text',
                            content: file.content
                          }}
                          onRemove={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                          type="file"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  {/* Real-Time Search Toggle - Always visible above textarea */}
                  <div className="flex items-center gap-2">
                    <Toggle
                      pressed={realTimeSearchEnabled}
                      onPressedChange={setRealTimeSearchEnabled}
                      aria-label="Toggle real-time search for current information"
                      size="sm"
                      className="px-4 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {realTimeSearchEnabled ? "Search: ON" : "Search: OFF"}
                      </span>
                    </Toggle>
                    {realTimeSearchEnabled && (
                      <span className="text-xs text-muted-foreground">
                        Searches for current web information
                      </span>
                    )}
                  </div>
                  
                  {/* Textarea on its own row */}
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your message..."
                    className="min-h-[60px] max-h-[200px] resize-none w-full overflow-y-auto"
                    disabled={isLoading}
                  />
                  
                  {/* Buttons row below on mobile, inline on desktop */}
                  <div className="flex gap-2 flex-wrap">
                    <AgentSwitcher
                      selectedAgent={currentAgent}
                      onAgentChange={(agent) => setCurrentAgent(agent)}
                    />
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
                      onClick={() => setShowAudioUploader(!showAudioUploader)}
                      disabled={isLoading}
                      title="Audio Input"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setShowAudioUploader(false);
                        document.getElementById('file-upload')?.click();
                      }}
                      disabled={isLoading}
                      title="Attach files"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadHistory}
                      disabled={!currentConversation || messages.length === 0}
                      title="Download chat history"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {currentConversation && (
                      <>
                        <ShareConversationDialog
                          conversationId={currentConversation.id}
                          conversationTitle={currentConversation.title}
                          isShared={currentConversation.is_shared}
                          shareToken={currentConversation.share_token}
                          onShareStatusChange={() => {
                            // Refresh conversation data to update share status
                            loadConversations(true); // Skip cleanup for immediate action
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Delete "${currentConversation.title}"?`)) {
                              handleDeleteConversation(currentConversation.id);
                            }
                          }}
                          title="Delete conversation"
                          className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.txt,.docx,.doc,.xlsx,.xls,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.xml,.md,.log,.py,.java,.c,.cpp,.h,.hpp,.rb,.go,.rs,.php,.sh,.bat,.yaml,.yml"
                      onChange={handleFileUpload}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!input.trim() && images.length === 0 && files.length === 0) || isLoading}
                      className="ml-auto"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>

                  {showAudioUploader && (
                    <div className="mt-3">
                      <AudioUploader
                        onTranscriptionComplete={(text) => {
                          setInput(prev => prev ? `${prev}\n\n${text}` : text);
                          setShowAudioUploader(false);
                        }}
                      />
                    </div>
                  )}
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

        {/* Transparency Panel Dialog */}
        {showTroubleshoot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-lg w-[90%] h-[90%]">
              <TransparencyPanel
                lastPayload={lastPayload}
                onClose={() => setShowTroubleshoot(false)}
              />
            </div>
          </div>
        )}

        {/* Getting Started Wizard */}
        <GettingStartedWizard
          open={showGettingStarted}
          onOpenChange={setShowGettingStarted}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Message & Regenerate Response</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {messagesToDelete.length} message{messagesToDelete.length === 1 ? '' : 's'} after your edited message 
                and regenerate the AI response from that point. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteConfirm(false);
                setMessagesToDelete([]);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmSaveAndResend}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View All Images Dialog */}
        <Dialog open={viewAllImagesOpen} onOpenChange={setViewAllImagesOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>All Uploaded Images ({images.length})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <FilePreviewCard
                    key={`all-img-${idx}`}
                    file={{
                      name: img.name,
                      dataUrl: img.dataUrl,
                      size: img.size,
                      type: 'image'
                    }}
                    onRemove={() => {
                      setImages(prev => prev.filter((_, i) => i !== idx));
                      if (images.length === 1) {
                        setViewAllImagesOpen(false);
                      }
                    }}
                    type="image"
                  />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Chat;
