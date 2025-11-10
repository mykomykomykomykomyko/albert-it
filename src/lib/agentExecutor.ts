import type { AgentNode, ToolInstance } from "@/types/workflow";

export interface AgentExecutionOptions {
  systemPrompt: string;
  userPrompt: string;
  tools: Array<{
    toolId: string;
    config: Record<string, any>;
  }>;
  images?: string[];
  knowledgeDocuments?: Array<{
    filename: string;
    content: string;
  }>;
}

export interface AgentExecutionResult {
  success: boolean;
  output?: string;
  toolOutputs?: Array<{
    toolId: string;
    toolName?: string;
    output: any;
  }>;
  error?: string;
}

export class AgentExecutor {
  /**
   * Execute an agent with the run-agent edge function
   */
  static async execute(
    options: AgentExecutionOptions
  ): Promise<AgentExecutionResult> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            tools: options.tools,
            images: options.images,
            knowledgeDocuments: options.knowledgeDocuments,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: errorData.error || `Server error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        output: data.output || "No output generated",
        toolOutputs: data.toolOutputs || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute an agent node with input processing
   */
  static async executeNode(
    agent: AgentNode,
    input: string,
    userInput?: string
  ): Promise<AgentExecutionResult> {
    const userPrompt = agent.userPrompt
      .replace(/{input}/g, input)
      .replace(/{prompt}/g, userInput || "No input provided");

    const toolsPayload = agent.tools.map((t) => ({
      toolId: t.toolId,
      config: t.config,
    }));

    return this.execute({
      systemPrompt: agent.systemPrompt,
      userPrompt,
      tools: toolsPayload,
      images: agent.images,
    });
  }

  /**
   * Prepare tools payload from tool instances
   */
  static prepareToolsPayload(
    tools: ToolInstance[]
  ): Array<{ toolId: string; config: Record<string, any> }> {
    return tools.map((t) => ({
      toolId: t.toolId,
      config: t.config,
    }));
  }
}
