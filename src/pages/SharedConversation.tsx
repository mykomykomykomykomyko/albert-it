import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  image_url?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
  model?: string;
}

export default function SharedConversation() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    const fetchSharedConversation = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // Fetch conversation by share_token
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('share_token', shareToken)
          .eq('is_shared', true)
          .single();

        if (conversationError || !conversationData) {
          console.error('Error fetching conversation:', conversationError);
          setError('This conversation is not available or has been unshared');
          setLoading(false);
          return;
        }

        setConversation(conversationData);

        // Fetch messages for this conversation
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationData.id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          setError('Failed to load messages');
          setLoading(false);
          return;
        }

        setMessages(messagesData as Message[] || []);
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConversation();
  }, [shareToken]);

  const handleContinueConversation = async () => {
    if (!user) {
      toast.error('Please sign in to continue this conversation');
      navigate('/auth');
      return;
    }

    if (!conversation || messages.length === 0) {
      toast.error('No conversation to continue');
      return;
    }

    setIsContinuing(true);
    try {
      // Create a new conversation in user's workspace
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `${conversation.title} (continued)`,
          model: conversation.model || 'google/gemini-2.5-flash'
        })
        .select()
        .single();

      if (convError || !newConversation) {
        console.error('Error creating conversation:', convError);
        toast.error('Failed to create new conversation');
        setIsContinuing(false);
        return;
      }

      // Copy all messages to the new conversation
      const messagesToCopy = messages.map(msg => ({
        conversation_id: newConversation.id,
        role: msg.role,
        content: msg.content,
        image_url: msg.image_url,
        created_at: new Date().toISOString()
      }));

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messagesToCopy);

      if (messagesError) {
        console.error('Error copying messages:', messagesError);
        toast.error('Failed to copy messages');
        setIsContinuing(false);
        return;
      }

      toast.success('Conversation copied to your workspace!');
      navigate(`/chat/${newConversation.id}`);
    } catch (err) {
      console.error('Error continuing conversation:', err);
      toast.error('Failed to continue conversation');
    } finally {
      setIsContinuing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Conversation Not Found</h1>
          <p className="text-muted-foreground">
            {error || 'This conversation may have been deleted or is no longer shared.'}
          </p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{conversation.title}</h1>
              <p className="text-sm text-muted-foreground">Shared Conversation</p>
            </div>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button 
                onClick={handleContinueConversation} 
                variant="default"
                disabled={isContinuing}
              >
                {isContinuing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    Continue Conversation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="default">
                Sign In to Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages in this conversation yet.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      A
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-4 py-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Attached"
                      className="rounded-md mb-2 max-w-full h-auto"
                    />
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      U
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-card border-t border-border px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">
          This is a read-only view of a shared conversation.{' '}
          {user ? (
            <button
              onClick={handleContinueConversation}
              className="text-primary hover:underline font-medium"
              disabled={isContinuing}
            >
              {isContinuing ? 'Copying conversation...' : 'Continue this conversation'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-medium"
            >
              Sign in to continue
            </button>
          )}
        </p>
      </footer>
    </div>
  );
}
