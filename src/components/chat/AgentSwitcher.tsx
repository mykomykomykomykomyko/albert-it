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
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border focus-visible:ring-primary"
            />
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 pr-4">
              <button
                onClick={() => handleSelectAgent(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                  !selectedAgent 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-accent border border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Default Agent</p>
                  <p className="text-sm text-muted-foreground">General purpose assistant</p>
                </div>
                {!selectedAgent && (
                  <Badge variant="default" className="bg-primary">Active</Badge>
                )}
              </button>
              <div className="h-px bg-border my-2" />
              {filteredAgents.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No agents found' : 'No custom agents available'}
                  </p>
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                      selectedAgent?.id === agent.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-accent border border-transparent'
                    }`}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-border">
                      <AvatarImage src={agent.profile_picture_url} />
                      <AvatarFallback className="bg-gradient-to-br from-accent to-muted font-semibold">
                        {agent.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{agent.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {agent.description || agent.type}
                      </p>
                    </div>
                    {selectedAgent?.id === agent.id && (
                      <Badge variant="default" className="bg-primary">Active</Badge>
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
