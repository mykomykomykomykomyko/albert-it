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
                     location.pathname.startsWith('/canvas') ? 'canvas' :
                     location.pathname.startsWith('/image') ? 'image' :
                     location.pathname.startsWith('/voice') ? 'voice' : 'chat';

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle('light', initialTheme === 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const handleSignOut = () => {
    // Bypass server signOut - just clear local storage directly
    localStorage.removeItem('sb-yxoyugnvklqepvlujmjn-auth-token');
    localStorage.clear(); // Clear all local storage to be safe
    
    // Manually trigger auth state change
    window.dispatchEvent(new Event('storage'));
    
    toast.success("Signed out successfully");
    navigate("/");
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
              onClick={() => navigate('/image')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'image' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => navigate('/voice')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'voice' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              Voice
            </button>
            <button
              disabled
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
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
