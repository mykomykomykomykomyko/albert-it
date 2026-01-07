/**
 * External Redirect Interstitial Component
 * 
 * Shows an interstitial page before redirecting users to an external URL.
 * Provides options to open in new tab, continue, or go back.
 */

import { useNavigate } from 'react-router-dom';
import { ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExternalRedirectProps {
  url: string;
  title?: string;
  description?: string;
}

export const ExternalRedirect = ({ 
  url, 
  title = "You're being redirected",
  description = "The Canvas and Stage features are now available on Agent Builder Console."
}: ExternalRedirectProps) => {
  const navigate = useNavigate();

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleContinue = () => {
    window.location.href = url;
  };

  const handleGoBack = () => {
    // Try to go back, fallback to /chat
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleOpenNewTab} 
            className="w-full"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Keeps Albert open so you can easily return
          </p>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleGoBack} 
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={handleContinue} 
              variant="secondary"
              className="flex-1"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Use your browser's back button to return from Agent Builder Console
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalRedirect;
