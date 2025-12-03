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
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
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
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
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

      setLastHealthCheck(new Date());

      if (res.ok) {
        console.log('[Auth] Service health OK');
        setServiceDown(false);

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
      setLastHealthCheck(new Date());
      return false;
    }
  };

  // Poll for service recovery when service is down
  useEffect(() => {
    if (serviceDown) {
      console.log('[Auth] Starting health check polling (every 30 seconds)');
      
      // Set up polling interval
      healthCheckIntervalRef.current = setInterval(() => {
        checkServiceHealth();
      }, 30000); // Check every 30 seconds
      
      return () => {
        if (healthCheckIntervalRef.current) {
          console.log('[Auth] Clearing health check interval');
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }
      };
    }
  }, [serviceDown]);

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

  // Handle Azure OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const azureCallback = urlParams.get('azure_callback');
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      console.error('[Azure Auth] OAuth error:', errorParam, errorDescription);
      setError(errorDescription || errorParam);
      window.history.replaceState({}, document.title, '/auth');
      return;
    }
    
    if (code && azureCallback === 'true') {
      console.log('[Azure Auth] Callback detected, processing code...');
      handleAzureCallback(code);
    }
  }, []);

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
      const is503 = error?.status === 503 || error?.statusCode === 503 || 
                    errorMessage.includes('503') || errorMessage.includes('upstream connect error');
      
      if (is503) {
        console.log('[Auth] 503 error during sign-up:', {
          context: 'sign-up',
          status: error?.status,
          statusCode: error?.statusCode,
          message: error?.message
        });
        setServiceDown(true);
        setLastHealthCheck(new Date());
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
      const is503 = error?.status === 503 || error?.statusCode === 503 || 
                    errorMessage.includes('503') || errorMessage.includes('upstream connect error');
      
      if (is503) {
        console.log('[Auth] 503 error during sign-in:', {
          context: 'sign-in',
          status: error?.status,
          statusCode: error?.statusCode,
          message: error?.message
        });
        setServiceDown(true);
        setLastHealthCheck(new Date());
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

  const handleAzureSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const redirectUri = `${window.location.origin}/auth?azure_callback=true`;
      
      // Call edge function to get authorization URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-auth?action=authorize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUri }),
        }
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store state for verification
      sessionStorage.setItem('azure_oauth_state', data.state);
      sessionStorage.setItem('azure_redirect_uri', redirectUri);
      
      // Redirect to Microsoft login
      window.location.href = data.authUrl;
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      toast.error("Failed to start Microsoft sign-in");
      setLoading(false);
    }
  };
  
  // Handle Azure OAuth callback
  const handleAzureCallback = async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const redirectUri = sessionStorage.getItem('azure_redirect_uri') || `${window.location.origin}/auth?azure_callback=true`;
      
      // Exchange code for tokens
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-auth?action=callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri }),
        }
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      
      console.log('[Azure Auth] Callback success:', data);
      
      // Use the magic link token to verify and sign in
      if (data.token && data.type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token,
          type: data.type as any,
        });
        
        if (verifyError) {
          console.error('[Azure Auth] OTP verification failed:', verifyError);
          throw verifyError;
        }
        
        toast.success(data.isNewUser ? "Account created successfully!" : "Signed in with Microsoft!");
        // Navigation will be handled by onAuthStateChange
      } else {
        throw new Error('Invalid response from authentication server');
      }
      
      // Clean up
      sessionStorage.removeItem('azure_oauth_state');
      sessionStorage.removeItem('azure_redirect_uri');
      
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      toast.error("Microsoft sign-in failed");
      
      // Clean URL
      window.history.replaceState({}, document.title, '/auth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div> */}
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img 
            src="/alberta-logo.svg" 
            alt="Government of Alberta" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold mb-2 text-gradient">Albert</h1>
          <p className="text-muted-foreground">Government of Alberta AI Assistant</p>
        </div>

        {serviceDown && (
          <Alert className="mb-6 border-2 border-primary bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
            <div className="ml-2 flex-1">
              <div className="font-semibold text-lg text-foreground">System Maintenance</div>
              <AlertDescription className="mt-2 text-foreground">
                The system is currently being maintained. Please check back shortly.
              </AlertDescription>
              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                <span>Authentication service is currently unavailable</span>
                {lastHealthCheck && (
                  <span className="text-xs">
                    • Last checked: {lastHealthCheck.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkServiceHealth}
                className="mt-3 border-primary text-primary hover:bg-primary/20"
              >
                Retry now
              </Button>
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
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t('auth:signIn.or', { defaultValue: 'Or' })}</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleAzureSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#00a4ef"/>
                      <rect x="1" y="11" width="9" height="9" fill="#7fba00"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    {t('auth:signIn.microsoft', { defaultValue: 'Sign in with Microsoft' })}
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
