import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Download, ArrowLeft, TrendingUp } from 'lucide-react';
import { useWorkflows, Workflow } from '@/hooks/useWorkflows';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function WorkflowMarketplace() {
  const { t } = useTranslation('marketplace');
  const navigate = useNavigate();
  const location = useLocation();
  const { cloneWorkflow, loadPublicWorkflows } = useWorkflows();
  const [publicWorkflows, setPublicWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Determine which page the user came from
  const returnPath = location.state?.from || '/stage';

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);
    const workflows = await loadPublicWorkflows();
    setPublicWorkflows(workflows);
    setLoading(false);
  };

  const categories = ['all', ...Array.from(new Set(publicWorkflows.map(w => w.category).filter(Boolean)))];

  const filteredWorkflows = publicWorkflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || workflow.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCloneWorkflow = async (workflow: Workflow) => {
    const result = await cloneWorkflow(workflow.id);
    if (result) {
      // Check workflow format to determine which page to navigate to
      const workflowData = result.workflow_data as any;
      const isCanvasFormat = workflowData?.nodes && workflowData?.edges;
      const isStageFormat = workflowData?.stages || (workflowData?.workflow && workflowData?.workflow?.stages);
      
      // Navigate to appropriate page based on format
      if (isCanvasFormat && !isStageFormat) {
        navigate(`/canvas?workflowId=${result.id}`);
        toast.success(t('workflow.loadingCanvasCloned'));
      } else if (isStageFormat && !isCanvasFormat) {
        navigate(`/stage?workflowId=${result.id}`);
        toast.success(t('workflow.loadingStageCloned'));
      } else {
        // Default to returnPath if format is unclear
        navigate(`${returnPath}?workflowId=${result.id}`);
        toast.success(t('workflow.loadingCloned'));
      }
    }
  };

  // Get translated category name
  const getCategoryName = (category: string) => {
    const categoryKey = `workflow.categories.${category}` as any;
    return t(categoryKey, category.charAt(0).toUpperCase() + category.slice(1));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(returnPath)}
            className="mb-4"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('workflow.back')}
          </Button>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">{t('workflow.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('workflow.subtitle')}</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('workflow.searchPlaceholder')}
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
                  {getCategoryName(category)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('workflow.loading')}</p>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('workflow.noWorkflowsFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary">{workflow.category || t('workflow.general')}</Badge>
                  </div>
                  <CardTitle className="line-clamp-1">{workflow.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {workflow.description || t('workflow.noDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workflow.tags && workflow.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {workflow.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {workflow.version && (
                      <p className="text-xs text-muted-foreground">
                        {t('workflow.version')} {workflow.version}
                      </p>
                    )}
                    <Button
                      onClick={() => handleCloneWorkflow(workflow)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('workflow.cloneWorkflow')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
