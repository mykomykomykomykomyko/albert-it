import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Session Timeout Hook
 * 
 * Automatically logs out users after a period of inactivity
 * to prevent session hijacking and improve security.
 * 
 * Features:
 * - Activity tracking (mouse, keyboard, touch events)
 * - Configurable timeout duration
 * - Warning notification before logout
 * - Automatic cleanup
 */

interface UseSessionTimeoutOptions {
  /**
   * Timeout duration in milliseconds
   * Default: 30 minutes
   */
  timeoutMs?: number;
  
  /**
   * Warning time before logout in milliseconds
   * Default: 2 minutes before timeout
   */
  warningMs?: number;
  
  /**
   * Enable/disable the session timeout
   * Default: true
   */
  enabled?: boolean;
  
  /**
   * Callback when session times out
   */
  onTimeout?: () => void;
}

export const useSessionTimeout = ({
  timeoutMs = 60 * 60 * 1000, // 60 minutes (increased from 30)
  warningMs = 5 * 60 * 1000, // 5 minutes warning (increased from 2)
  enabled = true,
  onTimeout,
}: UseSessionTimeoutOptions = {}) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());
  const hasShownWarningRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('Session timeout - logging out user');
    
    try {
      await supabase.auth.signOut();
      toast.error('Session expired due to inactivity. Please log in again.');
      
      if (onTimeout) {
        onTimeout();
      }
    } catch (error) {
      console.error('Error during timeout logout:', error);
    }
  }, [onTimeout]);

  const showWarning = useCallback(() => {
    if (hasShownWarningRef.current) return;
    
    // Double-check that enough time has actually passed since last activity
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    const expectedTimeUntilWarning = timeoutMs - warningMs;
    
    // Only show warning if we've been inactive for at least 80% of expected time
    // This prevents premature warnings from timing issues
    const minimumInactivityTime = expectedTimeUntilWarning * 0.8;
    
    if (timeSinceLastActivity < minimumInactivityTime) {
      console.log('Warning suppressed - not enough time since last activity', {
        timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
        expectedTime: Math.floor(expectedTimeUntilWarning / 1000),
        minimumRequired: Math.floor(minimumInactivityTime / 1000)
      });
      return;
    }
    
    hasShownWarningRef.current = true;
    const minutesLeft = Math.ceil(warningMs / 60000);
    
    toast.warning(
      `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} due to inactivity.`,
      {
        duration: warningMs,
      }
    );
  }, [warningMs, timeoutMs]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    hasShownWarningRef.current = false;
    const now = Date.now();
    lastActivityRef.current = now;

    // Only set timers if we have enough time until warning
    // This prevents warnings from showing immediately after login
    const timeUntilWarning = timeoutMs - warningMs;
    
    if (timeUntilWarning > 60000) { // Only set if at least 1 minute until warning
      // Set warning timer
      warningRef.current = setTimeout(() => {
        showWarning();
      }, timeUntilWarning);

      // Set logout timer
      timeoutRef.current = setTimeout(() => {
        logout();
      }, timeoutMs);
      
      console.log('Session timeout timers set', {
        timeUntilWarningMinutes: Math.floor(timeUntilWarning / 60000),
        totalTimeoutMinutes: Math.floor(timeoutMs / 60000),
        timestamp: new Date(now).toISOString()
      });
    }
  }, [enabled, timeoutMs, warningMs, clearTimers, showWarning, logout]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        resetTimer();
      }
    };

    checkAuth();

    // Activity event listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle activity detection to avoid excessive timer resets
    let throttleTimeout: NodeJS.Timeout;
    const handleActivity = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        resetTimer();
        throttleTimeout = null as any;
      }, 1000); // Throttle to once per second
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        resetTimer();
      } else if (event === 'SIGNED_OUT') {
        clearTimers();
      }
    });

    // Cleanup
    return () => {
      clearTimers();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      subscription.unsubscribe();
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [enabled, resetTimer, clearTimers]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
};
