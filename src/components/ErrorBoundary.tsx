import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Error Fallback Component
 * Displayed when an error is caught by the error boundary
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs mt-2 overflow-auto max-h-40 text-muted-foreground">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error logging function
 * Sends errors to monitoring service in production
 */
const logError = (error: Error, errorInfo: React.ErrorInfo) => {
  // In production, send to error tracking service (Sentry, LogRocket, etc.)
  console.error('Error caught by boundary:', error, errorInfo);
  
  // Example: Send to monitoring service
  // if (!import.meta.env.DEV) {
  //   errorTrackingService.logError(error, errorInfo);
  // }
};

/**
 * Global Error Boundary Component
 * Wraps the entire application to catch and handle runtime errors
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset application state if needed
        window.location.href = '/';
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

/**
 * Component-Level Error Boundary
 * Use for specific features that shouldn't crash the entire app
 */
interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
}

export function FeatureErrorBoundary({ 
  children, 
  fallback,
  featureName = 'This feature'
}: FeatureErrorBoundaryProps) {
  const defaultFallback = (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="h-4 w-4" />
          <p className="font-medium">{featureName} encountered an error</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Please refresh the page or try again later.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <ReactErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          {fallback || defaultFallback}
          <Button 
            onClick={resetErrorBoundary} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}
      onError={logError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
