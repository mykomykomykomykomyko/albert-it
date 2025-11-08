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

import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Landing = lazy(() => import('@/pages/Landing'));

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Check authentication status and redirect if logged in
     * 
     * Shows landing page immediately, only redirects if user is authenticated
     */
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in -> go to chat
        navigate('/chat');
      }
      // If no session, stay on landing (already showing)
    };

    checkAuthAndRedirect();
  }, [navigate]);

  // Show landing page immediately
  return (
    <Suspense fallback={null}>
      <Landing />
    </Suspense>
  );
};

export default Index;
