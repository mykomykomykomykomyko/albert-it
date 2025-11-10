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
import { Send, Paperclip, X, FileText, FileSpreadsheet, Sparkles, Bot, Bug, Download, Mic, HelpCircle, Copy, Share2, Trash2, File, Image as ImageIcon, Search } from "lucide-react";
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
  const [braveSearchEnabled, setBraveSearchEnabled] = useState(false);
  
  // Ref for auto-scrolling to bottom
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
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
        const title = sourceImageUrl 
          ? `Edit: ${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}`
          : `Image: ${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}`;
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
      
      // If Brave search is enabled, fetch search results first
      if (braveSearchEnabled) {
        try {
          const { data: searchData, error: searchError } = await supabase.functions.invoke(
            "brave-search",
            {
              body: { query: userContent, numResults: 5 },
            }
          );

          if (searchError) throw searchError;

          if (searchData?.results && searchData.results.length > 0) {
            const searchContext = searchData.results
              .map((r: any, i: number) => `${i + 1}. ${r.title}\n${r.description}\nSource: ${r.url}`)
              .join("\n\n");
            
            // Only enhance the AI message, keep user message clean
            enhancedContentForAI = `[User Question]: ${userContent}\n\n[Real-time Search Results]:\n${searchContext}\n\nPlease answer the user's question using the search results above as context. Cite sources when relevant.`;
            
            toast.success(`Found ${searchData.results.length} search results`);
          }
        } catch (searchErr) {
          console.error("Brave search error:", searchErr);
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
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? "..." : "");
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
        requestPayload.message = currentAgent.user_prompt.replace('{input}', enhancedContentForAI);
        
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

      // Stream response using Gemini format
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

                  if (data.error) {
                    const errMsg = `Gemini error: ${data.error}`;
                    accumulatedContent = errMsg;
                    toast.error(errMsg);
                    setMessages(prev => prev.map(msg => 
                      msg.id === (assistantMessage as any).id 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  } else if (data.text) {
                    accumulatedContent += data.text;
                    setMessages(prev => prev.map(msg => 
                      msg.id === (assistantMessage as any).id 
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
                  <p className="text-sm font-medium mb-3 text-foreground">Attached Files ({images.length + files.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
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
              
              {/* Modern input card */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative bg-card border border-border/50 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
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
                        className="min-h-[120px] max-h-[240px] resize-none w-full bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-2xl text-base placeholder:text-muted-foreground/60"
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50">
                        {t('chat:pressEnterToSend')}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-accent/50"
                          onClick={() => document.getElementById('welcome-file-upload')?.click()}
                          title="Attach files"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-accent/50"
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
                        size="lg"
                        className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 rounded-xl px-8"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t('chat:startChatting')}
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
                     <div className={`flex flex-col gap-3 max-w-[80%]`}>
                         <div
                           className={`rounded-2xl px-4 py-3 relative group ${
                             message.role === "user"
                               ? "bg-primary text-primary-foreground"
                               : "bg-card border border-border"
                           }`}
                         >
                             {(() => {
                              // Extract image URL from markdown if present (including standalone base64)
                              const mdMatch = message.content?.match(/!\[[^\]]*\]\(([^)]+)\)/);
                              const standaloneMatch = message.content?.match(/(data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+|https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif))/);
                              
                              const imageUrl = message.image_url || mdMatch?.[1] || standaloneMatch?.[1];
                              
                              let textContent = message.content;
                              if (mdMatch?.[0]) {
                                textContent = message.content.replace(mdMatch[0], '').trim();
                              } else if (standaloneMatch?.[1]) {
                                textContent = message.content.replace(standaloneMatch[1], '').trim();
                              }
                              
                              return (
                                <>
                                  {textContent ? (
                                    <div className={`prose prose-sm max-w-none ${
                                      message.role === "user" 
                                        ? "prose-invert" 
                                        : "dark:prose-invert"
                                    } 
                                    prose-p:leading-relaxed prose-p:my-3 prose-p:text-base
                                    prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-semibold
                                    prose-ul:my-3 prose-ul:space-y-2 prose-ul:list-disc prose-ul:pl-6
                                    prose-ol:my-3 prose-ol:space-y-2 prose-ol:list-decimal prose-ol:pl-6
                                    prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-base
                                    prose-strong:font-bold prose-strong:text-foreground
                                    prose-a:text-accent prose-a:underline prose-a:font-medium hover:prose-a:text-accent/80 
                                    prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:my-4
                                    prose-blockquote:border-l-accent prose-blockquote:my-4`}>
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {(() => {
                                          const { cleanContent } = parseWorkflowSuggestion(textContent);
                                          return cleanContent;
                                        })()}
                                      </ReactMarkdown>
                                    </div>
                                  ) : !imageUrl ? (
                                    <div className="text-muted-foreground italic text-sm">
                                      [Empty message]
                                    </div>
                                  ) : null}

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
                           
                           {/* Message Actions - Copy and Download */}
                           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
                  <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
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
                )}
                
                <div className="flex flex-col gap-2">
                  {/* Textarea on its own row */}
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
                    className="min-h-[60px] max-h-[200px] resize-none w-full"
                    disabled={isLoading}
                  />
                  
                  {/* Buttons row below on mobile, inline on desktop */}
                  <div className="flex gap-2 flex-wrap">
                    <Toggle
                      pressed={braveSearchEnabled}
                      onPressedChange={setBraveSearchEnabled}
                      aria-label="Toggle Brave search for real-time information"
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {braveSearchEnabled ? "Search: ON" : "Search: OFF"}
                    </Toggle>
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
        </div>
      </div>
    </div>
  );
};

export default Chat;
