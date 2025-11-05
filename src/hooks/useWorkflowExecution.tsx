import { useState, useCallback, useRef } from "react";
import type {
  Workflow,
  WorkflowNode,
  AgentNode,
  FunctionNode,
  LogEntry,
  LoopMetadata,
} from "@/types/workflow";
import { AgentExecutor } from "@/lib/agentExecutor";
import { FunctionExecutor } from "@/lib/functionExecutor";
import { LoopDetector } from "@/lib/loopDetection";
import { BreakConditionEvaluator } from "@/lib/breakConditions";

export interface UseWorkflowExecutionOptions {
  workflow: Workflow;
  userInput: string;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onAddLog: (type: LogEntry["type"], message: string) => void;
}

export const useWorkflowExecution = ({
  workflow,
  userInput,
  onUpdateNode,
  onAddLog,
}: UseWorkflowExecutionOptions) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeLoops, setActiveLoops] = useState<LoopMetadata[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const globalExecutionCountRef = useRef<number>(0);
  const MAX_GLOBAL_EXECUTIONS = 1000;

  const runSingleAgent = useCallback(
    async (nodeId: string) => {
      const allNodes = workflow.stages.flatMap((s) => s.nodes);
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node || node.nodeType !== "agent") return;

      const agent = node as AgentNode;

      onAddLog("info", `Starting agent: ${agent.name}`);
      onUpdateNode(nodeId, { status: "running" });

      try {
        const incomingConnections = workflow.connections.filter(
          (c) => c.toNodeId === nodeId
        );

        let input = userInput || "No input provided";
        if (incomingConnections.length > 0) {
          const outputs = incomingConnections
            .map((c) => {
              const fromNode = allNodes.find((n) => n.id === c.fromNodeId);
              if (!fromNode) return "";

              if (
                fromNode.nodeType === "function" &&
                (fromNode as FunctionNode).functionType === "content"
              ) {
                const contentNode = fromNode as FunctionNode;
                return contentNode.output || contentNode.config.content || "";
              }

              return fromNode?.output || "";
            })
            .filter(Boolean);

          if (outputs.length > 0) {
            input = outputs.join("\n\n---\n\n");
            onAddLog(
              "info",
              `Agent ${agent.name} received input from ${incomingConnections.length} connection(s)`
            );
          }
        }

        if (agent.tools.length > 0) {
          agent.tools.forEach((tool) => {
            onAddLog("running", `Executing tool: ${tool.toolId}`);
          });
        }

        const result = await AgentExecutor.executeNode(agent, input, userInput);

        if (!result.success) {
          throw new Error(result.error || "Agent execution failed");
        }

        if (result.toolOutputs && result.toolOutputs.length > 0) {
          result.toolOutputs.forEach((toolOutput) => {
            console.log(`Tool Output [${toolOutput.toolId}]:`, toolOutput.output);
            onAddLog(
              "info",
              `Tool Output [${toolOutput.toolId}]: ${JSON.stringify(
                toolOutput.output,
                null,
                2
              )}`
            );
          });
        }

        onUpdateNode(nodeId, { 
          status: "complete", 
          output: result.output,
          toolOutputs: result.toolOutputs 
        });
        onAddLog("success", `Agent ${agent.name} completed successfully`);
      } catch (error) {
        console.error("Agent execution failed:", error);
        onUpdateNode(nodeId, {
          status: "error",
          output: `Error: ${error}`,
        });
        onAddLog("error", `Agent ${agent.name} failed: ${error}`);
      }
    },
    [workflow, userInput, onUpdateNode, onAddLog]
  );

  const runSingleFunction = useCallback(
    async (nodeId: string) => {
      const allNodes = workflow.stages.flatMap((s) => s.nodes);
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node || node.nodeType !== "function") return;

      const functionNode = node as FunctionNode;

      onAddLog("info", `Executing function: ${functionNode.name}`);
      onUpdateNode(nodeId, { status: "running" });

      try {
        const incomingConnections = workflow.connections.filter(
          (c) => c.toNodeId === nodeId
        );

        let input = userInput || "No input provided";
        if (incomingConnections.length > 0) {
          const outputs = incomingConnections
            .map((c) => {
              const fromNode = allNodes.find((n) => n.id === c.fromNodeId);
              if (!fromNode) return "";

              if (
                fromNode.nodeType === "function" &&
                (fromNode as FunctionNode).functionType === "content"
              ) {
                const contentNode = fromNode as FunctionNode;
                return contentNode.output || contentNode.config.content || "";
              }

              return fromNode?.output || "";
            })
            .filter(Boolean);

          if (outputs.length > 0) {
            input = outputs.join("\n\n---\n\n");
            onAddLog(
              "info",
              `Function ${functionNode.name} received input from ${incomingConnections.length} connection(s)`
            );
          }
        }

        const result = await FunctionExecutor.execute(functionNode, input);

        if (!result.success) {
          throw new Error(result.error || "Function execution failed");
        }

        const outputValue =
          Object.keys(result.outputs).length > 1
            ? result.outputs
            : (result.outputs.output || Object.values(result.outputs)[0] || "");
        onUpdateNode(nodeId, { status: "complete", output: outputValue as any });
        onAddLog("success", `✓ Function ${functionNode.name} completed`);
      } catch (error) {
        console.error("Function execution failed:", error);
        onUpdateNode(nodeId, {
          status: "error",
          output: `Error: ${error}`,
        });
        onAddLog("error", `✗ Function ${functionNode.name} failed: ${error}`);
      }
    },
    [workflow, userInput, onUpdateNode, onAddLog]
  );

  const forceStopLoop = useCallback((loopId: string) => {
    const controller = abortControllersRef.current.get(loopId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(loopId);
      setActiveLoops(prev => prev.filter(l => l.loopId !== loopId));
      onAddLog("warning", `Loop ${loopId.slice(-8)} force stopped by user`);
    }
  }, [onAddLog]);

  const runWorkflow = useCallback(async () => {
    const allNodes = workflow.stages.flatMap((s) => s.nodes);

    onAddLog("info", "🚀 Workflow execution started");
    setIsRunning(true);
    globalExecutionCountRef.current = 0;
    setActiveLoops([]);

    // Detect loops in the workflow
    const detector = new LoopDetector(workflow.connections);
    const detectedLoops = detector.detectLoops();
    
    if (detectedLoops.length > 0) {
      onAddLog("info", `🔄 Detected ${detectedLoops.length} loop(s) in workflow`);
      detectedLoops.forEach(loop => {
        onAddLog("info", `  Loop with ${loop.nodes.size} nodes`);
      });
    }

    // Initialize loop metadata
    const loopMetadataMap = new Map<string, LoopMetadata>();
    detectedLoops.forEach(scc => {
      const metadata = LoopDetector.sccToLoopMetadata(scc, workflow.connections);
      loopMetadataMap.set(metadata.loopId, metadata);
      
      // Mark nodes as being in a loop
      scc.nodes.forEach(nodeId => {
        onUpdateNode(nodeId, { isInLoop: true, loopId: metadata.loopId });
      });
    });

    allNodes.forEach((node) => {
      onUpdateNode(node.id, { 
        status: "idle", 
        output: undefined,
        executionCount: 0,
        previousOutputs: [],
      });
    });

    const outputs = new Map<string, string>();

    const executeAgent = async (
      nodeId: string,
      input: string
    ): Promise<string> => {
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node || node.nodeType !== "agent") return "";

      const agent = node as AgentNode;

      onAddLog(
        "info",
        `Starting agent: ${agent.name} (input length: ${input.length} chars)`
      );
      onUpdateNode(nodeId, { status: "running" });

      try {
        if (agent.tools.length > 0) {
          agent.tools.forEach((tool) => {
            const toolName = tool.toolId.replace("_", " ");
            onAddLog("running", `Executing tool: ${toolName}`);
          });
        }

        const result = await AgentExecutor.executeNode(agent, input, userInput);

        if (!result.success) {
          throw new Error(result.error || "Agent execution failed");
        }

        if (result.toolOutputs && result.toolOutputs.length > 0) {
          result.toolOutputs.forEach((toolOutput) => {
            console.log(`Tool Output [${toolOutput.toolId}]:`, toolOutput.output);
            onAddLog(
              "info",
              `Tool Output [${toolOutput.toolId}]: ${JSON.stringify(
                toolOutput.output,
                null,
                2
              )}`
            );
          });
        }

        const output = result.output || "No output generated";
        onUpdateNode(nodeId, { status: "complete", output });
        onAddLog(
          "success",
          `✓ Agent ${agent.name} completed (output length: ${output.length} chars)`
        );
        return output;
      } catch (error) {
        console.error("Agent execution failed:", error);
        const errorMsg = `Error: ${error}`;
        onUpdateNode(nodeId, { status: "error", output: errorMsg });
        onAddLog("error", `✗ Agent ${agent.name} failed: ${error}`);
        return errorMsg;
      }
    };

    const executeFunction = async (
      nodeId: string,
      input: string
    ): Promise<{
      outputs: Map<string, string>;
      primaryOutput: string;
    }> => {
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node || node.nodeType !== "function")
        return { outputs: new Map(), primaryOutput: "" };

      const functionNode = node as FunctionNode;

      onAddLog(
        "info",
        `Executing function: ${functionNode.name} (input length: ${input.length} chars)`
      );
      onUpdateNode(nodeId, { status: "running" });

      try {
        const result = await FunctionExecutor.execute(functionNode, input);

        if (!result.success) {
          throw new Error(result.error || "Function execution failed");
        }

        const functionOutputs = new Map<string, string>();
        Object.entries(result.outputs).forEach(([port, value]) => {
          const outputKey = `${nodeId}:${port}`;
          functionOutputs.set(outputKey, value);
        });

        let primaryOutput: string;
        if (Object.keys(result.outputs).length > 1) {
          primaryOutput = Object.values(result.outputs)
            .filter((v) => v)
            .join("\n\n---\n\n");
        } else {
          primaryOutput =
            result.outputs.output || Object.values(result.outputs)[0] || "";
        }

        const outputValue =
          Object.keys(result.outputs).length > 1
            ? result.outputs
            : primaryOutput;
        onUpdateNode(nodeId, { status: "complete", output: outputValue as any });
        onAddLog(
          "success",
          `✓ Function ${functionNode.name} completed (output length: ${primaryOutput.length} chars)`
        );

        return { outputs: functionOutputs, primaryOutput };
      } catch (error) {
        console.error("Function execution failed:", error);
        const errorMsg = `Error: ${error}`;
        onUpdateNode(nodeId, { status: "error", output: errorMsg });
        onAddLog("error", `✗ Function ${functionNode.name} failed: ${error}`);
        return { outputs: new Map(), primaryOutput: errorMsg };
      }
    };

    // Execute workflow with loop handling
    let continueLoop = true;
    let globalLoopIteration = 0;
    const MAX_LOOP_ITERATIONS = 1000; // Safety limit for infinite loops

    while (continueLoop && globalLoopIteration < MAX_LOOP_ITERATIONS) {
      continueLoop = false; // Will be set to true if any active loops remain
      globalLoopIteration++;

      for (let i = 0; i < workflow.stages.length; i++) {
        const stage = workflow.stages[i];
        if (stage.nodes.length === 0) continue;

        const agentCount = stage.nodes.filter((n) => n.nodeType === "agent").length;
        const functionCount = stage.nodes.filter(
          (n) => n.nodeType === "function"
        ).length;
        onAddLog(
          "info",
          `▸ Stage ${i + 1}: Processing ${agentCount} agent(s) and ${functionCount} function(s)`
        );

        const nodePromises = stage.nodes.map(async (node) => {
          // Safety check: global execution limit
          if (globalExecutionCountRef.current >= MAX_GLOBAL_EXECUTIONS) {
            onAddLog("error", "⚠️ Global execution limit reached - stopping workflow");
            throw new Error("Global execution limit reached");
          }

          // Check node-specific execution limit
          const nodeExecutionCount = (node as any).executionCount || 0;
          const nodeMaxExecutions = (node as any).maxExecutions || 100;
          
          if (nodeExecutionCount >= nodeMaxExecutions) {
            onAddLog("warning", `Node ${node.name} reached max executions (${nodeMaxExecutions})`);
            return;
          }

          globalExecutionCountRef.current++;
          const incomingConnections = workflow.connections.filter(
            (c) => c.toNodeId === node.id
          );

          let input = userInput || "No input provided";

          if (incomingConnections.length > 0) {
            const connectedOutputs = incomingConnections
              .map((c) => {
                if (c.fromOutputPort) {
                  const portOutput = outputs.get(`${c.fromNodeId}:${c.fromOutputPort}`);
                  return portOutput;
                }
                const nodeOutput = outputs.get(c.fromNodeId);
                if (typeof nodeOutput === "object") {
                  console.warn(
                    `Warning: Node ${c.fromNodeId} output is an object, concatenating values`
                  );
                  return Object.values(nodeOutput)
                    .filter((v) => v)
                    .join("\n\n---\n\n");
                }
                return nodeOutput;
              })
              .filter(Boolean);

            if (connectedOutputs.length > 0) {
              input = connectedOutputs.join("\n\n---\n\n");
              onAddLog(
                "info",
                `${node.name} received input from ${incomingConnections.length} connection(s) (${input.length} chars)`
              );
            }
          }

          if (node.nodeType === "agent") {
            const output = await executeAgent(node.id, input);
            outputs.set(node.id, output);
            
            // Update execution tracking
            onUpdateNode(node.id, {
              executionCount: nodeExecutionCount + 1,
              previousOutputs: [...((node as any).previousOutputs || []), output].slice(-10),
            });

            // Check if node is in a loop and handle loop logic
            if ((node as any).isInLoop) {
              const loopId = (node as any).loopId;
              const loopMetadata = loopMetadataMap.get(loopId);
              
              if (loopMetadata) {
                loopMetadata.currentIteration++;
                loopMetadata.history.push(output);
                
                // Update active loops display
                setActiveLoops(prev => {
                  const updated = prev.filter(l => l.loopId !== loopId);
                  return [...updated, { ...loopMetadata }];
                });

                // Check exit conditions
                const exitCheck = BreakConditionEvaluator.shouldExitLoop(loopMetadata, output);
                
                if (exitCheck.shouldExit) {
                  onAddLog("info", `🔄 Loop exit: ${exitCheck.reason}`);
                  // Mark loop as completed
                  loopMetadata.nodes.forEach(nodeId => {
                    onUpdateNode(nodeId, { isInLoop: false });
                  });
                  loopMetadataMap.delete(loopId);
                  setActiveLoops(prev => prev.filter(l => l.loopId !== loopId));
                } else {
                  // Loop should continue
                  continueLoop = true;
                }
              }
            }
          } else if (node.nodeType === "function") {
            const { outputs: functionOutputs, primaryOutput } =
              await executeFunction(node.id, input);
            functionOutputs.forEach((value, key) => {
              outputs.set(key, value);
            });
            outputs.set(node.id, primaryOutput);
            
            // Update execution tracking
            onUpdateNode(node.id, {
              executionCount: nodeExecutionCount + 1,
              previousOutputs: [...((node as any).previousOutputs || []), primaryOutput].slice(-10),
            });
          }
        });

        await Promise.all(nodePromises);
        onAddLog("success", `✓ Stage ${i + 1} completed`);
      }

      // If no active loops remain, exit
      if (loopMetadataMap.size === 0) {
        continueLoop = false;
      }
    }

    if (globalLoopIteration >= MAX_LOOP_ITERATIONS) {
      onAddLog("error", "⚠️ Maximum loop iterations reached - stopping workflow");
    }

    // Clear any remaining active loops
    setActiveLoops([]);
    onAddLog("success", "🎉 Workflow execution completed");
    setIsRunning(false);
  }, [workflow, userInput, onUpdateNode, onAddLog]);

  return {
    runSingleAgent,
    runSingleFunction,
    runWorkflow,
    isRunning,
    activeLoops,
    forceStopLoop,
  };
};
