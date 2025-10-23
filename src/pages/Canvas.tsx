import { ChatHeader } from "@/components/ChatHeader";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Canvas = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    // Check auth and listen for changes
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Canvas</h1>
          <p className="text-muted-foreground">Visual workflow canvas coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
