import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Zap, Shield, Moon, Sun, Bot, Workflow, Image as ImageIcon, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MigrationButton } from "@/components/MigrationButton";
const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['landing', 'common']);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/chat");
      }
    });

    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('light', initialTheme === 'light');
  }, [navigate]);
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };
  return <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border backdrop-blur-sm bg-card/50 fixed w-full z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-effect">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gradient">Albert</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              title={t('common:aria.switchTheme', { mode: t(`common:theme.${theme === 'dark' ? 'light' : 'dark'}`) })}
              aria-label={t('common:aria.switchTheme', { mode: t(`common:theme.${theme === 'dark' ? 'light' : 'dark'}`) })}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Button onClick={() => navigate("/auth")} variant="outline" size="sm" className="text-xs sm:text-sm">
              {t('common:buttons.signIn')}
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-16 sm:pt-20">
        <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sm:mb-8">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm text-primary">{t('landing:hero.badge')}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6">
              {t('landing:hero.title')}{" "}
              <span className="text-gradient">{t('landing:hero.titleHighlight')}</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto">
              {t('landing:hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="glow-effect text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto">
                {t('landing:hero.cta')}
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto">
                {t('landing:hero.learnMore')}
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            {t('landing:features.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.chat.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.chat.description')}
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.agents.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.agents.description')}
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.stage.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.stage.description')}
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.imageAnalysis.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.imageAnalysis.description')}
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.voiceProcessing.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.voiceProcessing.description')}
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing:features.securePrivate.title')}</h3>
              <p className="text-muted-foreground">
                {t('landing:features.securePrivate.description')}
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto bg-primary/10 border border-primary/20 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-6">{t('landing:cta.title')}</h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('landing:cta.subtitle')}
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="glow-effect text-lg h-14 px-8">
              {t('landing:cta.button')}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-20 bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 Government of Alberta. All rights reserved.</p>
            {/* <MigrationButton /> */}
          </div>
        </div>
      </footer>
    </div>;
};
const Sparkles = ({
  className
}: {
  className?: string;
}) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18M6.5 6.5l11 11M6.5 17.5l11-11" />
  </svg>;
export default Landing;