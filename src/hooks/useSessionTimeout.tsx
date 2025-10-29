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
  timeoutMs = 30 * 60 * 1000, // 30 minutes
  warningMs = 2 * 60 * 1000, // 2 minutes warning
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
    
    hasShownWarningRef.current = true;
    const minutesLeft = Math.ceil(warningMs / 60000);
    
    toast.warning(
      `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} due to inactivity.`,
      {
        duration: warningMs,
      }
    );
  }, [warningMs]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    hasShownWarningRef.current = false;
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      showWarning();
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
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
