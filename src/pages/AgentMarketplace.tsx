import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, Download, ArrowLeft, TrendingUp } from 'lucide-react';
import { Agent, useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AgentMarketplace() {
  const navigate = useNavigate();
  const { createAgent, loadMarketplaceAgents } = useAgents();
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fallback default templates when marketplace is empty
  const defaultTemplates = [
    {
      name: 'Researcher',
      type: 'Text',
      description: 'Gather and analyze information from various sources',
      system_prompt: 'You are a research assistant specializing in gathering and analyzing information from various sources.',
      user_prompt: 'Research the following topic and provide detailed findings: {input}',
      icon_name: 'Search',
    },
    {
      name: 'Summarizer',
      type: 'Text',
      description: 'Condense long content into concise summaries',
      system_prompt: 'You are a summarization expert who creates concise, accurate summaries of long content.',
      user_prompt: 'Summarize the following content: {input}',
      icon_name: 'FileText',
    },
    {
      name: 'Analyst',
      type: 'Text',
      description: 'Deep data analysis and pattern identification',
      system_prompt: 'You are a data analyst who provides insightful analysis and identifies patterns in data.',
      user_prompt: 'Analyze the following data and provide insights: {input}',
      icon_name: 'Bot',
    },
    {
      name: 'Writer',
      type: 'Text',
      description: 'Create engaging written content',
      system_prompt: 'You are a professional writer who creates compelling, well-structured content.',
      user_prompt: 'Write content based on the following: {input}',
      icon_name: 'FileText',
    },
  ];

  const mapTemplatesToPlaceholders = (): Agent[] =>
    defaultTemplates.map((t, idx) => ({
      id: `template-${idx}`,
      user_id: 'template',
      name: t.name,
      type: t.type,
      description: t.description,
      system_prompt: t.system_prompt,
      user_prompt: t.user_prompt,
      icon_name: t.icon_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata_tags: [],
      profile_picture_url: undefined,
      visibility: 'published',
      submitted_at: null,
      reviewed_at: null,
      reviewer_id: null,
      is_template: true,
      usage_count: 0,
      rating: null,
      category: undefined,
    })) as unknown as Agent[];

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);
    const agents = await loadMarketplaceAgents();
    if (!agents || agents.length === 0) {
      setMarketplaceAgents(mapTemplatesToPlaceholders());
    } else {
      setMarketplaceAgents(agents as Agent[]);
    }
    setLoading(false);
  };

  const categories = ['all', ...Array.from(new Set(marketplaceAgents.map(a => a.category).filter(Boolean)))];

  const filteredAgents = marketplaceAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCloneAgent = async (agent: Agent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to clone agents');
        return;
      }

      const newAgent = await createAgent({
        name: agent.is_template ? agent.name : `${agent.name} (Copy)`,
        type: agent.type,
        description: agent.description || '',
        system_prompt: agent.system_prompt,
        user_prompt: agent.user_prompt,
        icon_name: agent.icon_name,
        metadata_tags: agent.metadata_tags,
        profile_picture_url: agent.profile_picture_url,
      });

      if (newAgent) {
        // Increment usage count
        await supabase
          .from('agents')
          .update({ usage_count: (agent.usage_count || 0) + 1 })
          .eq('id', agent.id);

        const actionText = agent.is_template ? 'added' : 'cloned';
        toast.success(`Agent ${actionText} successfully`);
        navigate('/agents');
      }
    } catch (error) {
      console.error('Error cloning agent:', error);
      toast.error('Failed to clone agent');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/agents')}
            className="mb-4"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Agents
          </Button>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">Agent Marketplace</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Discover and clone agents created by the community</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="w-full md:w-auto">
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading marketplace...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No agents found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={agent.profile_picture_url} />
                        <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        {agent.is_template && (
                          <Badge variant="secondary" className="text-xs">Template</Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{agent.usage_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  <CardTitle className="line-clamp-1">{agent.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {agent.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.category && (
                      <Badge variant="secondary">{agent.category}</Badge>
                    )}
                    {agent.metadata_tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  {agent.rating && (
                    <div className="flex items-center gap-1 mb-4">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{agent.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => handleCloneAgent(agent)}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {agent.is_template ? 'Add Agent' : 'Clone Agent'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
