import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stage } from "./Stage";
import type { Workflow } from "@/types/workflow";
import { useEffect, useState, useRef, useCallback } from "react";
import { X, Repeat, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectLoopsInWorkflow, getConnectionStyle, getLoopBadgeText, isLoopEdge, type DetectedLoop } from "@/lib/loopVisualization";

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
  onStartConnection: (agentId: string, outputPort?: string) => void;
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
  const [detectedLoops, setDetectedLoops] = useState<DetectedLoop[]>([]);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastTouchRef = useRef({ x: 0, y: 0 });

  // Update SVG dimensions based on scroll content
  const updateSvgDimensions = useCallback(() => {
    const scrollContainer = document.getElementById(`workflow-scroll-container-${layoutId}`);
    if (scrollContainer) {
      // Use clientWidth to prevent horizontal expansion, scrollHeight for vertical scrolling
      setSvgDimensions({
        width: scrollContainer.clientWidth,
        height: Math.max(scrollContainer.scrollHeight, scrollContainer.clientHeight)
      });
    }
  }, [layoutId]);

  // Detect loops when connections change
  useEffect(() => {
    const loops = detectLoopsInWorkflow(workflow.connections);
    setDetectedLoops(loops);
  }, [workflow.connections]);

  // Use ResizeObserver for stable connection rendering
  useEffect(() => {
    const scrollContainer = document.getElementById(`workflow-scroll-container-${layoutId}`);
    if (!scrollContainer) return;

    // Initial update
    updateSvgDimensions();
    setForceUpdate((prev) => prev + 1);

    // Setup ResizeObserver for automatic updates
    resizeObserverRef.current = new ResizeObserver(() => {
      updateSvgDimensions();
      setForceUpdate((prev) => prev + 1);
    });

    resizeObserverRef.current.observe(scrollContainer);

    // Also observe all node elements
    const nodeElements = scrollContainer.querySelectorAll('[id^="port-"]');
    nodeElements.forEach(el => resizeObserverRef.current?.observe(el as Element));

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [workflow.stages, workflow.connections, layoutId, updateSvgDimensions]);

  const [connectingFromPort, setConnectingFromPort] = useState<string | undefined>(undefined);

  // Clear selection when entering connection mode
  useEffect(() => {
    if (connectingFrom !== null) {
      setSelectedConnection(null);
    } else {
      setConnectingFromPort(undefined);
    }
  }, [connectingFrom]);

  // Window resize handler (ResizeObserver handles most cases)
  useEffect(() => {
    const handleResize = () => {
      updateSvgDimensions();
      setForceUpdate((prev) => prev + 1);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSvgDimensions]);

  // Handle delete key for connections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedConnection) {
        onDeleteConnection(selectedConnection);
        setSelectedConnection(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnection, onDeleteConnection]);

  const handlePortClick = (agentId: string, isOutput: boolean, outputPort?: string) => {
    if (isOutput && !connectingFrom) {
      setConnectingFromPort(outputPort);
      onStartConnection(agentId, outputPort);
    } else if (!isOutput && connectingFrom && connectingFrom !== agentId) {
      onCompleteConnection(connectingFrom, agentId, connectingFromPort);
      setConnectingFromPort(undefined);
    } else if (connectingFrom) {
      setConnectingFromPort(undefined);
      onStartConnection(null);
    }
  };

  // Touch gesture handlers for pinch-to-zoom and pan
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger gesture - prepare for pinch/pan
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setTouchStartDistance(distance);
      setIsPanning(true);
      lastTouchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPanning) {
      e.preventDefault();
      
      // Handle pinch-to-zoom
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      if (touchStartDistance > 0) {
        const scaleChange = currentDistance / touchStartDistance;
        const newScale = Math.max(0.5, Math.min(2, scale * scaleChange));
        setScale(newScale);
        setTouchStartDistance(currentDistance);
      }

      // Handle two-finger pan
      const currentMidpoint = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      
      setPanOffset({
        x: panOffset.x + (currentMidpoint.x - lastTouchRef.current.x),
        y: panOffset.y + (currentMidpoint.y - lastTouchRef.current.y),
      });
      
      lastTouchRef.current = currentMidpoint;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setTouchStartDistance(0);
  };

  const handleZoomIn = () => setScale(Math.min(2, scale + 0.1));
  const handleZoomOut = () => setScale(Math.max(0.5, scale - 0.1));
  const handleResetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const renderConnections = () => {
    const scrollContainer = document.getElementById(`workflow-scroll-container-${layoutId}`);
    if (!scrollContainer) return null;
    
    const containerRect = scrollContainer.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollTop = scrollContainer.scrollTop;
    
    return workflow.connections.map((conn) => {
      const fromNode = workflow.stages.flatMap(s => s.nodes).find(n => n.id === conn.fromNodeId);
      const toNode = workflow.stages.flatMap(s => s.nodes).find(n => n.id === conn.toNodeId);
      if (!fromNode || !toNode) return null;
      
      // Build the correct output port ID
      let outputPortId = `port-output-${conn.fromNodeId}-${layoutId}`;
      if (conn.fromOutputPort) {
        outputPortId = `port-output-${conn.fromNodeId}-${conn.fromOutputPort}-${layoutId}`;
      }
      
      const fromEl = document.getElementById(outputPortId);
      const toEl = document.getElementById(`port-input-${conn.toNodeId}-${layoutId}`);
      if (!fromEl || !toEl) return null;
      
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      
      const x1 = fromRect.left + fromRect.width / 2 - containerRect.left + scrollLeft - 1;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + scrollTop + 5;
      const x2 = toRect.left + toRect.width / 2 - containerRect.left + scrollLeft - 1;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top + scrollTop - 5;
      
      const controlY1 = y1 + Math.abs(y2 - y1) * 0.5;
      const controlY2 = y2 - Math.abs(y2 - y1) * 0.5;
      
      const path = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;
      
      const isSelected = selectedConnection === conn.id;
      const isConnectingMode = connectingFrom !== null;
      
      // Get style based on loop status
      const style = getConnectionStyle(conn, detectedLoops, isSelected);
      const isLoop = isLoopEdge(conn.id, detectedLoops);
      const badgeText = getLoopBadgeText(conn);
      
      // Calculate midpoint for badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      return (
        <g key={conn.id}>
          {/* Invisible wider path for easier clicking */}
          <path
            d={path}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ cursor: 'pointer', pointerEvents: isConnectingMode ? 'none' : 'auto' }}
            onClick={(e) => {
              if (!isConnectingMode) {
                e.stopPropagation();
                setSelectedConnection(conn.id);
              }
            }}
          />
          {/* Visible path */}
          <path
            d={path}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            strokeOpacity={style.strokeOpacity}
            strokeDasharray={style.strokeDasharray}
            fill="none"
            markerEnd={isLoop ? `url(#arrowhead-loop-${layoutId})` : (isSelected ? `url(#arrowhead-selected-${layoutId})` : `url(#arrowhead-${layoutId})`)}
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Loop badge */}
          {isLoop && badgeText && (
            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x="-40"
                y="-12"
                width="80"
                height="24"
                rx="12"
                fill="hsl(var(--accent))"
                fillOpacity="0.9"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight="600"
                fill="hsl(var(--accent-foreground))"
              >
                {badgeText}
              </text>
            </g>
          )}
        </g>
      );
    });
  };
  return (
    <div className="h-full bg-gradient-to-br from-canvas-background to-muted/20 overflow-hidden relative" id={`workflow-canvas-${layoutId}`}>
      {/* Mobile zoom controls */}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col gap-2 lg:hidden">
        <Button
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={handleZoomIn}
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={handleZoomOut}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={handleResetZoom}
        >
          <span className="text-xs font-bold">1:1</span>
        </Button>
      </div>

      <div className="h-full p-2 lg:p-3">
        <Card 
          className="h-full bg-canvas-background/50 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-xl overflow-x-hidden overflow-y-auto flex flex-col relative touch-pan-y" 
          id={`workflow-scroll-container-${layoutId}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedConnection(null);
              }
            }}>
            <svg 
              key={forceUpdate}
              className="absolute top-0 left-0" 
              style={{ 
                width: `${svgDimensions.width}px`, 
                height: `${svgDimensions.height}px`, 
                zIndex: 15,
                minWidth: '100%',
                minHeight: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                <marker id={`arrowhead-${layoutId}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" fillOpacity="0.4" />
                </marker>
                <marker id={`arrowhead-selected-${layoutId}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--warning))" fillOpacity="0.8" />
                </marker>
                <marker id={`arrowhead-loop-${layoutId}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--accent))" fillOpacity="0.8" />
                </marker>
              </defs>
              {renderConnections()}
            </svg>
            
            {/* Loop detection panel */}
            {detectedLoops.length > 0 && (
              <div className="absolute top-4 right-4 z-20 max-w-sm">
                <Card className="p-3 bg-card/95 backdrop-blur-sm border-accent/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold">Detected Loops</span>
                    <Badge variant="secondary" className="ml-auto">{detectedLoops.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {detectedLoops.map((loop) => (
                      <div key={loop.id} className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{loop.nodes.size} nodes</span>
                          {loop.hasConfig ? (
                            <Badge variant="default" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Not Configured
                            </Badge>
                          )}
                        </div>
                        {!loop.hasConfig && (
                          <p className="text-muted-foreground text-[10px]">
                            Click the loop edge to configure
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            
      {/* Connection delete UI */}
            {selectedConnection && !connectingFrom && (
              <>
                {/* Mobile delete button */}
                <div className="fixed bottom-24 lg:bottom-20 left-1/2 -translate-x-1/2 z-50 lg:hidden">
                  <Card className="p-3 bg-card shadow-lg flex items-center gap-2">
                    <span className="text-xs text-muted-foreground px-2">Connection selected</span>
                    <button
                      onClick={() => {
                        onDeleteConnection(selectedConnection);
                        setSelectedConnection(null);
                      }}
                      className="px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 active:scale-95 transition-transform"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedConnection(null)}
                      className="px-3 py-2 bg-muted text-foreground rounded-md text-sm font-medium hover:bg-muted/80 active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </Card>
                </div>
                
                {/* Desktop delete hint */}
                <div className="hidden lg:block fixed bottom-6 right-6 z-50">
                  <Card className="p-3 bg-card shadow-lg border-warning/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Connection selected</span>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Delete</kbd>
                        <span className="text-xs text-muted-foreground">to remove</span>
                      </div>
                      <button
                        onClick={() => setSelectedConnection(null)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </Card>
                </div>
              </>
            )}
            
            <div 
              className="p-2 lg:p-3 space-y-3 w-full max-w-full transition-transform origin-top-left" 
              style={{ 
                position: 'relative', 
                zIndex: 5,
                transform: `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`,
              }}
            >
              {workflow.stages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
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
