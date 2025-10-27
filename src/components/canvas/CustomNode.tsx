import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, Play, CheckCircle2, XCircle, Loader2, Sparkles, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CustomNodeData {
  label: string;
  nodeType: 'agent' | 'function' | 'trigger';
  status?: 'idle' | 'running' | 'success' | 'error';
  output?: string;
  description?: string;
  onEdit?: () => void;
  onRun?: () => void;
}

export const CustomNode = memo(({ data, selected }: NodeProps<CustomNodeData>) => {
  const getIcon = () => {
    switch (data.nodeType) {
      case 'agent':
        return <Sparkles className="h-4 w-4" />;
      case 'function':
        return <Zap className="h-4 w-4" />;
      case 'trigger':
        return <Database className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getNodeColor = () => {
    switch (data.nodeType) {
      case 'agent':
        return 'from-primary/20 to-primary/5 border-primary/40';
      case 'function':
        return 'from-accent/20 to-accent/5 border-accent/40';
      case 'trigger':
        return 'from-secondary/20 to-secondary/5 border-secondary/40';
      default:
        return 'from-muted to-background border-border';
    }
  };

  return (
    <div
      className={`
        min-w-[220px] rounded-lg border-2 shadow-lg bg-gradient-to-br
        transition-all duration-200
        ${getNodeColor()}
        ${selected ? 'ring-2 ring-primary shadow-xl scale-105' : 'hover:shadow-xl'}
      `}
    >
      {/* Input Handle */}
      {data.nodeType !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
        />
      )}

      {/* Node Header */}
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 rounded-md bg-background/50">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{data.label}</div>
            {data.description && (
              <div className="text-xs text-muted-foreground truncate">{data.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.();
            }}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Node Body */}
      {data.output && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Output:</div>
          <div className="text-xs bg-background/50 rounded p-2 max-h-20 overflow-y-auto font-mono">
            {data.output.substring(0, 100)}
            {data.output.length > 100 && '...'}
          </div>
        </div>
      )}

      {/* Node Footer */}
      <div className="px-3 py-2 flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {data.nodeType}
        </Badge>
        {data.onRun && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              data.onRun?.();
            }}
            disabled={data.status === 'running'}
          >
            <Play className="h-3 w-3" />
            Test
          </Button>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
