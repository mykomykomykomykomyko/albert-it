import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Brain, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
// import { LanguageToggle } from "@/components/LanguageToggle";

// Retry utility with exponential backoff
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth failures (invalid credentials, already registered, expired tokens)
      if (error.message?.includes('already registered') || 
          error.message?.includes('Invalid login credentials') ||
          error.message?.includes('Invalid') ||
          error.message?.includes('expired')) {
        throw error;
      }
      
      // DO retry on 503 service unavailable and connection errors (transient)
      const is503Error = error.status === 503 || 
                         error.statusCode === 503 || 
                         error.message?.includes('503') || 
                         error.message?.includes('upstream connect error') ||
                         error.message?.includes('connection failure');
      
      // Wait with exponential backoff before retrying
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Auth] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms${is503Error ? ' (503 error)' : ''}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};

// Normalize unknown auth error shapes into readable strings
const formatAuthError = (err: any): string => {
  if (!err) return 'Service temporarily unavailable. Please try again in a few moments.';
  if (typeof err === 'string') {
    // Check for 503 or connection errors
    if (err.includes('503') || err.includes('upstream connect error') || err.includes('connection failure')) {
      return 'Authentication service is temporarily unavailable. Please try again in a few moments.';
    }
    return err;
  }
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('503') || err.message.includes('upstream connect error') || err.message.includes('connection failure')) {
      return 'Authentication service is temporarily unavailable. Please try again in a few moments.';
    }
    return err.message;
  }
  if (err.error_description && typeof err.error_description === 'string') return err.error_description;
  if (err.error && typeof err.error === 'string') return err.error;
  
  // Check status code
  if (err.status === 503 || err.statusCode === 503) {
    return 'Authentication service is temporarily unavailable. Please try again in a few moments.';
  }
  
  // Try to stringify, but check for empty or useless results
  try {
    const s = JSON.stringify(err);
    // If JSON.stringify returns empty object or just whitespace, use fallback
    if (!s || s.trim() === '{}' || s.trim() === '' || s === '{}') {
      return 'Service temporarily unavailable. Please try again in a few moments.';
    }
    return s;
  } catch {
    return 'Service temporarily unavailable. Please try again in a few moments.';
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [recoveryEstimate, setRecoveryEstimate] = useState<string>("");
  const [serviceDownStartTime, setServiceDownStartTime] = useState<number | null>(null);
  const isSubmitting = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Health check function to detect service recovery
  const checkServiceHealth = async () => {
    try {
      console.log('[Auth] Checking service health...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const healthUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
      const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        console.log('[Auth] Service health OK');
        setServiceDown(false);
        setServiceDownStartTime(null);
        setRecoveryEstimate("");

        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }

        toast.success("Service has been restored! You can now sign in.");
        return true;
      }

      console.log('[Auth] Health endpoint not OK:', res.status);
      return false;
    } catch (error) {
      console.log('[Auth] Service still unavailable (health check failed):', error);
      return false;
    }
  };

  // Update recovery estimate dynamically based on elapsed time
  const updateRecoveryEstimate = () => {
    if (!serviceDownStartTime) return;
    
    const elapsedMinutes = Math.floor((Date.now() - serviceDownStartTime) / 1000 / 60);
    
    if (elapsedMinutes < 10) {
      setRecoveryEstimate("15-25 minutes");
    } else if (elapsedMinutes < 20) {
      setRecoveryEstimate("10-15 minutes (service recovering...)");
    } else if (elapsedMinutes < 25) {
      setRecoveryEstimate("5-10 minutes (almost ready...)");
    } else {
      setRecoveryEstimate("shortly (service should be available any moment)");
    }
  };

  // Poll for service recovery when service is down
  useEffect(() => {
    if (serviceDown) {
      console.log('[Auth] Starting health check polling (every 30 seconds)');
      
      // Update recovery estimate immediately
      updateRecoveryEstimate();
      
      // Set up polling interval
      healthCheckIntervalRef.current = setInterval(() => {
        checkServiceHealth();
        updateRecoveryEstimate();
      }, 30000); // Check every 30 seconds
      
      return () => {
        if (healthCheckIntervalRef.current) {
          console.log('[Auth] Clearing health check interval');
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }
      };
    }
  }, [serviceDown, serviceDownStartTime]);

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user needs to change password
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', session.user.id)
          .single();

        if (profile?.must_change_password) {
          navigate("/force-password-change");
        } else {
          navigate("/chat");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Synchronous state updates only to avoid deadlocks
      console.log('[Auth] onAuthStateChange:', event);

      if (event === 'SIGNED_OUT') {
        if (window.location.pathname !== '/auth') navigate('/auth');
        return;
      }

      if (session && event === 'SIGNED_IN') {
        // Defer any Supabase calls to avoid blocking the auth callback
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('must_change_password')
              .eq('id', session.user.id)
              .single();

            if (profile?.must_change_password) {
              navigate('/force-password-change');
            } else {
              navigate('/chat');
            }
          } catch (e) {
            console.error('[Auth] post-login profile check failed:', e);
            navigate('/chat');
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting.current || loading) {
      return;
    }
    
    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      // Validate access code first
      if (!accessCode.trim()) {
        setError("Access code is required");
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

      // Use retry logic for access code validation
      const isValid = await retryWithBackoff(async () => {
        const { data, error: validationError } = await supabase.rpc('validate_access_code', {
          code_input: accessCode.trim().toUpperCase()
        });

        if (validationError) {
          throw new Error("Failed to validate access code. Please try again.");
        }

        return data;
      }, 3, 500);

      if (!isValid) {
        setError("Invalid or expired access code. Please contact Alberta AI Academy.");
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

      // Use retry logic for signup with exponential backoff
      await retryWithBackoff(async () => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          // Check for specific error types
          if (error.message.includes('already registered')) {
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }
      }, 3, 1000);

      // Increment usage count (don't retry if this fails, it's not critical)
      try {
        await supabase.rpc('increment_access_code_usage', {
          code_input: accessCode.trim().toUpperCase()
        });
      } catch (usageError) {
        console.error('Failed to increment usage count:', usageError);
        // Continue anyway - user is registered
      }

      toast.success("Account created successfully! You can now sign in.");
      setEmail("");
      setPassword("");
      setFullName("");
      setAccessCode("");
      setError(null);
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      
      // Check for 503 service unavailable
      if (error?.status === 503 || error?.statusCode === 503 || 
          errorMessage.includes('503') || errorMessage.includes('upstream connect error')) {
        setServiceDown(true);
        setServiceDownStartTime(Date.now());
        setRecoveryEstimate("15-25 minutes");
        toast.error("Service is temporarily unavailable. Please wait 15-25 minutes.");
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        toast.error("Too many signup attempts. Please wait a moment and try again.");
      } else if (errorMessage.toLowerCase().includes('network')) {
        toast.error("Network error. Please check your connection and try again.");
      }
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting.current || loading) {
      return;
    }
    
    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      // Use retry logic for sign in
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Don't retry for invalid credentials
          if (error.message.includes('Invalid login credentials')) {
            throw new Error("Invalid email or password");
          }
          throw error;
        }
        
        return data;
      }, 3, 1000);

      toast.success("Signed in successfully!");
      // Note: onAuthStateChange will handle navigation and password check
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      
      // Check for 503 service unavailable
      if (error?.status === 503 || error?.statusCode === 503 || 
          errorMessage.includes('503') || errorMessage.includes('upstream connect error')) {
        setServiceDown(true);
        setServiceDownStartTime(Date.now());
        setRecoveryEstimate("15-25 minutes");
        toast.error("Service is temporarily unavailable. Please wait 15-25 minutes.");
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        toast.error("Too many login attempts. Please wait a moment and try again.");
      }
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before sending
    if (!resetEmail || !resetEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password-otp`,
      });

      if (error) throw error;
      
      toast.success("Verification code sent! Check your email and go to the reset page.");
      setResetDialogOpen(false);
      setResetEmail("");
      
      // Navigate to OTP page after a short delay
      setTimeout(() => {
        navigate("/reset-password-otp");
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "An error occurred while sending reset code");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div> */}
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 glow-effect">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Albert</h1>
          <p className="text-muted-foreground">Government of Alberta AI Assistant</p>
        </div>

        {serviceDown && (
          <Alert variant="destructive" className="mb-6 border-2 border-destructive bg-destructive/10">
            <Info className="h-5 w-5" />
            <div className="ml-2">
              <div className="font-semibold text-lg">Service Temporarily Unavailable</div>
              <AlertDescription className="mt-2">
                Our authentication service is experiencing technical difficulties. 
                The system is being restarted and should be available in approximately{" "}
                <span className="font-bold">{recoveryEstimate}</span>.
                <br />
                <br />
                <span className="text-sm mt-1 block font-semibold">
                  In the meantime, please use our temporary website:{" "}
                  <a 
                    href="https://albert-temporary.lovable.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    albert-temporary.lovable.app
                  </a>
                </span>
                <span className="text-sm mt-1 block">
                  Please register an account there to continue using the service.
                </span>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t('auth:signIn.title')}</CardTitle>
            <CardDescription className="text-muted-foreground">{t('auth:signIn.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted">
                <TabsTrigger value="signin">{t('common:buttons.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth:signUp.button')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-foreground">{t('auth:signIn.email')}</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="bg-background text-foreground border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-foreground">{t('auth:signIn.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="bg-background text-foreground border-input pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      t('auth:signIn.button')
                    )}
                  </Button>
                  <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="link" className="w-full text-sm text-muted-foreground hover:text-primary">
                        {t('auth:signIn.forgotPassword')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">{t('auth:resetPassword.title')}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          {t('auth:resetPassword.subtitle')}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-foreground">{t('auth:resetPassword.email')}</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="you@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className="bg-background text-foreground border-input"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={resetLoading}>
                          {resetLoading ? "Sending..." : t('auth:resetPassword.button')}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      className="bg-background text-foreground border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground">{t('auth:signUp.email')}</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="bg-background text-foreground border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground">{t('auth:signUp.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="bg-background text-foreground border-input pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access-code" className="text-foreground">
                      Access Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="access-code"
                      type="text"
                      placeholder="Enter your access code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      required
                      className="bg-background text-foreground border-input"
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground">
                      Access code is required for Alberta AI Academy participants
                    </p>
                  </div>
                  <Alert className="bg-muted/50 border-border">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm text-muted-foreground">
                      The personal information collected through Albert for the purpose of registering for an account. This collection is authorized by section 4 (c) of the Protection of Privacy Act. For questions about the collection of personal information, contact <a href="mailto:aiacademy@gov.ab.ca" className="text-primary hover:underline">aiacademy@gov.ab.ca</a>.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      t('auth:signUp.button')
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
