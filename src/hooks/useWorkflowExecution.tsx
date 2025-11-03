import { useState, useCallback } from "react";
import type {
  Workflow,
  WorkflowNode,
  AgentNode,
  FunctionNode,
  LogEntry,
} from "@/types/workflow";
import { AgentExecutor } from "@/lib/agentExecutor";
import { FunctionExecutor } from "@/lib/functionExecutor";

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

  const runWorkflow = useCallback(async () => {
    const allNodes = workflow.stages.flatMap((s) => s.nodes);

    onAddLog("info", "🚀 Workflow execution started");
    setIsRunning(true);

    allNodes.forEach((node) => {
      onUpdateNode(node.id, { status: "idle", output: undefined });
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
        } else if (node.nodeType === "function") {
          const { outputs: functionOutputs, primaryOutput } =
            await executeFunction(node.id, input);
          functionOutputs.forEach((value, key) => {
            outputs.set(key, value);
          });
          outputs.set(node.id, primaryOutput);
        }
      });

      await Promise.all(nodePromises);
      onAddLog("success", `✓ Stage ${i + 1} completed`);
    }

    onAddLog("success", "🎉 Workflow execution completed");
    setIsRunning(false);
  }, [workflow, userInput, onUpdateNode, onAddLog]);

  return {
    runSingleAgent,
    runSingleFunction,
    runWorkflow,
    isRunning,
  };
};
