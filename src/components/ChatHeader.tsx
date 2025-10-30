import { Moon, Sun, Home, LogOut, Menu, HelpCircle, BookOpen, Library, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AccessibilityPreferences } from '@/components/AccessibilityPreferences';

export function ChatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTab = location.pathname.startsWith('/agents') ? 'agents' :
                     location.pathname.startsWith('/chat') ? 'chat' :
                     location.pathname.startsWith('/stage') ? 'stage' :
                     location.pathname.startsWith('/canvas') ? 'canvas' :
                     location.pathname.startsWith('/transcripts') ? 'transcripts' :
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

  const navItems = [
    { name: 'Agents', path: '/agents', value: 'agents' },
    { name: 'Agent Marketplace', path: '/marketplace', value: 'marketplace' },
    { name: 'Chat', path: '/chat', value: 'chat' },
    { name: 'Stage', path: '/stage', value: 'stage' },
    { name: 'Canvas', path: '/canvas', value: 'canvas' },
    { name: 'Workflow Marketplace', path: '/workflow-marketplace', value: 'workflow-marketplace' },
    { name: 'Meeting Transcripts', path: '/transcripts', value: 'transcripts' },
    { name: 'Image', path: '/image', value: 'image' },
    { name: 'Voice', path: '/voice', value: 'voice' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const openDocs = () => {
    navigate('/docs');
    setMobileMenuOpen(false);
  };

  const openHelperAgent = () => {
    // Dispatch custom event to open the GlobalHelperAgent
    window.dispatchEvent(new Event('openHelperAgent'));
    setMobileMenuOpen(false);
  };

  return (
    <header className="flex-shrink-0 bg-card border-b border-border px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4 max-w-full min-w-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 min-w-fit"
        >
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">Albert</h1>
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary flex-shrink-0 overflow-x-auto scrollbar-hide max-w-3xl">
            <button
              onClick={() => navigate('/agents')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'agents'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => navigate('/chat')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'chat'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => navigate('/stage')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'stage'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Stage
            </button>
            <button
              onClick={() => navigate('/image')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'image'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => navigate('/voice')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'voice'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => navigate('/canvas')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'canvas'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => navigate('/transcripts')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'transcripts'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary-foreground hover:bg-accent'
              }`}
            >
              Transcripts
            </button>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Go to Home"
            className="hover:bg-accent text-foreground"
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/prompts')}
            title="Prompt Library"
            className="hover:bg-accent text-foreground"
          >
            <Library className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/framework')}
            title="Framework Library"
            className="hover:bg-accent text-foreground"
          >
            <Layers className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openDocs}
            title="Documentation & Training"
            className="hover:bg-accent text-foreground"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
          <AccessibilityPreferences />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="hover:bg-accent text-foreground"
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
            className="hover:bg-accent text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          </div>
        </div>

        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              {navItems.map((item) => (
                <Button
                  key={item.value}
                  variant={currentTab === item.value ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => handleNavClick(item.path)}
                >
                  {item.name}
                </Button>
              ))}
              <div className="border-t border-border my-2" />
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick('/')}
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick('/prompts')}
              >
                <Library className="h-4 w-4 mr-2" />
                Prompt Library
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick('/framework')}
              >
                <Layers className="h-4 w-4 mr-2" />
                Framework Library
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={openDocs}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Documentation
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
