import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatInterface from "@/components/chat/ChatInterface";
import { Conversation, Message } from "@/types/chat";

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

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

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onNewConversation={handleNewConversation}
        onSelectConversation={(id) => navigate(`/chat/${id}`)}
        onDeleteConversation={handleDeleteConversation}
      />
      <ChatInterface
        conversation={currentConversation}
        messages={messages}
        onMessagesUpdate={setMessages}
        onConversationUpdate={(conv) => {
          setCurrentConversation(conv);
          loadConversations();
        }}
      />
    </div>
  );
};

export default Chat;
