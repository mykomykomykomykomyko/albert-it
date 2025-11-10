import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Search } from "lucide-react";
import { Conversation, Message, ChatMessage } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Toggle } from "@/components/ui/toggle";

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
  const [model, setModel] = useState(conversation?.model || "google/gemini-2.5-flash");
  const [perplexitySearchEnabled, setPerplexitySearchEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation) {
      setModel(conversation.model);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
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

      // If Perplexity search is enabled, fetch search results first
      if (perplexitySearchEnabled) {
        try {
          const { data: searchData, error: searchError } = await supabase.functions.invoke(
            "perplexity-search",
            {
              body: { query: userMessage },
            }
          );

          if (searchError) throw searchError;

          if (searchData?.answer) {
            // Perplexity returns a direct answer, not results array
            enhancedMessage = `[User Question]: ${userMessage}\n\n[Perplexity AI Search Result]:\n${searchData.answer}\n\nPlease answer the user's question using the search result above as context. This is real-time information from Perplexity AI.`;
            
            toast.success(`Found current information from Perplexity AI`);
          }
        } catch (searchErr) {
          console.error("Perplexity search error:", searchErr);
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
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", conversation.id);
        onConversationUpdate({ ...conversation, title });
      }

      // Prepare messages for API (use enhanced message for last user message if search was used)
      const chatMessages: ChatMessage[] = updatedMessages.map((msg, idx) => ({
        role: msg.role,
        content: idx === updatedMessages.length - 1 && perplexitySearchEnabled ? enhancedMessage : msg.content,
      }));

      // Stream response
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";
      let streamDone = false;

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

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const updatedFinalMessages = finalMessages.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: assistantContent }
                  : msg
              );
              onMessagesUpdate(updatedFinalMessages);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final assistant message
      await supabase
        .from("messages")
        .update({ content: assistantContent })
        .eq("id", assistantMessage.id);

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message");
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
      <div className="p-4 border-b border-border bg-card/30 backdrop-blur-sm flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{conversation.title}</h2>
          <p className="text-xs text-muted-foreground">
            {messages.length} {messages.length === 1 ? t('message') : t('messages')}
          </p>
        </div>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
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
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
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
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center gap-2">
            <Toggle
              pressed={perplexitySearchEnabled}
              onPressedChange={setPerplexitySearchEnabled}
              aria-label="Toggle Perplexity search for real-time information"
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              {perplexitySearchEnabled ? "Perplexity: ON" : "Perplexity: OFF"}
            </Toggle>
            {perplexitySearchEnabled && (
              <span className="text-xs text-muted-foreground">
                Searches the web with Perplexity AI
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
