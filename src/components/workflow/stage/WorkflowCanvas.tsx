import { Card } from "@/components/ui/card";
import { Stage } from "./Stage";
import type { Workflow } from "@/types/workflow";
import { useEffect, useState } from "react";

interface WorkflowCanvasProps {
  workflow: Workflow;
  selectedNode: string | null;
  connectingFrom: string | null;
  layoutId?: string;
  onSelectNode: (id: string | null) => void;
  onAddAgent: (stageId: string, agentTemplate: any) => void;
  onAddNode: (stageId: string, template: any, nodeType: "agent" | "function" | "tool") => void;
  onDeleteAgent: (agentId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onRenameStage: (stageId: string, name: string) => void;
  onReorderStages: (fromIndex: number, toIndex: number) => void;
  onToggleMinimize: (agentId: string) => void;
  onStartConnection: (agentId: string | null, outputPort?: string) => void;
  onCompleteConnection: (fromAgentId: string, toAgentId: string, fromOutputPort?: string) => void;
  onDeleteConnection: (connectionId: string) => void;
}

export const WorkflowCanvas = ({
  workflow,
  selectedNode,
  connectingFrom,
  layoutId = 'default',
  onSelectNode,
  onAddAgent,
  onAddNode,
  onDeleteAgent,
  onDeleteStage,
  onRenameStage,
  onReorderStages,
  onToggleMinimize,
  onStartConnection,
  onCompleteConnection,
  onDeleteConnection,
}: WorkflowCanvasProps) => {
  const [forceUpdate, setForceUpdate] = useState(0);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectingFromPort, setConnectingFromPort] = useState<string | undefined>(undefined);

  const updateSvgDimensions = () => {
    const scrollContainer = document.getElementById(`workflow-scroll-container-${layoutId}`);
    if (scrollContainer) {
      setSvgDimensions({
        width: scrollContainer.clientWidth,
        height: Math.max(scrollContainer.scrollHeight, scrollContainer.clientHeight)
      });
    }
  };

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        updateSvgDimensions();
        setForceUpdate((prev) => prev + 1);
      }, 50),
      setTimeout(() => {
        updateSvgDimensions();
        setForceUpdate((prev) => prev + 1);
      }, 150),
    ];
    return () => timers.forEach(clearTimeout);
  }, [workflow.connections, workflow.stages]);

  useEffect(() => {
    if (connectingFrom !== null) {
      setSelectedConnection(null);
    } else {
      setConnectingFromPort(undefined);
    }
  }, [connectingFrom]);

  const handlePortClick = (nodeId: string, isOutput: boolean, outputPort?: string) => {
    if (isOutput && !connectingFrom) {
      setConnectingFromPort(outputPort);
      onStartConnection(nodeId, outputPort);
    } else if (!isOutput && connectingFrom && connectingFrom !== nodeId) {
      onCompleteConnection(connectingFrom, nodeId, connectingFromPort);
      setConnectingFromPort(undefined);
    } else if (connectingFrom) {
      setConnectingFromPort(undefined);
      onStartConnection(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-canvas-background to-muted/20 overflow-hidden relative" id={`workflow-canvas-${layoutId}`}>
      <div className="flex-1 flex flex-col p-2 lg:p-3">
        <Card className="flex-1 bg-canvas-background/50 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-xl overflow-x-hidden overflow-y-auto flex flex-col relative" id={`workflow-scroll-container-${layoutId}`}>
          <svg 
            key={forceUpdate}
            className="absolute top-0 left-0 pointer-events-none" 
            style={{ 
              width: `${svgDimensions.width}px`, 
              height: `${svgDimensions.height}px`, 
              zIndex: 15,
              minWidth: '100%',
              minHeight: '100%'
            }}
          >
            <defs>
              <marker id={`arrowhead-${layoutId}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" fillOpacity="0.3" />
              </marker>
            </defs>
          </svg>
          
          <div className="p-2 lg:p-3 space-y-3 w-full max-w-full" style={{ position: 'relative', zIndex: 5 }}>
            {workflow.stages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center space-y-3 max-w-md">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Start Building Your Workflow</h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Add Stage" to create your first stage, then drag agents from the sidebar to build your workflow.
                  </p>
                </div>
              </div>
            ) : (
              workflow.stages.map((stage, index) => (
                <Stage
                  key={stage.id}
                  stage={stage}
                  stageNumber={index + 1}
                  stageIndex={index}
                  selectedNode={selectedNode}
                  connectingFrom={connectingFrom}
                  layoutId={layoutId}
                  onSelectNode={onSelectNode}
                  onAddAgent={onAddAgent}
                  onAddNode={onAddNode}
                  onDeleteAgent={onDeleteAgent}
                  onDeleteStage={onDeleteStage}
                  onRenameStage={onRenameStage}
                  onReorderStages={onReorderStages}
                  onToggleMinimize={onToggleMinimize}
                  onPortClick={handlePortClick}
                />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};