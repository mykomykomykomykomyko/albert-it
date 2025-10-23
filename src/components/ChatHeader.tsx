import { Moon, Sun, Home, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ChatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const currentTab = location.pathname.startsWith('/chat') ? 'chat' :
                     location.pathname.startsWith('/stage') ? 'stage' :
                     location.pathname.startsWith('/canvas') ? 'canvas' : 'chat';

  useEffect(() => {
    // Check system preference on mount
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out regardless of session state
      await supabase.auth.signOut({ scope: 'local' });
      toast.success("Signed out successfully");
    } catch (error: any) {
      // Even if there's an error, clear local state
      console.error("Sign out error:", error);
    } finally {
      // Always navigate to auth page
      navigate("/auth");
    }
  };

  return (
    <header className="flex-shrink-0 bg-card border-b border-border px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between max-w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Albert</h1>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
            <button
              onClick={() => navigate('/chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'chat' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => navigate('/stage')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'stage' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              Stage
            </button>
            <button
              onClick={() => navigate('/canvas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'canvas' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              Canvas
            </button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Go to Home"
            className="hover:bg-accent"
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="hover:bg-accent"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign Out"
            className="hover:bg-accent"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
