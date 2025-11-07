import { Moon, Sun, Home, LogOut, Menu, HelpCircle, BookOpen, Library, Layers, User, ChevronDown, Share2, MessageSquare, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AccessibilityPreferences } from '@/components/AccessibilityPreferences';
import { useAuth } from '@/hooks/useAuth';

export function ChatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

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
    { name: 'Chat', path: '/chat', value: 'chat' },
    { name: 'Agents', path: '/agents', value: 'agents' },
    { name: 'Agent Marketplace', path: '/marketplace', value: 'marketplace' },
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
      <div className="flex items-center justify-between gap-8 max-w-full min-w-0">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 min-w-0"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">Albert</h1>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-4 font-medium bg-muted/50 text-muted-foreground border-0"
              >
                BETA
              </Badge>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openHelperAgent}
            title="AI Helper - Ask me anything!"
            aria-label="AI Helper - Ask me anything!"
            className="hover:bg-accent text-foreground"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://forms.office.com/Pages/ResponsePage.aspx?id=Bhy1K5uvxUKL9Tw7exCFC-ArfiIhCdZNpgqZfDSOsH1UOTdTNVI2NkVLNFZLUUExUzlFQTBHRU1QOC4u', '_blank')}
            title="Give Feedback"
            aria-label="Give Feedback"
            className="hover:bg-accent text-foreground"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary flex-shrink-0">
            <button
              onClick={() => navigate('/chat')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'chat'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => navigate('/agents')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'agents'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => navigate('/stage')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'stage'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Stage
            </button>
            <button
              onClick={() => navigate('/image')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'image'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => navigate('/voice')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'voice'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => navigate('/canvas')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'canvas'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => navigate('/transcripts')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTab === 'transcripts'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
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
            aria-label="Go to Home"
            className="hover:bg-accent text-foreground"
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/prompts')}
            title="Prompt Library"
            aria-label="Prompt Library"
            className="hover:bg-accent text-foreground"
          >
            <Library className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/framework')}
            title="Framework Library"
            aria-label="Framework Library"
            className="hover:bg-accent text-foreground"
          >
            <Layers className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/files')}
            title="File Manager"
            aria-label="File Manager"
            className="hover:bg-accent text-foreground"
          >
            <FolderOpen className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openDocs}
            title="Documentation & Training"
            aria-label="Documentation & Training"
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
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="hover:bg-accent text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 hover:bg-accent px-2"
              >
                <Avatar className="h-8 w-8 border-2 border-primary">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col items-start min-w-0 max-w-[150px]">
                  <span className="text-sm font-medium truncate w-full text-foreground">
                    {user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {user?.email || 'No email'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || 'No email'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Open menu"
              className="text-foreground flex-shrink-0 mr-1"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            {/* User Profile Section in Mobile */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary mt-6">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate text-foreground">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email || 'No email'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
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
                onClick={() => handleNavClick('/files')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                File Manager
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
