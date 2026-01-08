import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Star, Download, ArrowLeft, TrendingUp, RefreshCw, Eye } from 'lucide-react';
import { Agent, useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function AgentMarketplace() {
  const navigate = useNavigate();
  const { t } = useTranslation('marketplace');
  const { createAgent, loadMarketplaceAgents } = useAgents();
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);

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

  // Refresh when page becomes visible (e.g., after navigating from admin panel)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadMarketplace();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    console.log('🔄 Attempting to clone agent:', agent.name, 'ID:', agent.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user found when trying to clone agent');
        toast.error(t('messages.signInRequired'));
        return;
      }

      console.log('✅ User authenticated:', user.id);
      console.log('📝 Creating agent with data:', {
        name: agent.is_template ? agent.name : `${agent.name} (Copy)`,
        type: agent.type,
      });

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
        console.log('✅ Agent created successfully:', newAgent.id);
        
        // Only increment usage count for real agents (not fake template placeholders)
        if (!agent.id.startsWith('template-')) {
          console.log('📊 Incrementing usage count for agent:', agent.id);
          const { error: updateError } = await supabase
            .from('agents')
            .update({ usage_count: (agent.usage_count || 0) + 1 })
            .eq('id', agent.id);
          
          if (updateError) {
            console.error('⚠️ Failed to increment usage count:', updateError);
          }
        }

        const actionText = agent.is_template ? t('messages.agentAdded') : t('messages.agentCloned');
        toast.success(actionText);
        console.log('🎉 Navigating to /agents');
        navigate('/agents');
      } else {
        console.error('❌ createAgent returned null');
        toast.error(t('messages.failedToCreate'));
      }
    } catch (error) {
      console.error('❌ Error cloning agent:', error);
      toast.error(t('messages.failedToCreate'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/agents')}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToAgents')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMarketplace}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">{t('title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('searchPlaceholder')}
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
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('noAgentsFound')}</p>
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
                          <Badge variant="secondary" className="text-xs">{t('badges.template')}</Badge>
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
                    onClick={() => setViewingAgent(agent)}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Agent
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Agent Details Dialog */}
      <Dialog open={!!viewingAgent} onOpenChange={(open) => !open && setViewingAgent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <Avatar className="h-16 w-16">
                <AvatarImage src={viewingAgent?.profile_picture_url} />
                <AvatarFallback>{viewingAgent?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-2xl">{viewingAgent?.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  {viewingAgent?.description || 'No description available'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary">{viewingAgent?.type}</Badge>
              {viewingAgent?.category && (
                <Badge variant="secondary">{viewingAgent.category}</Badge>
              )}
              {viewingAgent?.is_template && (
                <Badge variant="secondary">{t('badges.template')}</Badge>
              )}
              {viewingAgent?.metadata_tags?.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {viewingAgent?.system_prompt && (
              <div>
                <h3 className="font-semibold text-sm mb-2">System Prompt</h3>
                <ScrollArea className="h-32 w-full rounded-md border p-3 bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{viewingAgent.system_prompt}</p>
                </ScrollArea>
              </div>
            )}

            {viewingAgent?.user_prompt && (
              <div>
                <h3 className="font-semibold text-sm mb-2">User Prompt Template</h3>
                <ScrollArea className="h-24 w-full rounded-md border p-3 bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{viewingAgent.user_prompt}</p>
                </ScrollArea>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{viewingAgent?.usage_count || 0} uses</span>
                </div>
                {viewingAgent?.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{viewingAgent.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => {
                  if (viewingAgent) {
                    handleCloneAgent(viewingAgent);
                    setViewingAgent(null);
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('buttons.addToMyAgents')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
