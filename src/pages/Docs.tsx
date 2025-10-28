/**
 * Documentation Page
 * 
 * Displays comprehensive documentation and training materials for Albert AI Assistant.
 * Renders the DOCS.md file content with proper formatting and navigation.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatHeader } from '@/components/ChatHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Docs = () => {
  const navigate = useNavigate();
  const [docsContent, setDocsContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the DOCS.md file content
    fetch('/DOCS.md')
      .then(response => response.text())
      .then(content => {
        setDocsContent(content);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading documentation:', error);
        setDocsContent('# Documentation\n\nFailed to load documentation. Please try again later.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-5xl mx-auto">
          {/* Header */}
          <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Albert Documentation</h1>
                  <p className="text-sm text-muted-foreground">Training manual and comprehensive guide</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="px-6 py-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading documentation...</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Style headings
                      h1: ({ node, ...props }) => (
                        <h1 className="text-4xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-3xl font-semibold mt-8 mb-4 text-foreground" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-2xl font-semibold mt-6 mb-3 text-foreground" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props} />
                      ),
                      // Style code blocks
                      code: ({ node, inline, ...props }: any) => 
                        inline ? (
                          <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-secondary p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                        ),
                      // Style links
                      a: ({ node, ...props }) => (
                        <a className="text-primary hover:underline" {...props} />
                      ),
                      // Style lists
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-2 my-4" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-2 my-4" {...props} />
                      ),
                      // Style tables
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="min-w-full border border-border rounded-lg" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-border bg-secondary px-4 py-2 text-left font-semibold" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-border px-4 py-2" {...props} />
                      ),
                      // Style blockquotes
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-secondary/50 italic" {...props} />
                      ),
                    }}
                  >
                    {docsContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Docs;
