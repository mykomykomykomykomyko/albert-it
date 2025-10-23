import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bot, Search, FileText, Sparkles, Trash2 } from "lucide-react";
import { useAgents, Agent, AgentTemplate } from "@/hooks/useAgents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAgent: (agent: Agent) => void;
}

const defaultTemplates: AgentTemplate[] = [
  {
    name: "Researcher",
    type: "Text",
    description: "Gather and analyze information from various sources",
    system_prompt: "You are a research assistant specializing in gathering and analyzing information from various sources.",
    user_prompt: "Research the following topic and provide detailed findings: {input}",
    icon_name: "Search",
  },
  {
    name: "Summarizer",
    type: "Text",
    description: "Condense long content into concise summaries",
    system_prompt: "You are a summarization expert who creates concise, accurate summaries of long content.",
    user_prompt: "Summarize the following content: {input}",
    icon_name: "FileText",
  },
  {
    name: "Analyst",
    type: "Text",
    description: "Deep data analysis and pattern identification",
    system_prompt: "You are a data analyst who provides insightful analysis and identifies patterns in data.",
    user_prompt: "Analyze the following data and provide insights: {input}",
    icon_name: "Bot",
  },
  {
    name: "Writer",
    type: "Text",
    description: "Create engaging written content",
    system_prompt: "You are a professional writer who creates compelling, well-structured content.",
    user_prompt: "Write content based on the following: {input}",
    icon_name: "FileText",
  },
];

const iconMap: Record<string, any> = {
  Search,
  FileText,
  Bot,
  Sparkles,
};

const agentTypes = ['Text', 'Voice', 'Image', 'Audio', 'Multimodal'] as const;

export const AgentSelectorDialog = ({
  open,
  onOpenChange,
  onSelectAgent,
}: AgentSelectorDialogProps) => {
  const { agents, loading, createAgent, deleteAgent } = useAgents();
  const [selectedTab, setSelectedTab] = useState<'agents' | 'create'>('agents');
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newAgent, setNewAgent] = useState<AgentTemplate>({
    name: "",
    type: "Text",
    description: "",
    system_prompt: "",
    user_prompt: "",
    icon_name: "Bot",
  });

  const allAgents = [...agents, ...defaultTemplates];
  
  const filteredAgents = allAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || agent.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSelectAgent = async (agent: Agent | AgentTemplate) => {
    // If it's a template (doesn't have id), create it first
    if (!('id' in agent)) {
      const newAgent = await createAgent(agent as AgentTemplate);
      if (newAgent) {
        onSelectAgent(newAgent);
        onOpenChange(false);
      }
    } else {
      onSelectAgent(agent as Agent);
      onOpenChange(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!newAgent.name || !newAgent.system_prompt || !newAgent.user_prompt) {
      return;
    }
    const agent = await createAgent(newAgent);
    if (agent) {
      onSelectAgent(agent);
      setNewAgent({
        name: "",
        type: "Text",
        description: "",
        system_prompt: "",
        user_prompt: "",
        icon_name: "Bot",
      });
      onOpenChange(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this agent?")) {
      await deleteAgent(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-[90vh] max-w-none flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select or Create Agent</DialogTitle>
          <DialogDescription>
            Choose an agent or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="agents">All Agents</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="flex-1 overflow-hidden mt-4">
            <div className="px-6 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {agentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100%-80px)] px-6 mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No agents found. Try adjusting your filters or create a new agent.
                </div>
              ) : (
                <div className="grid gap-3 pb-6">
                  {filteredAgents.map((agent, idx) => {
                    const Icon = iconMap[agent.icon_name] || Bot;
                    const isTemplate = !('id' in agent);
                    return (
                      <Card
                        key={isTemplate ? `template-${idx}` : (agent as Agent).id}
                        className="p-4 cursor-pointer hover:shadow-md transition-all hover:ring-2 hover:ring-primary/20 group"
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={(agent as any).profile_picture_url} />
                            <AvatarFallback>
                              <Icon className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{agent.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{agent.type}</Badge>
                                  {isTemplate && <Badge variant="outline" className="text-xs">Template</Badge>}
                                </div>
                              </div>
                              {!isTemplate && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => handleDelete((agent as Agent).id, e)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {agent.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {agent.description}
                              </p>
                            )}
                            {(agent as any).metadata_tags && (agent as any).metadata_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(agent as any).metadata_tags.map((tag: string, tagIdx: number) => (
                                  <Badge key={tagIdx} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    placeholder="e.g., My Custom Agent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={newAgent.type} onValueChange={(value) => setNewAgent({ ...newAgent, type: value })}>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    placeholder="What does this agent do?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system">System Prompt *</Label>
                  <Textarea
                    id="system"
                    value={newAgent.system_prompt}
                    onChange={(e) => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
                    placeholder="You are a helpful assistant who..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user">User Prompt Template *</Label>
                  <Textarea
                    id="user"
                    value={newAgent.user_prompt}
                    onChange={(e) => setNewAgent({ ...newAgent, user_prompt: e.target.value })}
                    placeholder="Process the following: {input}"
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{input}"} as a placeholder for user messages
                  </p>
                </div>

                <Button
                  onClick={handleCreateCustom}
                  disabled={!newAgent.name || !newAgent.system_prompt || !newAgent.user_prompt}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create and Use Agent
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
