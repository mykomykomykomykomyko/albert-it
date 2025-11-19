import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Search } from "lucide-react";
import { Conversation, Message, ChatMessage } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Toggle } from "@/components/ui/toggle";
import { streamManager } from "@/utils/streamManager";

interface ChatInterfaceProps {
  conversation: Conversation | null;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onConversationUpdate: (conversation: Conversation) => void;
}

const ChatInterface = ({
  conversation,
  messages,
  onMessagesUpdate,
  onConversationUpdate,
}: ChatInterfaceProps) => {
  const { t } = useTranslation('chat');
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(conversation?.model || "google/gemini-3-pro-preview");
  const [realTimeSearchEnabled, setRealTimeSearchEnabled] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (conversation) {
      setModel(conversation.model);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    // Get the viewport element from ScrollArea
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      // Scroll to bottom smoothly
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  const handleModelChange = async (newModel: string) => {
    if (!conversation) return;

    const { error } = await supabase
      .from("conversations")
      .update({ model: newModel })
      .eq("id", conversation.id);

    if (error) {
      toast.error("Failed to update model");
      return;
    }

    setModel(newModel);
    onConversationUpdate({ ...conversation, model: newModel });
    toast.success("Model updated");
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      let enhancedMessage = userMessage;

      // Auto-enable real-time search for questions needing current data
      const shouldUseRealTimeSearch = realTimeSearchEnabled || needsRealTimeData(userMessage);

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
              body: { query: userMessage },
            }
          );

          if (searchError) throw searchError;

          if (searchData?.answer) {
            // Real-time search returns a direct answer - format it clearly for the AI
            enhancedMessage = `[User Question]: ${userMessage}

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

      // Save user message (original message, not enhanced)
      const { data: savedUserMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user" as const,
          content: userMessage,
        })
        .select()
        .single();

      if (userError) throw userError;

      const updatedMessages = [...messages, savedUserMessage as any];
      onMessagesUpdate(updatedMessages);

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        // Generate AI title using Gemini
        let title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "..." : "");
        try {
          const { data: titleData, error: titleError } = await supabase.functions.invoke(
            'generate-conversation-title',
            { body: { message: userMessage } }
          );
          
          if (!titleError && titleData?.title) {
            title = titleData.title;
          }
        } catch (e) {
          console.error("Failed to generate AI title:", e);
          // Use fallback title on error
        }
        
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", conversation.id);
        onConversationUpdate({ ...conversation, title });
      }

      // Prepare messages for API (use enhanced message for last user message if search was used)
      const chatMessages: ChatMessage[] = updatedMessages.map((msg, idx) => ({
        role: msg.role,
        content: idx === updatedMessages.length - 1 && shouldUseRealTimeSearch ? enhancedMessage : msg.content,
      }));

      // Create placeholder assistant message
      const { data: assistantMessage, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant" as const,
          content: "",
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      const finalMessages = [...updatedMessages, assistantMessage as any];
      onMessagesUpdate(finalMessages);

      // Stream response using streamManager for smooth token-by-token display
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: chatMessages, model }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      // Use streamManager for consistent smooth streaming
      await streamManager.startStream(
        conversation.id,
        assistantMessage.id,
        response,
        (content) => {
          // Update UI with accumulated content for smooth token-by-token display
          const updatedFinalMessages = finalMessages.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content }
              : msg
          );
          onMessagesUpdate(updatedFinalMessages);
        }
      );
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 glow-effect">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gradient">{t('welcome.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('welcome.subtitle')}. {t('welcome.startMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 sm:p-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-base sm:text-lg">{conversation.title}</h2>
            <p className="text-xs text-muted-foreground">
              {messages.length} {messages.length === 1 ? t('message') : t('messages')}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10">
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
              className="h-9 sm:h-10 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              aria-label="Toggle real-time search"
            >
              <Search className="h-4 w-4" />
            </Toggle>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
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
              <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%] w-full sm:w-auto min-w-0">
                <div
                  className={`rounded-2xl px-3 sm:px-4 py-3 overflow-hidden ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  <div className={`prose prose-sm max-w-none break-words overflow-hidden ${
                    message.role === "user" 
                      ? "prose-invert [&_*]:text-primary-foreground" 
                      : "dark:prose-invert"
                  } 
                  prose-p:leading-relaxed prose-p:my-2 prose-p:text-sm sm:prose-p:text-base prose-p:break-words
                  prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-headings:break-words
                  prose-h1:text-xl sm:prose-h1:text-2xl prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base sm:prose-h3:text-lg
                  prose-ul:my-2 prose-ul:space-y-1 prose-ul:list-disc prose-ul:pl-5
                  prose-ol:my-2 prose-ol:space-y-1 prose-ol:list-decimal prose-ol:pl-5
                  prose-li:my-1 prose-li:leading-relaxed prose-li:text-sm sm:prose-li:text-base prose-li:break-words
                  prose-strong:font-bold prose-strong:text-foreground
                  prose-em:italic
                  prose-a:text-accent prose-a:underline prose-a:font-medium hover:prose-a:text-accent/80 prose-a:break-all
                  prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs sm:prose-code:text-sm prose-code:font-mono prose-code:break-words
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:my-3 prose-pre:p-2 sm:prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:max-w-full
                  prose-blockquote:border-l-4 prose-blockquote:border-l-accent prose-blockquote:pl-4 prose-blockquote:my-3 prose-blockquote:italic prose-blockquote:break-words
                  prose-hr:border-border prose-hr:my-4
                  prose-table:border-collapse prose-table:w-full prose-table:my-3
                  prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-2 sm:prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-xs sm:prose-th:text-sm
                  prose-td:border prose-td:border-border prose-td:px-2 sm:prose-td:px-3 prose-td:py-2 prose-td:break-words prose-td:text-xs sm:prose-td:text-sm
                  [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words [&_pre_code]:whitespace-pre-wrap
                  [&_input[type=checkbox]]:mr-2`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="w-full overflow-x-auto my-3 -mx-3 sm:mx-0 px-3 sm:px-0 overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <table className="min-w-full border-collapse text-xs sm:text-sm" {...props} />
                          </div>
                        ),
                        thead: (props) => (
                          <thead className="bg-muted/50">{props.children}</thead>
                        ),
                        tbody: (props) => (
                          <tbody>{props.children}</tbody>
                        ),
                        tr: (props) => (
                          <tr className="border-b border-border">{props.children}</tr>
                        ),
                        th: (props) => (
                          <th className="border border-border px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap">{props.children}</th>
                        ),
                        td: (props) => (
                          <td className="border border-border px-2 sm:px-3 py-1.5 sm:py-2 break-words min-w-[100px]">{props.children}</td>
                        ),
                        code: ({ node, inline, className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline ? (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          );
                        },
                        input: ({ node, ...props }: any) => {
                          // Handle checkboxes in task lists
                          if (props.type === 'checkbox') {
                            return (
                              <input
                                type="checkbox"
                                disabled={props.disabled}
                                checked={props.checked}
                                className="mr-2 align-middle"
                                {...props}
                              />
                            );
                          }
                          return <input {...props} />;
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
                {message.role === "assistant" && message.metadata?.generation_time_sec && (
                  <div className="text-xs text-muted-foreground px-2">
                    Generated in {message.metadata.generation_time_sec}s
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto space-y-2">
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
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('placeholder')}
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
