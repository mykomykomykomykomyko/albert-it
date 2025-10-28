/**
 * Index Page - Root Route Handler
 * 
 * This component serves as the entry point for the application.
 * It performs authentication checking and redirects users to the appropriate page:
 * 
 * - If user is authenticated: Redirect to /chat (main application)
 * - If user is not authenticated: Redirect to /landing (public landing page)
 * 
 * This ensures users always land on the correct page based on their auth status.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Check authentication status and redirect accordingly
     * 
     * Uses Supabase auth to check if user has an active session.
     * This runs once when the component mounts.
     */
    const checkAuthAndRedirect = async () => {
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in -> go to chat
        navigate('/chat');
      } else {
        // User is not logged in -> show landing page
        navigate('/landing');
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  // Show loading state while checking authentication
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
