import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, Play, CheckCircle2, XCircle, Loader2, Sparkles, FileInput, FileOutput, GitMerge, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CustomNodeData {
  label: string;
  nodeType: 'input' | 'agent' | 'output' | 'join' | 'transform';
  status?: 'idle' | 'running' | 'success' | 'error';
  output?: string;
  description?: string;
  files?: File[];
  config?: Record<string, any>;
  orientation?: 'vertical' | 'horizontal';
  onEdit?: () => void;
  onRun?: () => void;
}

export const CustomNode = memo(({ data, selected }: NodeProps<CustomNodeData>) => {
  const getIcon = () => {
    switch (data.nodeType) {
      case 'input':
        return <FileInput className="h-4 w-4" />;
      case 'agent':
        return <Sparkles className="h-4 w-4" />;
      case 'output':
        return <FileOutput className="h-4 w-4" />;
      case 'join':
        return <GitMerge className="h-4 w-4" />;
      case 'transform':
        return <Repeat className="h-4 w-4" />;
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
      case 'input':
        return 'border-blue-400/50 bg-blue-50/50 dark:bg-blue-950/20';
      case 'agent':
        return 'border-primary/50 bg-primary/5';
      case 'output':
        return 'border-green-400/50 bg-green-50/50 dark:bg-green-950/20';
      case 'join':
        return 'border-purple-400/50 bg-purple-50/50 dark:bg-purple-950/20';
      case 'transform':
        return 'border-orange-400/50 bg-orange-50/50 dark:bg-orange-950/20';
      default:
        return 'border-border bg-card';
    }
  };

  return (
    <div
      className={`
        min-w-[240px] max-w-[300px] rounded-lg border-2 shadow-md bg-card
        transition-all duration-200
        ${getNodeColor()}
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md hover:border-primary/30'}
      `}
    >
      {/* Input Handles */}
      {data.orientation === 'horizontal' ? (
        // Horizontal mode: left side is input
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-primary !border-2 !border-background !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all"
        />
      ) : (
        // Vertical mode: top is input (except for input nodes)
        data.nodeType !== 'input' && (
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-primary !border-2 !border-background !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all"
          />
        )
      )}

      {/* Node Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2 bg-muted/30">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-background shadow-sm">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate text-foreground">{data.label}</div>
            {data.description && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">{data.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusIcon()}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.();
            }}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Node Body */}
      {data.output && (
        <div className="px-4 py-3 border-b bg-muted/10">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Latest Output</div>
          <div className="text-xs bg-background rounded-md p-2.5 max-h-24 overflow-y-auto overflow-x-hidden font-mono text-foreground border break-all whitespace-normal">
            {data.output.substring(0, 200)}
            {data.output.length > 200 && '...'}
          </div>
        </div>
      )}

      {/* Node Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-background/50">
        <Badge variant="secondary" className="text-xs font-medium">
          {data.nodeType}
        </Badge>
        {data.onRun && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground"
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

      {/* Output Handles */}
      {data.orientation === 'horizontal' ? (
        // Horizontal mode: right side is output
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary !border-2 !border-background !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all"
        />
      ) : (
        // Vertical mode: bottom is output (except for output nodes)
        data.nodeType !== 'output' && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-primary !border-2 !border-background !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all"
          />
        )
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
