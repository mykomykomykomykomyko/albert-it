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
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { parseWorkflowSuggestion } from '@/utils/parseWorkflowSuggestion';
import { WorkflowSuggestion } from '@/components/chat/WorkflowSuggestion';

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

interface Profile {
  full_name: string | null;
  email: string | null;
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
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  
  // Real-time presence for typing indicators
  const { getActiveUsers } = useConversationPresence(conversation?.id || null);
  const activeUsers = getActiveUsers();

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

        // Fetch owner profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', conversationData.user_id)
          .maybeSingle();

        if (!profileError && profileData) {
          setOwnerProfile(profileData);
        }

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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Owner Banner */}
      {ownerProfile && (
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground px-6 py-4 shadow-lg animate-fade-in">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-2">
            <Avatar className="h-6 w-6 border-2 border-primary-foreground/20">
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                {(ownerProfile.full_name || ownerProfile.email)?.[0]?.toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium">
              <span className="font-semibold">{ownerProfile.full_name || ownerProfile.email?.split('@')[0] || 'Someone'}</span> shared this conversation with you
            </p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="flex-shrink-0 bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 sm:px-6 py-6 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg ring-2 ring-primary/20">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{conversation.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Shared Conversation
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button 
                onClick={handleContinueConversation} 
                variant="default"
                disabled={isContinuing}
                className="shadow-md hover:shadow-lg transition-all"
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
              <Button onClick={() => navigate('/auth')} variant="default" className="shadow-md hover:shadow-lg transition-all">
                Sign In to Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {messages.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="text-muted-foreground text-lg">No messages in this conversation yet.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-4 animate-fade-in ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-10 w-10 flex-shrink-0 mt-1 ring-2 ring-primary/10 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground text-base font-semibold">
                      A
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-2xl px-5 py-4 max-w-[75%] shadow-sm transition-all hover:shadow-md ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                      : 'bg-card border border-border/50'
                  }`}
                >
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Attached"
                      className="rounded-xl mb-3 max-w-full h-auto shadow-sm border border-border/30"
                    />
                  )}
                  <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {parseWorkflowSuggestion(message.content).cleanContent}
                    </ReactMarkdown>
                  </div>
                  {parseWorkflowSuggestion(message.content).suggestion && (
                    <div className="mt-3">
                      <WorkflowSuggestion
                        actionType={parseWorkflowSuggestion(message.content).suggestion!.type}
                        workflowData={parseWorkflowSuggestion(message.content).suggestion!.workflow}
                        description={parseWorkflowSuggestion(message.content).suggestion!.description}
                      />
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-10 w-10 flex-shrink-0 mt-1 ring-2 ring-secondary/10 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground text-base font-semibold">
                      U
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {/* Real-time typing/thinking indicators */}
          {activeUsers.map((activeUser, idx) => (
            <div key={idx} className="flex gap-4 items-start animate-fade-in">
              {activeUser.isThinking ? (
                <>
                  <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/10 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground text-base font-semibold">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border/50 rounded-2xl px-5 py-4 max-w-[75%] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </>
              ) : activeUser.isTyping ? (
                <>
                  <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-secondary/10 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground text-base font-semibold">
                      {activeUser.userName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border/50 rounded-2xl px-5 py-4 max-w-[75%] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        <span className="font-semibold text-foreground">{activeUser.userName}</span> is typing...
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-card/80 backdrop-blur-sm border-t border-border/50 px-4 py-5 text-center shadow-sm">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              🔒 This is a read-only view of a shared conversation.
            </span>
            {' '}
            {user ? (
              <button
                onClick={handleContinueConversation}
                className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
                disabled={isContinuing}
              >
                {isContinuing ? 'Copying conversation...' : 'Continue this conversation'}
                {!isContinuing && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
              >
                Sign in to continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
