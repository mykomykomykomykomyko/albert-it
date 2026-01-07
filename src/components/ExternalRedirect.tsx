/**
 * External Redirect Component
 * 
 * Handles redirecting users to an external URL.
 * Shows a brief loading state before navigation.
 */

import { useEffect } from 'react';

interface ExternalRedirectProps {
  url: string;
  message?: string;
}

export const ExternalRedirect = ({ 
  url, 
  message = "Redirecting to Agent Builder Console..." 
}: ExternalRedirectProps) => {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default ExternalRedirect;
