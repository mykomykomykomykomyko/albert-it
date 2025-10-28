import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VoiceProcessor from "@/components/voice/VoiceProcessor";
import { StandardAppLayout } from "@/components/layout/StandardAppLayout";

const VoiceAnalysis = () => {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState<React.ReactNode>(null);
  
  useEffect(() => {
    // Initialize theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    // Check auth
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
    <StandardAppLayout sidebar={sidebar} showSidebar={!!sidebar}>
      <VoiceProcessor renderSidebar={(sidebarContent) => {
        if (sidebarContent !== sidebar) {
          setSidebar(sidebarContent);
        }
        return null;
      }} />
    </StandardAppLayout>
  );
};

export default VoiceAnalysis;
