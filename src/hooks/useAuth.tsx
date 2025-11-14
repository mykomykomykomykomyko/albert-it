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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    // This ensures we catch any auth changes that happen during mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event, session?.user?.email);
      
      // Log token refresh failures
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN get initial session
    // This handles the case where user is already logged in
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Error getting session:', error);
      }
      console.log('[Auth] Initial session loaded:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup: Unsubscribe from auth changes when component unmounts
    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
