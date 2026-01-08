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
import { Brain, Eye, EyeOff, Info, Loader2, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { isPasswordValid, getPasswordErrors, PASSWORD_MIN_LENGTH } from "@/utils/passwordValidation";
import logger from "@/utils/logger";

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
        logger.log(`[Auth] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms${is503Error ? ' (503 error)' : ''}`);
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
  const isAzureAuthInProgress = useRef(false);
  
  // V2/V4: Email validation hook
  const { validateEmail, isValidating: isValidatingEmail } = useEmailValidation();
  const [emailValidation, setEmailValidation] = useState<{
    isAllowedDomain: boolean;
    requiresAccessCode: boolean;
    requiresSSO: boolean;
    isBlockedDomain: boolean;
    domainType: string | null;
    error: string | null;
  } | null>(null);

  // Health check function to detect service recovery
  const checkServiceHealth = async () => {
    try {
      logger.log('[Auth] Checking service health...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const healthUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
      const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);

      setLastHealthCheck(new Date());

      if (res.ok) {
        logger.log('[Auth] Service health OK');
        setServiceDown(false);

        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }

        toast.success("Service has been restored! You can now sign in.");
        return true;
      }

      logger.log('[Auth] Health endpoint not OK:', res.status);
      return false;
    } catch (error) {
      logger.log('[Auth] Service still unavailable (health check failed):', error);
      setLastHealthCheck(new Date());
      return false;
    }
  };

  // Poll for service recovery when service is down
  useEffect(() => {
    if (serviceDown) {
      logger.log('[Auth] Starting health check polling (every 30 seconds)');
      
      // Set up polling interval
      healthCheckIntervalRef.current = setInterval(() => {
        checkServiceHealth();
      }, 30000); // Check every 30 seconds
      
      return () => {
        if (healthCheckIntervalRef.current) {
          logger.log('[Auth] Clearing health check interval');
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
      logger.log('[Auth] onAuthStateChange:', event);

      if (event === 'SIGNED_OUT') {
        if (window.location.pathname !== '/auth') navigate('/auth');
        return;
      }

      // Skip navigation if Azure auth is handling it to prevent double navigation
      if (isAzureAuthInProgress.current) {
        logger.log('[Auth] Skipping onAuthStateChange navigation - Azure auth in progress');
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
            logger.error('[Auth] post-login profile check failed:', e);
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
      logger.error('[Azure Auth] OAuth error:', errorParam, errorDescription);
      setError(errorDescription || errorParam);
      window.history.replaceState({}, document.title, '/auth');
      return;
    }
    
    if (code && azureCallback === 'true') {
      // Set flag to prevent onAuthStateChange from also navigating
      isAzureAuthInProgress.current = true;
      // Clean URL immediately to prevent re-processing on re-renders
      window.history.replaceState({}, document.title, '/auth');
      logger.log('[Azure Auth] Callback detected, processing code...');
      handleAzureCallback(code);
    }
  }, []);

  // V2: Validate email on change using database-driven domains
  useEffect(() => {
    const validateEmailDomain = async () => {
      if (!email || !email.includes('@')) {
        setEmailValidation(null);
        return;
      }
      
      const result = await validateEmail(email);
      setEmailValidation({
        isAllowedDomain: result.isAllowedDomain,
        requiresAccessCode: result.requiresAccessCode,
        requiresSSO: result.requiresSSO,
        isBlockedDomain: result.isBlockedDomain,
        domainType: result.domainType,
        error: result.error,
      });
    };
    
    const debounce = setTimeout(validateEmailDomain, 300);
    return () => clearTimeout(debounce);
  }, [email, validateEmail]);

  // Helper to check if email is from allowed domain (uses cached validation)
  const isAllowedDomainEmail = (): boolean => {
    return emailValidation?.isAllowedDomain ?? false;
  };

  // Helper to check if access code is required
  const needsAccessCode = (): boolean => {
    return emailValidation?.requiresAccessCode ?? true;
  };

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
      // V4: Check for blocked email domains
      if (emailValidation?.isBlockedDomain) {
        setError("Temporary or disposable email addresses are not allowed.");
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

      // V5/V6: Block email/password signup for domains requiring SSO
      if (emailValidation?.requiresSSO) {
        setError(t('auth:signUp.ssoRequired.errorMessage', { 
          defaultValue: "Government of Alberta email addresses must sign in using Microsoft. Please use the 'Sign in with Microsoft' button." 
        }));
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

      // V25: Validate password strength
      if (!isPasswordValid(password)) {
        const errors = getPasswordErrors(password);
        setError(errors[0] || "Password does not meet security requirements.");
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

      const isGovEmail = isAllowedDomainEmail();
      
      // Skip access code validation for allowed government domains
      if (!isGovEmail && needsAccessCode()) {
        // Validate access code for non-government emails
        if (!accessCode.trim()) {
          setError("Access code is required for non-government email addresses");
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
          // V12: Don't reveal if email is already registered - use generic message
          if (error.message.includes('already registered') || 
              error.message.includes('User already registered')) {
            throw new Error("Unable to complete signup. Please try again or contact support.");
          }
          throw error;
        }
      }, 3, 1000);

      // Increment usage count only if access code was used
      if (!isGovEmail && accessCode.trim()) {
        try {
          await supabase.rpc('increment_access_code_usage', {
            code_input: accessCode.trim().toUpperCase()
          });
        } catch (usageError) {
          logger.error('Failed to increment usage count:', usageError);
          // Continue anyway - user is registered
        }
      }

      toast.success("Account created successfully! You can now sign in.");
      setEmail("");
      setPassword("");
      setFullName("");
      setAccessCode("");
      setEmailValidation(null);
      setError(null);
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      
      // Check for 503 service unavailable
      const is503 = error?.status === 503 || error?.statusCode === 503 || 
                    errorMessage.includes('503') || errorMessage.includes('upstream connect error');
      
      if (is503) {
        logger.log('[Auth] 503 error during sign-up:', {
          context: 'sign-up',
          status: error?.status,
          statusCode: error?.statusCode,
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
      // V5/V6: Block email/password sign-in for domains requiring SSO
      if (emailValidation?.requiresSSO) {
        setError(t('auth:signIn.ssoRequired.errorMessage', { 
          defaultValue: "Government of Alberta email addresses must sign in using Microsoft. Please use the 'Sign in with Microsoft' button." 
        }));
        isSubmitting.current = false;
        setLoading(false);
        return;
      }

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
        logger.log('[Auth] 503 error during sign-in:', {
          context: 'sign-in',
          status: error?.status,
          statusCode: error?.statusCode,
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
      
      logger.log('[Azure Auth] Callback success');
      
      // Clean up session storage before sign-in
      sessionStorage.removeItem('azure_oauth_state');
      sessionStorage.removeItem('azure_redirect_uri');
      
      // Use the magic link token to verify and sign in
      if (data.token && data.type) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token,
          type: data.type as any,
        });
        
        if (verifyError) {
          logger.error('[Azure Auth] OTP verification failed:', verifyError);
          throw verifyError;
        }
        
        toast.success(data.isNewUser ? "Account created successfully!" : "Signed in successfully!");
        
        // Navigate directly - don't wait for onAuthStateChange to avoid double navigation
        if (verifyData.session) {
          // Check if user needs to change password
          const { data: profile } = await supabase
            .from('profiles')
            .select('must_change_password')
            .eq('id', verifyData.session.user.id)
            .single();
          
          if (profile?.must_change_password) {
            navigate('/force-password-change');
          } else {
            navigate('/chat');
          }
        }
      } else {
        throw new Error('Invalid response from authentication server');
      }
      
    } catch (error: any) {
      const errorMessage = formatAuthError(error);
      setError(errorMessage);
      toast.error("Sign-in failed");
    } finally {
      setLoading(false);
      isAzureAuthInProgress.current = false;
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

                  {/* V5/V6: SSO Required - show Microsoft signin only */}
                  {emailValidation?.requiresSSO ? (
                    <>
                      <Alert className="bg-primary/10 border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <strong>{t('auth:signIn.ssoRequired.title', { defaultValue: 'Government of Alberta Account Detected' })}</strong>
                          <br />
                          {t('auth:signIn.ssoRequired.message', { defaultValue: 'For security, @gov.ab.ca users must sign in with their Microsoft account.' })}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={handleAzureSignIn}
                        disabled={loading}
                      >
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" fill="#00aad2"/>
                          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">AB</text>
                        </svg>
                        {t('auth:signUp.ssoRequired.button', { defaultValue: 'Sign in with Microsoft' })}
                      </Button>
                    </>
                  ) : (
                    <>
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
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" fill="#00aad2"/>
                          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">AB</text>
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
                    </>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Email field - always shown first */}
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

                  {/* V5/V6: SSO Required - show Microsoft signin instead of password form */}
                  {emailValidation?.requiresSSO ? (
                    <>
                      <Alert className="bg-primary/10 border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm text-foreground">
                          <strong>{t('auth:signUp.ssoRequired.title', { defaultValue: 'Government of Alberta Account Detected' })}</strong>
                          <br />
                          {t('auth:signUp.ssoRequired.message', { 
                            defaultValue: 'For security, @gov.ab.ca users must sign in with their Microsoft account. Your name will be automatically populated from your Microsoft profile.' 
                          })}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={handleAzureSignIn}
                        disabled={loading}
                      >
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" fill="#00aad2"/>
                          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">AB</text>
                        </svg>
                        {t('auth:signUp.ssoRequired.button', { defaultValue: 'Sign in with Microsoft' })}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Regular signup form - name, password, access code */}
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
                        <Label htmlFor="signup-password" className="text-foreground">{t('auth:signUp.password')}</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            name="password"
                            type={showSignupPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={PASSWORD_MIN_LENGTH}
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
                        {/* V25: Password Strength Indicator */}
                        <PasswordStrengthIndicator password={password} />
                      </div>
                      {/* V2: Show access code field only when required */}
                      {needsAccessCode() && !emailValidation?.isBlockedDomain && (
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
                            required={needsAccessCode()}
                            className="bg-background text-foreground border-input"
                            maxLength={20}
                          />
                          <p className="text-xs text-muted-foreground">
                            Access code is required for non-government email addresses
                          </p>
                        </div>
                      )}
                      {/* V4: Show blocked email error */}
                      {emailValidation?.isBlockedDomain && (
                        <Alert variant="destructive">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Temporary or disposable email addresses are not allowed.
                          </AlertDescription>
                        </Alert>
                      )}
                      {/* Show allowed domain confirmation */}
                      {isAllowedDomainEmail() && !emailValidation?.isBlockedDomain && (
                        <Alert className="bg-primary/10 border-primary/20">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-sm text-foreground">
                            {emailValidation?.domainType === 'federal' 
                              ? 'Federal government email detected. No access code required.'
                              : 'Government email detected. No access code required.'}
                          </AlertDescription>
                        </Alert>
                      )}
                      <Alert className="bg-muted/50 border-border">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm text-muted-foreground">
                          The personal information collected through Albert for the purpose of registering for an account. This collection is authorized by section 4 (c) of the Protection of Privacy Act. For questions about the collection of personal information, contact <a href="mailto:aiacademy@gov.ab.ca" className="text-primary hover:underline">aiacademy@gov.ab.ca</a>.
                        </AlertDescription>
                      </Alert>
                      <Button type="submit" className="w-full" disabled={loading || emailValidation?.isBlockedDomain || isValidatingEmail}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          t('auth:signUp.button')
                        )}
                      </Button>
                    </>
                  )}
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
