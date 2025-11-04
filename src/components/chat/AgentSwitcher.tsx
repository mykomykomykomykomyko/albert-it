import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search } from 'lucide-react';
import { useAgents, Agent } from '@/hooks/useAgents';

interface AgentSwitcherProps {
  selectedAgent: Agent | null;
  onAgentChange: (agent: Agent | null) => void;
}

export function AgentSwitcher({ selectedAgent, onAgentChange }: AgentSwitcherProps) {
  const { agents, loading } = useAgents();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedAgents = [...agents].sort((a, b) => a.name.localeCompare(b.name));
  const filteredAgents = sortedAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAgent = (agent: Agent | null) => {
    onAgentChange(agent);
    setOpen(false);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <Button variant="outline" disabled>
        Loading...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {selectedAgent ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedAgent.profile_picture_url} />
                <AvatarFallback>{selectedAgent.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <span>Default Agent</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>Select Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              <button
                onClick={() => handleSelectAgent(null)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Default Agent</p>
                  <p className="text-sm text-muted-foreground">General purpose assistant</p>
                </div>
                {!selectedAgent && (
                  <Badge variant="secondary">Active</Badge>
                )}
              </button>
              {filteredAgents.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No agents found' : 'No custom agents available'}
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.profile_picture_url} />
                      <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {agent.description || agent.type}
                      </p>
                    </div>
                    {selectedAgent?.id === agent.id && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
