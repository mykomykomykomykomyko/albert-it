import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Play, Copy, Search, FileText, Home, MessageSquare, Layers, Image as ImageIcon, Mic, BookOpen, FileCode, Store, Users } from 'lucide-react';
import { usePrompts, Prompt } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

export default function PromptLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prompts, loading, createPrompt, updatePrompt, deletePrompt, executePrompt } = usePrompts();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const selectedPromptData = prompts.find(p => p.id === selectedPrompt);
  
  const filteredPrompts = prompts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center h-12 sm:h-14 px-2 sm:px-4 gap-1 overflow-x-auto scrollbar-hide">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left side - Prompts List */}
        <div className="hidden md:flex w-64 lg:w-80 border-r border-border flex-col bg-card">
          <div className="p-4 flex-shrink-0 border-b border-border">
            <h2 className="text-base font-semibold mb-3">Prompts</h2>
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
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No prompts</p>
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
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
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
              <h1 className="text-3xl font-bold mb-2">Prompt Library</h1>
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

          {selectedPromptData ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle>{selectedPromptData.name}</CardTitle>
                  <div className="flex gap-1">
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
                  </div>
                </div>
                {selectedPromptData.description && (
                  <CardDescription>{selectedPromptData.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Prompt Text</Label>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedPromptData.prompt_text}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedPromptData.category && (
                      <Badge variant="secondary">{selectedPromptData.category}</Badge>
                    )}
                    {selectedPromptData.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                    {selectedPromptData.is_template && (
                      <Badge variant="outline">Template</Badge>
                    )}
                    {selectedPromptData.tags?.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleExecute(selectedPromptData.id)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(selectedPromptData.prompt_text)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-right pt-2">
                    Used {selectedPromptData.usage_count} times
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a prompt to view details</p>
                <p className="text-sm mt-1">Choose from the sidebar or create a new prompt</p>
                <Button 
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Prompt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
