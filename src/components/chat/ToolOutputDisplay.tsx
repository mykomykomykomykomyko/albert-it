import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";

interface ToolOutput {
  toolId: string;
  toolName?: string;
  output: any;
}

interface ToolOutputDisplayProps {
  toolOutputs: ToolOutput[];
}

export const ToolOutputDisplay = ({ toolOutputs }: ToolOutputDisplayProps) => {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  if (!toolOutputs || toolOutputs.length === 0) return null;

  const toggleOpen = (toolId: string) => {
    setOpenStates(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wrench className="w-3 h-3" />
        <span>Tool Outputs ({toolOutputs.length})</span>
      </div>
      {toolOutputs.map((tool, index) => {
        const isOpen = openStates[tool.toolId + index] ?? false;
        const hasError = tool.output?.error;
        
        return (
          <Card key={`${tool.toolId}-${index}`} className="p-3">
            <Collapsible open={isOpen} onOpenChange={() => toggleOpen(tool.toolId + index)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between hover:opacity-80">
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {tool.toolName || tool.toolId}
                  </span>
                  {hasError && (
                    <Badge variant="destructive" className="text-xs">Error</Badge>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-60 overflow-y-auto">
                  {JSON.stringify(tool.output, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};
