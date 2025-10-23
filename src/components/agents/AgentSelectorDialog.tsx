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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Bot, Search, FileText, Sparkles, Trash2, Edit } from "lucide-react";
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
    type: "researcher",
    description: "Gather and analyze information from various sources",
    system_prompt: "You are a research assistant specializing in gathering and analyzing information from various sources.",
    user_prompt: "Research the following topic and provide detailed findings: {input}",
    icon_name: "Search",
  },
  {
    name: "Summarizer",
    type: "summarizer",
    description: "Condense long content into concise summaries",
    system_prompt: "You are a summarization expert who creates concise, accurate summaries of long content.",
    user_prompt: "Summarize the following content: {input}",
    icon_name: "FileText",
  },
  {
    name: "Analyst",
    type: "analyst",
    description: "Deep data analysis and pattern identification",
    system_prompt: "You are a data analyst who provides insightful analysis and identifies patterns in data.",
    user_prompt: "Analyze the following data and provide insights: {input}",
    icon_name: "Bot",
  },
  {
    name: "Writer",
    type: "writer",
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

export const AgentSelectorDialog = ({
  open,
  onOpenChange,
  onSelectAgent,
}: AgentSelectorDialogProps) => {
  const { agents, loading, createAgent, deleteAgent } = useAgents();
  const [isCreating, setIsCreating] = useState(false);
  const [newAgent, setNewAgent] = useState<AgentTemplate>({
    name: "",
    type: "",
    description: "",
    system_prompt: "",
    user_prompt: "",
    icon_name: "Bot",
  });

  const handleCreateFromTemplate = async (template: AgentTemplate) => {
    const agent = await createAgent(template);
    if (agent) {
      onSelectAgent(agent);
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
      setIsCreating(false);
      setNewAgent({
        name: "",
        type: "",
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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select or Create Agent</DialogTitle>
          <DialogDescription>
            Choose a template, use a saved agent, or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="saved" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="saved">My Agents</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No saved agents yet. Create one or use a template!
                </div>
              ) : (
                <div className="grid gap-3 pb-6">
                  {agents.map((agent) => {
                    const Icon = iconMap[agent.icon_name] || Bot;
                    return (
                      <Card
                        key={agent.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-all hover:ring-2 hover:ring-primary/20 group"
                        onClick={() => {
                          onSelectAgent(agent);
                          onOpenChange(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold">{agent.name}</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDelete(agent.id, e)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {agent.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {agent.description}
                              </p>
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

          <TabsContent value="templates" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-6">
              <div className="grid gap-3 pb-6">
                {defaultTemplates.map((template) => {
                  const Icon = iconMap[template.icon_name] || Bot;
                  return (
                    <Card
                      key={template.type}
                      className="p-4 cursor-pointer hover:shadow-md transition-all hover:ring-2 hover:ring-primary/20"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Card>
                  );
                })}
              </div>
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
