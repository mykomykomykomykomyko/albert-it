import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Search, Home, MessageSquare, Layers, Image as ImageIcon, Mic, FileText, FileCode, Store, Users } from 'lucide-react';
import { useFrameworks } from '@/hooks/useFrameworks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';

const navigationLinks = [
  { path: "/", label: "Home", icon: Home },
  { path: "/agents", label: "Agents", icon: Users },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/stage", label: "Stage", icon: Layers },
  { path: "/canvas", label: "Canvas", icon: Layers },
  { path: "/image", label: "Image", icon: ImageIcon },
  { path: "/voice", label: "Voice", icon: Mic },
  { path: "/transcripts", label: "Transcripts", icon: FileText },
  { path: "/prompts", label: "Prompts", icon: BookOpen },
  { path: "/framework", label: "Framework", icon: FileCode },
  { path: "/marketplace", label: "Marketplace", icon: Store },
];

export default function Framework() {
  const navigate = useNavigate();
  const location = useLocation();
  const { frameworks, loading } = useFrameworks();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedFrameworkData = frameworks.find(f => f.id === selectedFramework);
  
  const filteredFrameworks = frameworks.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center h-14 px-4 gap-1 overflow-x-auto">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left side - Frameworks List */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <div className="p-4 flex-shrink-0 border-b border-border">
            <h2 className="text-base font-semibold mb-3">Frameworks</h2>
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

        {/* Right side - Main Content */}
        <div className="flex-1 overflow-auto">
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
      </div>
    </div>
  );
}
