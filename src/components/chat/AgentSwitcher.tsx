import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useAgents, Agent } from '@/hooks/useAgents';

interface AgentSwitcherProps {
  selectedAgent: Agent | null;
  onAgentChange: (agent: Agent | null) => void;
}

export function AgentSwitcher({ selectedAgent, onAgentChange }: AgentSwitcherProps) {
  const { agents, loading } = useAgents();

  if (loading) {
    return (
      <Button variant="outline" disabled>
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Agent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAgentChange(null)}>
          <div className="flex items-center gap-2 w-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">Default Agent</p>
              <p className="text-xs text-muted-foreground">General purpose assistant</p>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {agents.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No custom agents available
          </div>
        ) : (
          agents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => onAgentChange(agent)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={agent.profile_picture_url} />
                  <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {agent.description || agent.type}
                  </p>
                </div>
                {selectedAgent?.id === agent.id && (
                  <Badge variant="secondary" className="ml-auto">Active</Badge>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
