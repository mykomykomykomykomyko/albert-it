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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Search, FileText, Sparkles, Trash2 } from "lucide-react";
import { useAgents, Agent, AgentTemplate } from "@/hooks/useAgents";

interface AgentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAgent: (agent: Agent) => void;
}

const defaultTemplates: AgentTemplate[] = Object.freeze([
  Object.freeze({
    name: "Researcher",
    type: "Text",
    description: "Gather and analyze information from various sources",
    system_prompt: "You are a research assistant specializing in gathering and analyzing information from various sources.",
    user_prompt: "Research the following topic and provide detailed findings: {input}",
    icon_name: "Search",
  }),
  Object.freeze({
    name: "Summarizer",
    type: "Text",
    description: "Condense long content into concise summaries",
    system_prompt: "You are a summarization expert who creates concise, accurate summaries of long content.",
    user_prompt: "Summarize the following content: {input}",
    icon_name: "FileText",
  }),
  Object.freeze({
    name: "Analyst",
    type: "Text",
    description: "Deep data analysis and pattern identification",
    system_prompt: "You are a data analyst who provides insightful analysis and identifies patterns in data.",
    user_prompt: "Analyze the following data and provide insights: {input}",
    icon_name: "Bot",
  }),
  Object.freeze({
    name: "Writer",
    type: "Text",
    description: "Create engaging written content",
    system_prompt: "You are a professional writer who creates compelling, well-structured content.",
    user_prompt: "Write content based on the following: {input}",
    icon_name: "FileText",
  }),
]) as AgentTemplate[];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
          <DialogTitle>Select Agent</DialogTitle>
          <DialogDescription>
            Choose an agent to use in your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 space-y-4">
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
          
          <ScrollArea className="flex-1 px-6 mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agents found. Try adjusting your filters or create a new agent in the Agents page.
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
