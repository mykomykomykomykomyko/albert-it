import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Zap, Shield, Moon, Sun, Bot, Workflow, Image as ImageIcon, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const Landing = () => {
  const navigate = useNavigate();
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
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="h-8 w-8 sm:h-10 sm:w-10">
              {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Button onClick={() => navigate("/auth")} variant="outline" size="sm" className="text-xs sm:text-sm">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-16 sm:pt-20">
        <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sm:mb-8">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm text-primary">Always Open Source (MIT License)</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up">
              Your AI Assistant from the{" "}
              <span className="text-gradient">Government of Alberta</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto">
              Experience next-generation AI capabilities with Albert. Free, secure, and designed
              specifically for Albertans.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="glow-effect text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 sm:py-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Powerful Features for Every Need
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Chat</h3>
              <p className="text-muted-foreground">
                Engage in natural conversations with advanced AI models. Upload files, share images, 
                and get instant, context-aware responses powered by Google's latest Gemini technology.
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Agents</h3>
              <p className="text-muted-foreground">
                Create and manage custom AI agents tailored to your specific needs. Define personalities, 
                system prompts, and tools to build specialized assistants for any task.
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Stage Workflows</h3>
              <p className="text-muted-foreground">
                Build multi-stage AI workflows by connecting agents and functions. Automate complex 
                processes, chain reasoning steps, and create sophisticated AI pipelines visually.
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Image Analysis</h3>
              <p className="text-muted-foreground">
                Upload images and PDFs for AI-powered visual analysis. Extract text, detect objects, 
                analyze content, and get intelligent insights from visual data.
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Voice Processing</h3>
              <p className="text-muted-foreground">
                Convert speech to text and text to speech with advanced voice models. Support for 
                multiple languages, natural-sounding voices, and real-time transcription.
              </p>
            </div>

            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your data is encrypted and private. Built with security and compliance in mind, 
                ensuring your conversations and information remain confidential.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto bg-primary/10 border border-primary/20 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start using Albert to enhance your productivity.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="glow-effect text-lg h-14 px-8">
              Create Your Free Account
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-20 bg-card/30">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Government of Alberta. All rights reserved.</p>
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