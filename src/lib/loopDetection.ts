import type { Connection, LoopMetadata } from "@/types/workflow";

export interface StronglyConnectedComponent {
  id: string;
  nodes: Set<string>;
  edges: string[];
  entryPoints: string[];
  exitPoints: string[];
}

/**
 * Detects all loops (strongly connected components) in the workflow graph
 * Uses Tarjan's algorithm for efficient cycle detection
 */
export class LoopDetector {
  private index = 0;
  private stack: string[] = [];
  private indices = new Map<string, number>();
  private lowLinks = new Map<string, number>();
  private onStack = new Set<string>();
  private sccs: StronglyConnectedComponent[] = [];
  private adjacencyList: Map<string, string[]>;
  private connections: Connection[];

  constructor(connections: Connection[]) {
    this.connections = connections;
    this.adjacencyList = this.buildAdjacencyList(connections);
  }

  private buildAdjacencyList(connections: Connection[]): Map<string, string[]> {
    const adjList = new Map<string, string[]>();
    
    connections.forEach(conn => {
      if (!adjList.has(conn.fromNodeId)) {
        adjList.set(conn.fromNodeId, []);
      }
      adjList.get(conn.fromNodeId)!.push(conn.toNodeId);
    });
    
    return adjList;
  }

  /**
   * Tarjan's algorithm for finding strongly connected components
   */
  private strongConnect(node: string) {
    this.indices.set(node, this.index);
    this.lowLinks.set(node, this.index);
    this.index++;
    this.stack.push(node);
    this.onStack.add(node);

    const neighbors = this.adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!this.indices.has(neighbor)) {
        this.strongConnect(neighbor);
        this.lowLinks.set(
          node,
          Math.min(this.lowLinks.get(node)!, this.lowLinks.get(neighbor)!)
        );
      } else if (this.onStack.has(neighbor)) {
        this.lowLinks.set(
          node,
          Math.min(this.lowLinks.get(node)!, this.indices.get(neighbor)!)
        );
      }
    }

    // Found a strongly connected component
    if (this.lowLinks.get(node) === this.indices.get(node)) {
      const component: string[] = [];
      let w: string;
      do {
        w = this.stack.pop()!;
        this.onStack.delete(w);
        component.push(w);
      } while (w !== node);

      // Only consider components with more than 1 node (actual cycles)
      if (component.length > 1) {
        this.sccs.push(this.createSCC(component));
      }
    }
  }

  private createSCC(nodes: string[]): StronglyConnectedComponent {
    const nodeSet = new Set(nodes);
    const edges = this.connections
      .filter(c => nodeSet.has(c.fromNodeId) && nodeSet.has(c.toNodeId))
      .map(c => c.id);

    // Find entry and exit points
    const entryPoints = nodes.filter(node => {
      const incomingFromOutside = this.connections.some(
        c => c.toNodeId === node && !nodeSet.has(c.fromNodeId)
      );
      return incomingFromOutside;
    });

    const exitPoints = nodes.filter(node => {
      const outgoingToOutside = this.connections.some(
        c => c.fromNodeId === node && !nodeSet.has(c.toNodeId)
      );
      return outgoingToOutside;
    });

    return {
      id: `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodes: nodeSet,
      edges,
      entryPoints: entryPoints.length > 0 ? entryPoints : [nodes[0]],
      exitPoints: exitPoints.length > 0 ? exitPoints : [nodes[nodes.length - 1]],
    };
  }

  /**
   * Detect all loops in the workflow
   */
  detectLoops(): StronglyConnectedComponent[] {
    const allNodes = new Set<string>();
    this.connections.forEach(c => {
      allNodes.add(c.fromNodeId);
      allNodes.add(c.toNodeId);
    });

    for (const node of allNodes) {
      if (!this.indices.has(node)) {
        this.strongConnect(node);
      }
    }

    return this.sccs;
  }

  /**
   * Check if a specific node is part of any loop
   */
  static isNodeInLoop(nodeId: string, loops: StronglyConnectedComponent[]): boolean {
    return loops.some(loop => loop.nodes.has(nodeId));
  }

  /**
   * Get all loops that contain a specific node
   */
  static getLoopsForNode(nodeId: string, loops: StronglyConnectedComponent[]): StronglyConnectedComponent[] {
    return loops.filter(loop => loop.nodes.has(nodeId));
  }

  /**
   * Convert SCC to LoopMetadata with default configuration
   */
  static sccToLoopMetadata(scc: StronglyConnectedComponent, connections: Connection[]): LoopMetadata {
    // Find if any edge in the loop has loop configuration
    const loopEdges = connections.filter(c => scc.edges.includes(c.id) && c.isLoopEdge);
    const loopConfig = loopEdges.find(e => e.loopConfig)?.loopConfig;

    return {
      loopId: scc.id,
      nodes: scc.nodes,
      edges: scc.edges,
      entryNode: scc.entryPoints[0],
      exitNode: scc.exitPoints[0],
      currentIteration: 0,
      maxIterations: loopConfig?.maxIterations || 10,
      exitConditions: loopConfig?.exitConditions || [{ type: 'max_iterations' }],
      history: [],
      startTime: Date.now(),
      timeoutMs: loopConfig?.timeoutSeconds ? loopConfig.timeoutSeconds * 1000 : 300000, // 5 min default
    };
  }
}
