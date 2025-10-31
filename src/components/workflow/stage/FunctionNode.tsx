import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, AlertCircle, Circle, Trash2, Minimize2, Copy } from "lucide-react";
import type { FunctionNode as FunctionNodeType } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";
import { FunctionRegistry } from "@/lib/functionRegistry";

interface FunctionNodeProps {
  node: FunctionNodeType;
  isSelected: boolean;
  isConnecting: boolean;
  nodeNumber: string;
  stageIndex: number;
  layoutId?: string;
  onSelect: () => void;
  onDelete: () => void;
  onToggleMinimize: () => void;
  onPortClick: (nodeId: string, isOutput: boolean, outputPort?: string) => void;
}

const statusConfig = {
  idle: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted" },
  running: { icon: Play, color: "text-warning", bg: "bg-warning/10" },
  complete: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export const FunctionNode = ({ 
  node, 
  isSelected, 
  isConnecting, 
  nodeNumber, 
  stageIndex, 
  layoutId = 'default', 
  onSelect, 
  onDelete, 
  onToggleMinimize, 
  onPortClick 
}: FunctionNodeProps) => {
  const functionDef = FunctionRegistry.getById(node.functionType);
  const Icon = functionDef?.icon || Circle;
  const statusInfo = statusConfig[node.status || 'idle'];
  const StatusIcon = statusInfo.icon;
  const { toast } = useToast();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete function "${node.name}"?`)) {
      onDelete();
    }
  };

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMinimize();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.output) {
      toast({
        title: "No output",
        description: "This function hasn't generated any output yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(String(node.output));
      toast({
        title: "Copied",
        description: "Output copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const statusStyles = {
    running: "bg-yellow-50 dark:bg-yellow-950/20",
    complete: "ring-2 ring-green-500",
    error: "ring-2 ring-destructive",
    idle: "",
  };

  if (node.minimized) {
    return (
      <Card 
        className={`w-16 h-16 cursor-pointer transition-all hover:shadow-lg backdrop-blur-sm flex items-center justify-center relative ${
          isSelected ? "ring-2 ring-primary shadow-lg" : ""
        } ${statusStyles[node.status || 'idle']} ${functionDef?.color || "bg-card/50"}`}
        onClick={onToggleMinimize}
        style={{ position: 'relative', zIndex: 20 }}
      >
        <div 
          id={`port-input-${node.id}-${layoutId}`}
          className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-card cursor-pointer hover:scale-125 transition-transform z-20 ${
            isConnecting ? "ring-2 ring-primary animate-pulse" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onPortClick(node.id, false);
          }}
        />
        
        {node.outputPorts.map((portName, idx) => (
          <div 
            key={portName}
            id={`port-output-${node.id}-${portName}-${layoutId}`}
            className={`absolute -bottom-2 w-3 h-3 rounded-full bg-primary border-2 border-card cursor-pointer hover:scale-125 transition-transform z-20 ${
              isConnecting ? "ring-2 ring-primary animate-pulse" : ""
            }`}
            style={{ 
              left: node.outputPorts.length > 1 
                ? `${((idx + 1) / (node.outputPorts.length + 1)) * 100}%` 
                : '50%',
              transform: 'translateX(-50%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPortClick(node.id, true, portName);
            }}
          />
        ))}
        
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{nodeNumber}</div>
          <StatusIcon className={`h-3 w-3 mx-auto mt-0.5 ${statusInfo.color}`} />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`p-3 cursor-pointer transition-all hover:shadow-lg w-full min-w-[240px] backdrop-blur-sm group ${
        isSelected ? "ring-2 ring-primary shadow-lg" : ""
      } ${statusStyles[node.status || 'idle']} ${functionDef?.color || "bg-card/50"}`}
      onClick={onSelect}
      style={{ position: 'relative', zIndex: 20 }}
    >
      <div 
        id={`port-input-${node.id}-${layoutId}`}
        className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-card cursor-pointer hover:scale-125 transition-transform z-20 ${
          isConnecting ? "ring-2 ring-primary animate-pulse" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onPortClick(node.id, false);
        }}
      />
      
      {node.outputPorts.map((portName, idx) => (
        <div 
          key={portName}
          id={`port-output-${node.id}-${portName}-${layoutId}`}
          className={`absolute -bottom-2 w-3 h-3 rounded-full bg-primary border-2 border-card cursor-pointer hover:scale-125 transition-transform z-20 ${
            isConnecting ? "ring-2 ring-primary animate-pulse" : ""
          }`}
          style={{ 
            left: node.outputPorts.length > 1 
              ? `${((idx + 1) / (node.outputPorts.length + 1)) * 100}%` 
              : '50%',
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPortClick(node.id, true, portName);
          }}
          title={portName}
        />
      ))}

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${functionDef?.color || "bg-primary/10"}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate">{node.name}</h4>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCopy}
                  title="Copy output"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleToggleMinimize}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1 ${statusInfo.color}`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-xs capitalize">{node.status || 'idle'}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {functionDef?.category || "function"}
          </Badge>
          {node.outputPorts.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {node.outputPorts.length} outputs
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {functionDef?.description || "Custom function"}
        </p>
        
        {node.outputPorts.length > 1 && (
          <div className="flex gap-1 text-[10px] text-muted-foreground">
            <span>Outputs:</span>
            {node.outputPorts.map((port) => (
              <Badge key={port} variant="outline" className="text-[9px] px-1 py-0 h-4">
                {port}
              </Badge>
            ))}
          </div>
        )}
        
        {node.output && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold text-foreground">Output:</span>
            </div>
            <p className="text-muted-foreground line-clamp-2 font-mono">
              {typeof node.output === 'object' ? JSON.stringify(node.output, null, 2) : String(node.output)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};