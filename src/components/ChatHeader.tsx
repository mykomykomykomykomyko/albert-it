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
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

export function ChatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
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
    { name: t('navigation.chat'), path: '/chat', value: 'chat' },
    { name: t('navigation.agents'), path: '/agents', value: 'agents' },
    { name: t('navigation.marketplace'), path: '/marketplace', value: 'marketplace' },
    { name: t('navigation.stage'), path: '/stage', value: 'stage' },
    { name: t('navigation.canvas'), path: '/canvas', value: 'canvas' },
    { name: t('navigation.workflowMarketplace'), path: '/workflow-marketplace', value: 'workflow-marketplace' },
    { name: t('navigation.transcripts'), path: '/transcripts', value: 'transcripts' },
    { name: t('navigation.imageAnalysis'), path: '/image', value: 'image' },
    { name: t('navigation.voiceAnalysis'), path: '/voice', value: 'voice' },
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
    <header className="flex-shrink-0 bg-card border-b border-border px-3 sm:px-4 py-2.5">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-full min-w-0 overflow-hidden">
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
        <div className="hidden lg:flex items-center gap-1.5 ml-auto overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary flex-shrink-0">
            <button
              onClick={() => navigate('/chat')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'chat'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.chat')}
            </button>
            <button
              onClick={() => navigate('/agents')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'agents'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.agents')}
            </button>
            <button
              onClick={() => navigate('/marketplace')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                location.pathname.startsWith('/marketplace')
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.marketplace')}
            </button>
            <button
              onClick={() => navigate('/stage')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'stage'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.stage')}
            </button>
            <button
              onClick={() => navigate('/canvas')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'canvas'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.canvas')}
            </button>
            <button
              onClick={() => navigate('/workflow-marketplace')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                location.pathname.startsWith('/workflow-marketplace')
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.workflowMarketplace')}
            </button>
            <button
              onClick={() => navigate('/transcripts')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'transcripts'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.transcripts')}
            </button>
            <button
              onClick={() => navigate('/image')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'image'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.imageAnalysis')}
            </button>
            <button
              onClick={() => navigate('/voice')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentTab === 'voice'
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {t('navigation.voiceAnalysis')}
            </button>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Go to Home"
            aria-label="Go to Home"
            className="hover:bg-accent text-foreground h-8 w-8"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/prompts')}
            title="Prompt Library"
            aria-label="Prompt Library"
            className="hover:bg-accent text-foreground h-8 w-8"
          >
            <Library className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/framework')}
            title="Framework Library"
            aria-label="Framework Library"
            className="hover:bg-accent text-foreground h-8 w-8"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openDocs}
            title="Documentation & Training"
            aria-label="Documentation & Training"
            className="hover:bg-accent text-foreground h-8 w-8"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <AccessibilityPreferences />
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={t('aria.switchTheme', { mode: t(`theme.${theme === 'dark' ? 'light' : 'dark'}`) })}
            aria-label={t('aria.switchTheme', { mode: t(`theme.${theme === 'dark' ? 'light' : 'dark'}`) })}
            className="hover:bg-accent text-foreground h-8 w-8"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
          )}
        </Button>
        
        {/* User Profile Menu */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-1.5 hover:bg-accent px-1.5 h-8 min-w-0"
              >
                <Avatar className="h-7 w-7 border-2 border-primary flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden 2xl:flex flex-col items-start min-w-0 max-w-[120px]">
                  <span className="text-xs font-medium truncate w-full text-foreground">
                    {user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">
                    {user?.email || 'No email'}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
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
                className="cursor-pointer flex items-center justify-between"
              >
                <span>{t('language.en')} / {t('language.fr')}</span>
                <LanguageToggle variant="ghost" showIcon={false} showFullText={false} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('buttons.signOut')}</span>
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
          <SheetContent side="right" className="w-64 flex flex-col">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            {/* User Profile Section in Mobile */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary mt-6 flex-shrink-0">
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
            
            <div className="flex flex-col gap-2 mt-4 overflow-y-auto flex-1">
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
                {t('navigation.home')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick('/prompts')}
              >
                <Library className="h-4 w-4 mr-2" />
                {t('navigation.prompts')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick('/framework')}
              >
                <Layers className="h-4 w-4 mr-2" />
                {t('navigation.framework')}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={openDocs}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {t('navigation.docs')}
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
                    {t('theme.light')}
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    {t('theme.dark')}
                  </>
                )}
              </Button>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm">{t('language.en')} / {t('language.fr')}</span>
                <LanguageToggle variant="ghost" showIcon={false} showFullText={false} />
              </div>
              <Button
                variant="ghost"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('buttons.signOut')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
