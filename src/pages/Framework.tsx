import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, X, Search } from 'lucide-react';
import { useFrameworks } from '@/hooks/useFrameworks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSidebar } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';

const FrameworkSidebarContent = ({ 
  frameworks, 
  selectedFramework, 
  setSelectedFramework,
  searchQuery,
  setSearchQuery,
  loading
}: {
  frameworks: any[];
  selectedFramework: string | null;
  setSelectedFramework: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loading: boolean;
}) => {
  const { setOpen } = useSidebar();
  
  const filteredFrameworks = frameworks.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Frameworks</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1.5 py-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : filteredFrameworks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No frameworks</p>
            </div>
          ) : (
            filteredFrameworks.map((framework) => (
              <div
                key={framework.id}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                  selectedFramework === framework.id 
                    ? "bg-accent border-l-2 border-primary" 
                    : "border-l-2 border-transparent"
                }`}
                onClick={() => setSelectedFramework(framework.id)}
              >
                <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                  {framework.name}
                </h3>
                {framework.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {framework.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default function Framework() {
  const navigate = useNavigate();
  const { frameworks, loading } = useFrameworks();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedFrameworkData = frameworks.find(f => f.id === selectedFramework);

  return (
    <AppLayout
      defaultCollapsed={true}
      sidebar={
        <FrameworkSidebarContent
          frameworks={frameworks}
          selectedFramework={selectedFramework}
          setSelectedFramework={setSelectedFramework}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          loading={loading}
        />
      }
    >
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Framework Library</h1>
            <p className="text-muted-foreground">
              Learn best practices and frameworks for effective AI interactions
            </p>
          </div>

          {selectedFrameworkData ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedFrameworkData.name}</h2>
                {selectedFrameworkData.description && (
                  <p className="text-muted-foreground mb-6">{selectedFrameworkData.description}</p>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedFrameworkData.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a framework to view details</p>
                <p className="text-sm mt-1">Choose from the sidebar to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
