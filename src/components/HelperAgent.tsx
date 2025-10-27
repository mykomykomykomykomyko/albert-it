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

  // Common questions based on context - comprehensive guide for all pages
  const quickQuestions: Record<string, string[]> = {
    'Home Dashboard': [
      'What features are available on this platform?',
      'How do I get started with my first project?',
      'Where can I find the main tools?',
    ],
    'AI Chat': [
      'How do I switch between different agents?',
      'Can I upload files during conversations?',
      'How do I use tools like web search and image generation?',
    ],
    'Agent Management': [
      'How do I create a custom agent?',
      'What are best practices for system prompts?',
      'How can I test my agent before saving?',
    ],
    'Agent Marketplace': [
      'How do I find agents for specific tasks?',
      'Can I modify agents from the marketplace?',
      'How do I clone an agent?',
    ],
    'Prompt Library': [
      'What types of prompts are available?',
      'How do I use a prompt template?',
      'Can I save my own prompts?',
    ],
    'Prompt Frameworks': [
      'What are prompt frameworks?',
      'Which framework should I use for my task?',
      'How do I apply a framework to my prompts?',
    ],
    'Stage Workflow Builder': [
      'What are stages in a workflow?',
      'How do I connect agents between stages?',
      'How can I use variables like {input} and {prompt}?',
    ],
    'Canvas Workflow Builder': [
      'What are the different node types?',
      'How do I create branches in my workflow?',
      'How do I debug workflow execution?',
    ],
    'Workflow Marketplace': [
      'How do I find workflows for my use case?',
      'What\'s the difference between Canvas and Stage workflows?',
      'Can I customize cloned workflows?',
    ],
    'Image Analysis': [
      'What can I analyze in images?',
      'How does OCR extraction work?',
      'Can I process multiple images at once?',
    ],
    'Voice Analysis': [
      'How do I convert speech to text?',
      'What voice models are available?',
      'Can I generate custom voices?',
    ],
    'Meeting Transcripts': [
      'How do I upload meeting transcripts?',
      'Can I extract action items automatically?',
      'What formats are supported?',
    ],
    'Platform Navigation': [
      'How do I navigate between features?',
      'What can this platform do?',
      'Where can I find examples and tutorials?',
    ],
  };

  const contextQuestions = context ? (quickQuestions[context] || quickQuestions['Platform Navigation']) : quickQuestions['Platform Navigation'];

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

    // Add placeholder assistant message
    const assistantId = Date.now().toString();
    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Build comprehensive system prompt with context-specific knowledge
      const contextInfo: Record<string, string> = {
        'Home Dashboard': 'Users can access all platform features: AI Chat, Agent Management, Prompt Library, Workflow Builders (Stage & Canvas), Image Analysis, Voice Analysis, and Meeting Transcripts.',
        'AI Chat': 'Interactive chat with AI agents. Users can switch agents, upload files (PDFs, images, documents), use tools (web search, image generation, API calls), and export conversations.',
        'Agent Management': 'Create custom AI agents with unique system prompts, personalities, and configurations. Agents can be saved, shared to marketplace, and reused across workflows.',
        'Agent Marketplace': 'Browse community-created agents. Users can filter by category, clone agents to customize, and find pre-built solutions for common tasks.',
        'Prompt Library': 'Collection of proven prompts organized by category. Users can search, filter, use templates directly, and save their own successful prompts.',
        'Prompt Frameworks': 'Structured approaches to prompting: RISE (Role, Input, Steps, Expectation), CREATE (Context, Role, Elaborate, Ask, Tone, Explain), CARE (Context, Action, Result, Example), etc.',
        'Stage Workflow Builder': 'Sequential multi-stage workflows. Each stage contains agents/functions that execute in order. Supports variables: {prompt} (global input), {input} (previous node output). Connections determine data flow.',
        'Canvas Workflow Builder': 'Visual workflow builder with drag-and-drop nodes: Input nodes (provide data), Agent nodes (AI processing), Function nodes (logic/transforms), Join nodes (merge outputs), Output nodes (display results). Supports parallel execution and complex branching.',
        'Workflow Marketplace': 'Pre-built workflows for common use cases. Canvas workflows (visual) and Stage workflows (sequential) serve different needs. Users can clone and customize any workflow.',
        'Image Analysis': 'Upload images for AI analysis. Features: OCR text extraction, object detection, visual Q&A, batch processing. Supports PDF images and multiple formats.',
        'Voice Analysis': 'Speech-to-Text: Convert audio to text transcripts. Text-to-Speech: Generate natural-sounding voices. Supports multiple languages and voice models from ElevenLabs.',
        'Meeting Transcripts': 'Process meeting recordings or transcripts. Extract action items, generate summaries, identify key decisions, and format outputs for documentation.',
        'Platform Navigation': 'Albert is an AI workflow and agent platform. Main features: conversational AI, custom agents, visual workflows, document processing, voice processing, and collaboration tools.'
      };

      const systemPrompt = `You are a helpful AI assistant for Albert, an AI workflow and agent platform. You help users understand features, solve problems, and learn best practices.

**Current Context:** ${context || 'Platform Navigation'}
${contextInfo[context || 'Platform Navigation'] || ''}

**Available Prompt Frameworks:**
${frameworks.map(f => `- **${f.name}**: ${f.description || ''}`).join('\n')}

**Your Role:**
- Explain features clearly and concisely
- Provide step-by-step guidance when needed
- Reference relevant frameworks and best practices
- Help troubleshoot issues
- Suggest alternative approaches
- Use markdown for better readability
- Keep responses under 400 words
- Be encouraging and supportive

**Platform Capabilities:**
- **Agents**: Custom AI with unique prompts and personalities
- **Workflows**: Visual (Canvas) and sequential (Stage) multi-agent processes
- **Tools**: Web search, image generation, API calls, file processing
- **Analysis**: Image OCR, voice transcription, document processing
- **Collaboration**: Share agents and workflows with community

Answer the user's question based on the current context.`;

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Stream the response using Gemini API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: textToSend,
            systemPrompt,
            messageHistory: messages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      // Process streaming response from Gemini
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.error) {
                    const errMsg = `Gemini error: ${data.error}`;
                    accumulatedContent = errMsg;
                    toast.error(errMsg);
                    setMessages(prev => 
                      prev.map((msg, idx) => 
                        idx === prev.length - 1 
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                  } else if (data.text) {
                    accumulatedContent += data.text;
                    setMessages(prev => 
                      prev.map((msg, idx) => 
                        idx === prev.length - 1 
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response');
      setMessages(prev => 
        prev.map((msg, idx) => 
          idx === prev.length - 1 
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
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
