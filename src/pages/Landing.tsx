import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Zap, Shield, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat");
      }
    });
    
    // Initialize theme from localStorage or system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [navigate]);

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

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/50 fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-effect">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Albert</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button onClick={() => navigate("/auth")} variant="outline">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Powered by Lovable AI</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
              Your AI Assistant from the{" "}
              <span className="text-gradient">Government of Alberta</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Experience next-generation AI capabilities with Albert. Free, secure, and designed
              specifically for Albertans.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="glow-effect text-lg h-14 px-8"
              >
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Natural Conversations</h3>
              <p className="text-muted-foreground">
                Engage in fluid, context-aware conversations with advanced AI models that
                understand your needs.
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Powered by Google's latest Gemini models for instant, accurate responses to all
                your questions.
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:shadow-glow transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your conversations are encrypted and private. Built with security and compliance in
                mind.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of Albertans already using Albert to enhance their productivity.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="glow-effect text-lg h-14 px-8">
              Create Your Free Account
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Government of Alberta. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const Sparkles = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18M3 12h18M6.5 6.5l11 11M6.5 17.5l11-11" />
  </svg>
);

export default Landing;
