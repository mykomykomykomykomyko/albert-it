import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Send, Sparkles, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useFrameworks } from '@/hooks/useFrameworks';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface HelperAgentProps {
  context?: string; // Current page/feature context
  onClose: () => void;
}

export function HelperAgent({ context, onClose }: HelperAgentProps) {
  const { frameworks, loading: frameworksLoading } = useFrameworks();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Common questions based on context
  const quickQuestions = {
    agents: [
      'How do I create an effective agent?',
      'What are best practices for system prompts?',
      'How can I share my agents with others?',
    ],
    workflows: [
      'How do I connect multiple agents?',
      'What are the different node types?',
      'How can I debug workflow execution?',
    ],
    prompts: [
      'What makes a good prompt?',
      'How do I use variables in prompts?',
      'What frameworks should I use?',
    ],
    general: [
      'How do I get started?',
      'What can this platform do?',
      'Where can I find examples?',
    ],
  };

  const contextQuestions = context ? (quickQuestions[context as keyof typeof quickQuestions] || quickQuestions.general) : quickQuestions.general;

  useEffect(() => {
    // Initial greeting
    const greeting = context
      ? `Hi! I'm your AI helper for ${context}. Ask me anything or choose a question below.`
      : 'Hi! I\'m your AI helper. Ask me anything about the platform or choose a question below.';
    
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [context]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build system prompt with framework knowledge
      let systemPrompt = `You are a helpful AI assistant for the Albert platform. You help users understand features and best practices.

Context: ${context || 'general platform usage'}

Available Frameworks:
${frameworks.map(f => `- ${f.name}: ${f.description || ''}`).join('\n')}

Instructions:
- Be concise and helpful
- Reference specific frameworks when relevant
- Provide actionable advice
- Use markdown for formatting
- Keep responses under 300 words`;

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: textToSend,
          systemPrompt,
          messageHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response');
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <Card className="w-full max-w-md h-[600px] flex flex-col pointer-events-auto shadow-2xl">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Helper</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {context && (
            <Badge variant="secondary" className="w-fit">
              {context}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2">
              {contextQuestions.map((question, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
