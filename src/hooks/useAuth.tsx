/**
 * useAuth Hook - Authentication State Management
 * 
 * This custom React hook manages authentication state across the application.
 * It provides user session information and automatically syncs with Supabase Auth.
 * 
 * Features:
 * - Real-time auth state synchronization
 * - Session management
 * - User information access
 * - Loading state tracking
 * 
 * Usage:
 * ```tsx
 * const { user, session, loading } = useAuth();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (!user) return <LoginPrompt />;
 * return <AuthenticatedApp user={user} />;
 * ```
 * 
 * Returns:
 * - user: Current authenticated user object (or null)
 * - session: Active session object (or null)
 * - loading: Boolean indicating if auth state is being loaded
 * 
 * Auth Flow:
 * 1. Hook sets up auth state change listener
 * 2. Fetches initial session from Supabase
 * 3. Updates state when auth changes (login, logout, token refresh)
 * 4. Cleanup listener on unmount
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useSessionTimeout } from './useSessionTimeout';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Enable session timeout for security (only for authenticated users)
  useSessionTimeout({
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 2 * 60 * 1000, // 2 minutes warning
    enabled: !!user, // Only enable when user is logged in
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    // This ensures we catch any auth changes that happen during mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN get initial session
    // This handles the case where user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup: Unsubscribe from auth changes when component unmounts
    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
