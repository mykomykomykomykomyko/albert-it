import { Moon, Sun, Home, LogOut, Menu, X, HelpCircle, BookOpen, Library } from 'lucide-react';
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
import { HelpModal } from '@/components/workflow/stage/HelpModal';

export function ChatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const currentTab = location.pathname.startsWith('/agents') ? 'agents' :
                     location.pathname.startsWith('/chat') ? 'chat' :
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

  const navItems = [
    { name: 'Agents', path: '/agents', value: 'agents' },
    { name: 'Chat', path: '/chat', value: 'chat' },
    { name: 'Stage', path: '/stage', value: 'stage' },
    { name: 'Image', path: '/image', value: 'image' },
    { name: 'Voice', path: '/voice', value: 'voice' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
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
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === item.value
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                }`}
              >
                {item.name}
              </button>
            ))}
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
            onClick={() => navigate('/prompts')}
            title="Prompt Library"
            className="hover:bg-accent"
          >
            <Library className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/framework')}
            title="Framework Library"
            className="hover:bg-accent"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpOpen(true)}
            title="Help"
            className="hover:bg-accent"
          >
            <HelpCircle className="h-5 w-5" />
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

        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
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
              <Button
                disabled
                variant="ghost"
                className="justify-start opacity-50"
              >
                Canvas
              </Button>
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
                <BookOpen className="h-4 w-4 mr-2" />
                Framework Library
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setHelpOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
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
      
      {/* Help Modal - Only show on /stage route */}
      {location.pathname === '/stage' && (
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      )}
    </header>
  );
}
