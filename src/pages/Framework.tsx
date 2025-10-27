import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useFrameworks } from '@/hooks/useFrameworks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Framework() {
  const navigate = useNavigate();
  const { frameworks, loading } = useFrameworks();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  const categories = Array.from(new Set(frameworks.map(f => f.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <div className="flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Framework Library</h1>
              <p className="text-muted-foreground">
                Learn best practices and frameworks for effective AI interactions
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading frameworks...</p>
          </div>
        ) : frameworks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No frameworks available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Frameworks</h3>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {frameworks.map((framework) => (
                        <Button
                          key={framework.id}
                          variant={selectedFramework === framework.id ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setSelectedFramework(framework.id)}
                        >
                          {framework.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  {selectedFramework ? (
                    <ScrollArea className="h-[600px] pr-4">
                      {frameworks
                        .filter(f => f.id === selectedFramework)
                        .map((framework) => (
                          <div key={framework.id}>
                            <h2 className="text-3xl font-bold mb-2">{framework.name}</h2>
                            {framework.description && (
                              <p className="text-muted-foreground mb-6">{framework.description}</p>
                            )}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {framework.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                    </ScrollArea>
                  ) : (
                    <div className="h-[600px] flex items-center justify-center text-center">
                      <div>
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Select a framework from the list to view its content
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
