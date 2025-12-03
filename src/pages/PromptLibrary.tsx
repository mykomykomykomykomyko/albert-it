import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit, Play, Copy, Search, FileText, Share2, Upload, Store, Download } from 'lucide-react';
import { usePrompts, Prompt } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function PromptLibrary() {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const {
    prompts,
    loading,
    isAdmin,
    createPrompt,
    updatePrompt,
    deletePrompt,
    sharePrompt,
    submitToMarketplace,
    executePrompt,
    copyToPersonalLibrary,
    loadMarketplacePrompts,
  } = usePrompts();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'marketplace'>('personal');
  const [marketplacePrompts, setMarketplacePrompts] = useState<Prompt[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_text: '',
    category: '',
    tags: '',
    is_public: false,
    is_template: false,
    is_marketplace: false,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prompt_text.trim()) {
      toast.error(t('messages.error'));
      return;
    }

    const promptData = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    if (editingPrompt) {
      const success = await updatePrompt(editingPrompt.id, promptData);
      if (success) {
        setEditingPrompt(null);
        resetForm();
      }
    } else {
      const success = await createPrompt(promptData);
      if (success) {
        setIsCreateOpen(false);
        resetForm();
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplacePrompts().then(setMarketplacePrompts);
    }
  }, [activeTab]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prompt_text: '',
      category: '',
      tags: '',
      is_public: false,
      is_template: false,
      is_marketplace: false,
    });
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      prompt_text: prompt.prompt_text,
      category: prompt.category || '',
      tags: prompt.tags?.join(', ') || '',
      is_public: prompt.is_public,
      is_template: prompt.is_template,
      is_marketplace: prompt.is_marketplace,
    });
    setIsCreateOpen(true);
  };

  const handleShare = async () => {
    if (!selectedPrompt || !shareEmail) {
      toast.error(t('messages.error'));
      return;
    }
    const success = await sharePrompt(selectedPrompt, shareEmail, sharePermission);
    if (success) {
      setIsShareOpen(false);
      setShareEmail('');
      setSharePermission('view');
    }
  };

  const handleSubmitToMarketplace = async () => {
    if (!selectedPrompt) return;
    await submitToMarketplace(selectedPrompt);
    setSelectedPrompt(null);
  };

  const handleExecute = async (promptId: string) => {
    const promptData = selectedPromptData;
    const result = await executePrompt(promptId, undefined, promptData);
    if (result) {
      // Create a new conversation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('messages.error'));
        return;
      }

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: session.user.id,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (error || !newConversation) {
        toast.error(t('messages.error'));
        return;
      }

      // Navigate to the new conversation with the prompt text
      navigate(`/chat/${newConversation.id}`, { state: { promptText: result } });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('marketplace.copiedSuccess'));
  };

  const currentPrompts = activeTab === 'personal' ? prompts : marketplacePrompts;
  const selectedPromptData = currentPrompts.find(p => p.id === selectedPrompt);
  
  const personalPrompts = prompts.filter(p => !p.is_marketplace);
  const filteredPrompts = (activeTab === 'personal' ? personalPrompts : marketplacePrompts).filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <ChatHeader />
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left side - Prompts List */}
        <div className="hidden md:flex w-64 lg:w-80 border-r border-border flex-col bg-card">
          <div className="p-4 flex-shrink-0 border-b border-border">
            <h2 className="text-base font-semibold mb-3">{t('title')}</h2>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'personal' | 'marketplace')} className="mb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">{t('library.title')}</TabsTrigger>
                <TabsTrigger value="marketplace">
                  <Store className="h-3 w-3 mr-1" />
                  {t('marketplace.title')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'personal' ? t('library.search') : t('marketplace.search')}
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
                  {t('messages.error')}...
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{activeTab === 'personal' ? t('library.noPrompts') : t('marketplace.noResults')}</p>
                </div>
              ) : (
                filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedPrompt === prompt.id 
                        ? "bg-accent border-l-2 border-primary" 
                        : "border-l-2 border-transparent"
                    }`}
                    onClick={() => setSelectedPrompt(prompt.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight flex-1">
                        {prompt.name}
                      </h3>
                      {prompt.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                          {prompt.category}
                        </Badge>
                      )}
                    </div>
                    {prompt.description && (
                      <p className={`text-xs line-clamp-2 mt-1 ${
                        selectedPrompt === prompt.id 
                          ? "text-foreground/80" 
                          : "text-muted-foreground"
                      }`}>
                        {prompt.description}
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
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
              <p className="text-muted-foreground">{t('description')}</p>
            </div>
            
            {activeTab === 'personal' && (
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  setEditingPrompt(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('actions.create')}
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingPrompt ? t('actions.edit') : t('actions.create')}</DialogTitle>
                  <DialogDescription>
                    {editingPrompt ? t('messages.updated') : t('library.createFirst')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('form.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('form.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('form.description')}</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('form.descriptionPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prompt_text">{t('form.content')} *</Label>
                    <Textarea
                      id="prompt_text"
                      value={formData.prompt_text}
                      onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                      placeholder={t('form.contentPlaceholder')}
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">{t('form.category')}</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder={t('form.selectCategory')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags">{t('form.tags')}</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder={t('form.tagsPlaceholder')}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_public"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                      />
                      <Label htmlFor="is_public">{t('form.public')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_template"
                        checked={formData.is_template}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_template: checked })}
                      />
                      <Label htmlFor="is_template">{t('form.template')}</Label>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingPrompt ? t('actions.save') : t('actions.create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>

          {selectedPromptData ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle>{selectedPromptData.name}</CardTitle>
                  <div className="flex gap-1">
                    {activeTab === 'personal' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsShareOpen(true)}
                          title={t('actions.share')}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        {selectedPromptData.visibility === 'private' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSubmitToMarketplace()}
                            title={t('form.marketplace')}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(selectedPromptData)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePrompt(selectedPromptData.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => copyToPersonalLibrary(selectedPromptData)}
                        title={t('marketplace.copyToLibrary')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('marketplace.copyToLibrary')}
                      </Button>
                    )}
                  </div>
                </div>
                {selectedPromptData.description && (
                  <CardDescription>{selectedPromptData.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">{t('form.content')}</Label>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedPromptData.prompt_text}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedPromptData.category && (
                      <Badge variant="secondary">{selectedPromptData.category}</Badge>
                    )}
                    {selectedPromptData.is_public && (
                      <Badge variant="outline">{t('form.public')}</Badge>
                    )}
                    {selectedPromptData.is_template && (
                      <Badge variant="outline">{t('form.template')}</Badge>
                    )}
                    {selectedPromptData.is_marketplace && (
                      <Badge variant="default">
                        <Store className="h-3 w-3 mr-1" />
                        {t('form.marketplace')}
                      </Badge>
                    )}
                    {selectedPromptData.tags?.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={() => handleExecute(selectedPromptData.id)} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      {t('actions.execute')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCopy(selectedPromptData.prompt_text)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {t('actions.copy')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{activeTab === 'personal' ? t('library.noPrompts') : t('marketplace.noResults')}</p>
                <p className="text-sm mt-1">{activeTab === 'personal' ? t('library.createFirst') : t('marketplace.description')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.share')}</DialogTitle>
            <DialogDescription>
              {t('messages.shared')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('share.email')}</Label>
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder={t('share.emailPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={sharePermission === 'edit'}
                onCheckedChange={(checked) => setSharePermission(checked ? 'edit' : 'view')}
              />
              <Label>{t('actions.edit')}</Label>
            </div>
            <Button onClick={handleShare} className="w-full">
              {t('actions.share')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}