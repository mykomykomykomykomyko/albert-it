import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Agent } from '@/hooks/useAgents';
import { toast } from 'sonner';
import { TranslationManager } from '@/components/admin/TranslationManager';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import PromptReviewTab from '@/components/admin/PromptReviewTab';
import { AccessCodeManagementTab } from '@/components/admin/AccessCodeManagementTab';

type AgentWithEmail = Agent & { submitter_email?: string };

export default function AdminReview() {
  const navigate = useNavigate();
  const { t } = useTranslation('admin');
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [agents, setAgents] = useState<AgentWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithEmail | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeTab, setActiveTab] = useState('agents');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      if (!rolesLoading && !isAdmin) {
        toast.error(t('accessDenied'));
        navigate('/agents');
      }
    };

    checkAuth();
  }, [navigate, isAdmin, rolesLoading, t]);

  useEffect(() => {
    if (isAdmin) {
      loadPendingAgents();
    }
  }, [isAdmin]);

  const loadPendingAgents = async () => {
    try {
      // First, get the pending agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('visibility', 'pending_review')
        .order('submitted_at', { ascending: true });

      if (agentsError) throw agentsError;

      // Then get unique user IDs
      const userIds = [...new Set(agentsData?.map(a => a.user_id) || [])];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Create a map of user_id to email
      const emailMap = new Map(
        (profilesData || []).map(p => [p.id, p.email || 'Unknown'])
      );

      // Map the data to include email
      const agentsWithEmail = (agentsData || []).map((agent: any) => ({
        ...agent,
        submitter_email: emailMap.get(agent.user_id) || 'Unknown',
      })) as AgentWithEmail[];
      
      setAgents(agentsWithEmail);
    } catch (error) {
      console.error('Error loading pending agents:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (agent: Agent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('agents')
        .update({
          visibility: 'published',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user.id,
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast.success(t('agentReview.approved'));
      setSelectedAgent(null);
      setReviewNotes('');
      await loadPendingAgents();
    } catch (error) {
      console.error('Error approving agent:', error);
      toast.error(t('error'));
    }
  };

  const handleReject = async (agent: Agent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('agents')
        .update({
          visibility: 'private',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user.id,
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast.success(t('agentReview.rejected'));
      setSelectedAgent(null);
      setReviewNotes('');
      await loadPendingAgents();
    } catch (error) {
      console.error('Error rejecting agent:', error);
      toast.error(t('error'));
    }
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/agents')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="agents">{t('tabs.agents')}</TabsTrigger>
            <TabsTrigger value="prompts">{t('tabs.prompts')}</TabsTrigger>
            <TabsTrigger value="accessCodes">{t('tabs.accessCodes')}</TabsTrigger>
            <TabsTrigger value="translations">{t('tabs.translations')}</TabsTrigger>
            <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            {agents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">{t('agentReview.noAgents')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={agent.profile_picture_url} />
                          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <CardTitle className="line-clamp-1">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {agent.description || t('agentReview.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {agent.category && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t('agentReview.category')}</p>
                            <Badge variant="outline">{agent.category}</Badge>
                          </div>
                        )}
                        {agent.metadata_tags && agent.metadata_tags.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {agent.metadata_tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('agentReview.submittedBy')}</p>
                          <p className="text-xs font-mono">{agent.submitter_email}</p>
                        </div>
                        {agent.submitted_at && (
                          <p className="text-xs text-muted-foreground">
                            {t('agentReview.submittedAt')}: {new Date(agent.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 pt-3">
                          <Button
                            onClick={() => setSelectedAgent(agent)}
                            className="flex-1"
                            variant="outline"
                          >
                            {t('agentReview.review')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prompts">
            <PromptReviewTab />
          </TabsContent>

          <TabsContent value="accessCodes">
            <AccessCodeManagementTab />
          </TabsContent>

          <TabsContent value="translations">
            <TranslationManager />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={selectedAgent !== null} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('agentReview.review')}: {selectedAgent?.name}</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedAgent.profile_picture_url} />
                  <AvatarFallback>{selectedAgent.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedAgent.name}</h3>
                  <Badge variant="secondary">{selectedAgent.type}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('agentReview.submittedBy')}: <span className="font-mono">{selectedAgent.submitter_email}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t('agentReview.description')}</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAgent.description || t('agentReview.description')}
                </p>
              </div>

              {selectedAgent.category && (
                <div>
                  <label className="text-sm font-medium">{t('agentReview.category')}</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAgent.category}</p>
                </div>
              )}

              {selectedAgent.metadata_tags && selectedAgent.metadata_tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAgent.metadata_tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">{t('agentReview.systemPrompt')}</label>
                <p className="text-sm text-muted-foreground mt-1 bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {selectedAgent.system_prompt}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">User Prompt</label>
                <p className="text-sm text-muted-foreground mt-1 bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {selectedAgent.user_prompt}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">{t('agentReview.reviewNotes')}</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('agentReview.notesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selectedAgent)}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('agentReview.approve')}
                </Button>
                <Button
                  onClick={() => handleReject(selectedAgent)}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('agentReview.reject')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}