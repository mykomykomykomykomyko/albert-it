import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Play, Copy, ArrowLeft } from 'lucide-react';
import { usePrompts, Prompt } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function PromptLibrary() {
  const navigate = useNavigate();
  const { prompts, loading, createPrompt, updatePrompt, deletePrompt, executePrompt } = usePrompts();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_text: '',
    category: '',
    tags: '',
    is_public: false,
    is_template: false,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prompt_text.trim()) {
      toast.error('Name and prompt text are required');
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prompt_text: '',
      category: '',
      tags: '',
      is_public: false,
      is_template: false,
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
    });
    setIsCreateOpen(true);
  };

  const handleExecute = async (promptId: string) => {
    const result = await executePrompt(promptId);
    if (result) {
      // Create a new conversation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use prompts');
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
        toast.error('Failed to create conversation');
        return;
      }

      // Navigate to the new conversation with the prompt text
      navigate(`/chat/${newConversation.id}`, { state: { promptText: result } });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Prompt Library</h1>
              <p className="text-muted-foreground">Store, test, and share reusable prompts</p>
            </div>
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
                  New Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}</DialogTitle>
                  <DialogDescription>
                    {editingPrompt ? 'Update your prompt details' : 'Add a new prompt to your library'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Prompt name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prompt_text">Prompt Text *</Label>
                    <Textarea
                      id="prompt_text"
                      value={formData.prompt_text}
                      onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                      placeholder="Enter your prompt... Use {{variable}} for dynamic content"
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Analysis, Writing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="tag1, tag2, tag3"
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
                      <Label htmlFor="is_public">Make public</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_template"
                        checked={formData.is_template}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_template: checked })}
                      />
                      <Label htmlFor="is_template">Template</Label>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading prompts...</p>
          </div>
        ) : prompts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No prompts yet</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Prompt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="line-clamp-1">{prompt.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(prompt)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePrompt(prompt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {prompt.description && (
                    <CardDescription className="line-clamp-2">
                      {prompt.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-24 mb-4">
                    <p className="text-sm text-muted-foreground">{prompt.prompt_text}</p>
                  </ScrollArea>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {prompt.category && (
                      <Badge variant="secondary">{prompt.category}</Badge>
                    )}
                    {prompt.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                    {prompt.is_template && (
                      <Badge variant="outline">Template</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExecute(prompt.id)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(prompt.prompt_text)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    Used {prompt.usage_count} times
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
