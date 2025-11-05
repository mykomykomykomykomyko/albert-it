/**
 * Loop visualization utilities for enhanced UI feedback
 */
import { Connection } from "@/types/workflow";
import { LoopDetector, type StronglyConnectedComponent } from "./loopDetection";

export interface DetectedLoop {
  id: string;
  nodes: Set<string>;
  edges: Connection[];
  entryPoint: string;
  exitPoint: string;
  hasConfig: boolean;
  connectionId?: string;
}

/**
 * Detect loops in real-time as connections change
 */
export function detectLoopsInWorkflow(connections: Connection[]): DetectedLoop[] {
  if (connections.length === 0) return [];
  
  try {
    const detector = new LoopDetector(connections);
    const sccs = detector.detectLoops();
    
    return sccs
      .filter(scc => scc.nodes.size > 1 || 
        (scc.nodes.size === 1 && scc.edges.length > 0)) // Include self-loops
      .map((scc, index) => {
        // Find the loop edge (the connection that completes the loop)
        const loopEdge = connections.find(conn => 
          conn.isLoopEdge && 
          scc.nodes.has(conn.fromNodeId) && 
          scc.nodes.has(conn.toNodeId)
        );
        
        const nodesArray = Array.from(scc.nodes);
        
        return {
          id: `loop-${index}`,
          nodes: scc.nodes,
          edges: connections.filter(conn => 
            scc.nodes.has(conn.fromNodeId) && 
            scc.nodes.has(conn.toNodeId)
          ),
          entryPoint: scc.entryPoints[0] || nodesArray[0],
          exitPoint: scc.exitPoints[scc.exitPoints.length - 1] || nodesArray[nodesArray.length - 1],
          hasConfig: loopEdge?.isLoopEdge || false,
          connectionId: loopEdge?.id,
        };
      });
  } catch (error) {
    console.warn("Error detecting loops:", error);
    return [];
  }
}

/**
 * Check if a connection would create a new loop
 */
export function wouldCreateLoop(
  connections: Connection[],
  fromNodeId: string,
  toNodeId: string
): boolean {
  const testConnections = [
    ...connections,
    {
      id: 'test-connection',
      fromNodeId,
      toNodeId,
    } as Connection,
  ];
  
  const loops = detectLoopsInWorkflow(testConnections);
  return loops.length > detectLoopsInWorkflow(connections).length;
}

/**
 * Check if a node is part of any loop
 */
export function isNodeInLoop(nodeId: string, loops: DetectedLoop[]): boolean {
  return loops.some(loop => loop.nodes.has(nodeId));
}

/**
 * Get all loops containing a specific node
 */
export function getLoopsForNode(nodeId: string, loops: DetectedLoop[]): DetectedLoop[] {
  return loops.filter(loop => loop.nodes.has(nodeId));
}

/**
 * Check if a connection is part of a loop (but not the loop edge)
 */
export function isConnectionInLoop(
  connectionId: string,
  loops: DetectedLoop[]
): boolean {
  return loops.some(loop => 
    loop.edges.some(edge => edge.id === connectionId) &&
    loop.connectionId !== connectionId
  );
}

/**
 * Check if a connection is the loop edge (backward connection that completes the loop)
 */
export function isLoopEdge(
  connectionId: string,
  loops: DetectedLoop[]
): boolean {
  return loops.some(loop => loop.connectionId === connectionId);
}

/**
 * Get visual style for a connection based on loop status
 */
export function getConnectionStyle(
  connection: Connection,
  loops: DetectedLoop[],
  isSelected: boolean
) {
  const isLoop = isLoopEdge(connection.id, loops);
  const inLoop = isConnectionInLoop(connection.id, loops);
  
  if (isSelected) {
    return {
      stroke: "hsl(var(--warning))",
      strokeWidth: 3,
      strokeOpacity: 0.9,
      strokeDasharray: isLoop ? "8,4" : undefined,
    };
  }
  
  if (isLoop) {
    return {
      stroke: "hsl(var(--accent))",
      strokeWidth: 2.5,
      strokeOpacity: 0.8,
      strokeDasharray: "8,4",
    };
  }
  
  if (inLoop) {
    return {
      stroke: "hsl(var(--accent))",
      strokeWidth: 2,
      strokeOpacity: 0.5,
      strokeDasharray: undefined,
    };
  }
  
  return {
    stroke: "hsl(var(--primary))",
    strokeWidth: 2,
    strokeOpacity: 0.4,
    strokeDasharray: undefined,
  };
}

/**
 * Get badge text for loop configuration
 */
export function getLoopBadgeText(connection: Connection): string | null {
  if (!connection.isLoopEdge || !connection.loopConfig) return null;
  
  const config = connection.loopConfig;
  const parts: string[] = [];
  
  if (config.maxIterations) {
    parts.push(`Max ${config.maxIterations}×`);
  }
  
  if (config.convergenceThreshold) {
    parts.push(`Conv ${(config.convergenceThreshold * 100).toFixed(0)}%`);
  }
  
  if (config.timeoutSeconds) {
    parts.push(`${config.timeoutSeconds}s`);
  }
  
  return parts.length > 0 ? parts.join(" | ") : "Loop";
}
