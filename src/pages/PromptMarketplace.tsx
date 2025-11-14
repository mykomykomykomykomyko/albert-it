import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Copy, Sparkles, Trash2 } from 'lucide-react';
import { usePrompts } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { ChatHeader } from '@/components/ChatHeader';

export default function PromptMarketplace() {
  const navigate = useNavigate();
  const { loadMarketplacePrompts, copyToPersonalLibrary, deletePrompt, isAdmin } = usePrompts();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);
    const data = await loadMarketplacePrompts();
    setPrompts(data);
    setLoading(false);
  };

  const handleCopyToLibrary = async (prompt: any) => {
    await copyToPersonalLibrary(prompt);
    toast.success("Prompt copied to your library");
  };

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt from the marketplace?')) return;
    
    const success = await deletePrompt(promptId);
    if (success) {
      setPrompts(prev => prev.filter(p => p.id !== promptId));
      toast.success('Prompt deleted successfully');
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/prompt-library')}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Prompts
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8" />
                Prompt Marketplace
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover and use prompts created by the community
                {isAdmin && <span className="ml-2 text-xs">(Admin Mode)</span>}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Prompts Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading marketplace...
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No prompts found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        {prompt.category && (
                          <Badge variant="secondary" className="mt-2">
                            {prompt.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {prompt.description && (
                      <CardDescription className="mt-2">
                        {prompt.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                        {prompt.prompt_text}
                      </div>
                      
                      {prompt.tags && prompt.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uses: {prompt.usage_count || 0}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCopyToLibrary(prompt)}
                          className="flex-1"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Library
                        </Button>
                        {isAdmin && (
                          <Button
                            onClick={() => handleDelete(prompt.id)}
                            variant="destructive"
                            size="icon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
