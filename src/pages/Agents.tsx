import { ChatHeader } from "@/components/ChatHeader";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAgents, Agent, AgentTemplate } from "@/hooks/useAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Upload, Sparkles, Download, Share2, Send, Store } from "lucide-react";
import { toast } from "sonner";

const agentTypes = ['Text', 'Voice', 'Image', 'Audio', 'Multimodal'] as const;

const Agents = () => {
  const navigate = useNavigate();
  const { agents, loading, createAgent, updateAgent, deleteAgent, refreshAgents, shareAgent, submitForReview } = useAgents();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const agentImportInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Agent & { metadata_tags_input: string }>>({
    name: "",
    type: "Text",
    description: "",
    system_prompt: "",
    user_prompt: "",
    icon_name: "Bot",
    metadata_tags_input: "",
    profile_picture_url: "",
  });

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || agent.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.system_prompt || !formData.user_prompt) {
      toast.error("Please fill in all required fields");
      return;
    }

    const agentData: AgentTemplate = {
      name: formData.name,
      type: formData.type || "Text",
      description: formData.description || "",
      system_prompt: formData.system_prompt,
      user_prompt: formData.user_prompt,
      icon_name: formData.icon_name || "Bot",
      metadata_tags: formData.metadata_tags_input?.split(',').map(t => t.trim()).filter(Boolean) || [],
      profile_picture_url: formData.profile_picture_url,
    };

    if (editingAgent) {
      const success = await updateAgent(editingAgent.id, agentData);
      if (success) {
        setIsCreateOpen(false);
        setEditingAgent(null);
        resetForm();
      }
    } else {
      const result = await createAgent(agentData);
      if (result) {
        setIsCreateOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Text",
      description: "",
      system_prompt: "",
      user_prompt: "",
      icon_name: "Bot",
      metadata_tags_input: "",
      profile_picture_url: "",
    });
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      ...agent,
      metadata_tags_input: (agent as any).metadata_tags?.join(', ') || "",
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      await deleteAgent(id);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter a prompt for the image");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;

      setFormData({ ...formData, profile_picture_url: data.imageUrl });
      toast.success("Profile image generated!");
      setIsPromptOpen(false);
      setImagePrompt("");
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, profile_picture_url: publicUrl });
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAllAgents = () => {
    if (agents.length === 0) {
      toast.error("No agents to download");
      return;
    }

    const agentsJson = JSON.stringify(agents, null, 2);
    const blob = new Blob([agentsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${agents.length} agent(s)`);
  };

  const handleDownloadAgent = (agent: Agent) => {
    const agentJson = JSON.stringify(agent, null, 2);
    const blob = new Blob([agentJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded agent: ${agent.name}`);
  };

  const handleImportAgents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Please upload a JSON file");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Handle both single agent and array of agents
      const agentsToImport = Array.isArray(data) ? data : [data];
      
      if (agentsToImport.length === 0) {
        toast.error("No agents found in file");
        return;
      }

      // Validate agent structure
      for (const agent of agentsToImport) {
        if (!agent.name || !agent.system_prompt || !agent.user_prompt) {
          toast.error("Invalid agent data: missing required fields");
          return;
        }
      }

      // Import agents
      let successCount = 0;
      for (const agent of agentsToImport) {
        const agentData: AgentTemplate = {
          name: agent.name,
          type: agent.type || "Text",
          description: agent.description || "",
          system_prompt: agent.system_prompt,
          user_prompt: agent.user_prompt,
          icon_name: agent.icon_name || "Bot",
          metadata_tags: agent.metadata_tags || [],
          profile_picture_url: agent.profile_picture_url || "",
        };
        
        const result = await createAgent(agentData);
        if (result) successCount++;
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} agent(s)`);
        await refreshAgents();
      } else {
        toast.error("Failed to import agents");
      }
    } catch (error) {
      console.error('Error importing agents:', error);
      toast.error("Failed to parse agent file");
    } finally {
      event.target.value = '';
    }
  };

  const handleShareAgent = async () => {
    if (!selectedAgent || !shareEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const success = await shareAgent(selectedAgent.id, shareEmail.trim());
    if (success) {
      setShareDialogOpen(false);
      setShareEmail("");
      setSelectedAgent(null);
    }
  };

  const handleSubmitForReview = async (agent: Agent) => {
    if (confirm(`Submit "${agent.name}" to the marketplace for admin review?`)) {
      await submitForReview(agent.id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <ChatHeader />
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header with Actions */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold">Agents</h1>
              <p className="text-muted-foreground">Manage your AI agents</p>
            </div>
            
            {/* Action Toolbar */}
            <div className="flex flex-wrap gap-2">
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  setEditingAgent(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </DialogTrigger>
              <DialogContent className="w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Agent name"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Type *</label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this agent do?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tags (comma-separated)</label>
                    <Input
                      value={formData.metadata_tags_input}
                      onChange={(e) => setFormData({ ...formData, metadata_tags_input: e.target.value })}
                      placeholder="research, analysis, summarization"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Profile Picture</label>
                    <div className="space-y-3">
                      {formData.profile_picture_url && (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={formData.profile_picture_url} />
                            <AvatarFallback>{formData.name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, profile_picture_url: "" })}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPromptOpen(true)}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImage}
                          className="hidden"
                        />
                      </div>
                      <Input
                        value={formData.profile_picture_url}
                        onChange={(e) => setFormData({ ...formData, profile_picture_url: e.target.value })}
                        placeholder="Or paste image URL"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Icon Name</label>
                    <Input
                      value={formData.icon_name}
                      onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                      placeholder="Bot"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">System Prompt *</label>
                    <Textarea
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      placeholder="You are a helpful assistant..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">User Prompt *</label>
                    <Textarea
                      value={formData.user_prompt}
                      onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
                      placeholder="Help me with..."
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Image Generation Prompt Dialog */}
          <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Agent Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Image Description</label>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe the image you want to generate (e.g., 'A professional AI assistant robot with blue accents in a modern tech style')"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateImage}
                    disabled={isGenerating || !imagePrompt.trim()}
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Image"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPromptOpen(false);
                      setImagePrompt("");
                    }}
                    disabled={isGenerating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {agentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No agents found. Create your first agent to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map(agent => (
                <Card key={agent.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="flex-shrink-0">
                          <AvatarImage src={(agent as any).profile_picture_url} />
                          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">{agent.type}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 items-start flex-shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(agent)} title="Edit agent" className="h-8 w-8">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          setSelectedAgent(agent);
                          setShareDialogOpen(true);
                        }} title="Share agent" className="h-8 w-8">
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        {agent.visibility !== 'published' && agent.visibility !== 'pending_review' && (
                          <Button size="icon" variant="ghost" onClick={() => handleSubmitForReview(agent)} title="Submit to marketplace" className="h-8 w-8">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDownloadAgent(agent)} title="Download agent" className="h-8 w-8">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(agent.id)} title="Delete agent" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agent.description && (
                      <CardDescription className="mb-3">{agent.description}</CardDescription>
                    )}
                    {(agent as any).metadata_tags && (agent as any).metadata_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(agent as any).metadata_tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    {agent.visibility && agent.visibility !== 'private' && (
                      <div className="pt-3 border-t mt-3">
                        <Badge variant="outline" className="text-xs">
                          {agent.visibility === 'published' ? '✓ Published' : 
                           agent.visibility === 'pending_review' ? '⏳ Pending Review' : 
                           '🔗 Shared'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share "{selectedAgent?.name}" with another user by entering their email address.
            </p>
            <Input
              placeholder="user@example.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              type="email"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShareDialogOpen(false);
                setShareEmail("");
                setSelectedAgent(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleShareAgent}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agents;