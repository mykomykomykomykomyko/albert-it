import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlackboardEntry {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  iteration: number;
  metadata?: Record<string, unknown>;
}

interface Context {
  blackboard: BlackboardEntry[];
  scratchpad: string;
  namedAttributes: Array<{ name: string; value: unknown }>;
  artifacts: Array<{ name: string; type: string }>;
  currentIteration: number;
  maxIterations: number;
}

interface RequestBody {
  systemPrompt: string;
  userPrompt?: string;
  model: string;
  context: Context;
  enabledTools: string[];
  iteration: number;
}

// Tool definitions for the Free Agent
const getToolDefinitions = (enabledTools: string[]) => {
  const allTools = [
    {
      type: "function",
      function: {
        name: "write_to_blackboard",
        description: "Write an observation, insight, plan, decision, or other important information to the blackboard for future reference",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["observation", "insight", "plan", "decision", "error", "artifact", "question", "answer", "progress", "memory"],
              description: "The type of entry"
            },
            content: {
              type: "string",
              description: "The content to write"
            }
          },
          required: ["type", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_scratchpad",
        description: "Update the scratchpad with working notes, calculations, or temporary information",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The new scratchpad content (replaces existing)"
            }
          },
          required: ["content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "store_attribute",
        description: "Store a named attribute/variable for later use",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The attribute name"
            },
            value: {
              type: "string",
              description: "The value to store (as JSON string if complex)"
            }
          },
          required: ["name", "value"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_artifact",
        description: "Create an artifact (document, code, report, etc.) as output",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the artifact"
            },
            type: {
              type: "string",
              enum: ["text", "code", "json", "markdown", "file"],
              description: "Type of artifact"
            },
            content: {
              type: "string",
              description: "The artifact content"
            }
          },
          required: ["name", "type", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "signal_complete",
        description: "Signal that the task is complete and no more iterations are needed",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "A brief summary of what was accomplished"
            }
          },
          required: ["summary"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "request_user_input",
        description: "Pause execution and request input from the user",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question or request for the user"
            }
          },
          required: ["question"]
        }
      }
    },
    // External tools
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for information using Brave Search",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            numResults: {
              type: "number",
              description: "Number of results to return (default 10)"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "web_scrape",
        description: "Scrape content from a web page",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to scrape"
            }
          },
          required: ["url"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_current_time",
        description: "Get the current date and time",
        parameters: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "Timezone (e.g., 'America/Toronto')"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name or location"
            }
          },
          required: ["location"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "think",
        description: "Extended thinking space for complex reasoning. Use this to work through problems step by step.",
        parameters: {
          type: "object",
          properties: {
            reasoning: {
              type: "string",
              description: "Your extended reasoning and thought process"
            }
          },
          required: ["reasoning"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "summarize",
        description: "Create a concise summary of given content",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to summarize"
            },
            style: {
              type: "string",
              enum: ["brief", "detailed", "bullet_points"],
              description: "Summary style"
            }
          },
          required: ["content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "analyze",
        description: "Perform detailed analysis of content",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to analyze"
            },
            analysisType: {
              type: "string",
              enum: ["sentiment", "entities", "structure", "general"],
              description: "Type of analysis"
            }
          },
          required: ["content"]
        }
      }
    },
  ];

  // Filter tools based on enabled list (always include memory tools)
  const memoryTools = ["write_to_blackboard", "update_scratchpad", "store_attribute", "create_artifact", "signal_complete", "request_user_input", "think"];
  
  return allTools.filter(tool => {
    const name = tool.function.name;
    return memoryTools.includes(name) || enabledTools.includes(name);
  });
};

// Build system message with context
const buildSystemMessage = (systemPrompt: string, context: Context): string => {
  let contextSection = "\n\n## Current Context\n";
  
  // Add iteration info
  contextSection += `\n### Iteration: ${context.currentIteration + 1} of ${context.maxIterations}\n`;
  
  // Add blackboard entries
  if (context.blackboard.length > 0) {
    contextSection += "\n### Blackboard (Recent Entries)\n";
    context.blackboard.slice(-10).forEach(entry => {
      contextSection += `- [${entry.type.toUpperCase()}] ${entry.content}\n`;
    });
  }
  
  // Add scratchpad
  if (context.scratchpad) {
    contextSection += `\n### Scratchpad\n${context.scratchpad}\n`;
  }
  
  // Add named attributes
  if (context.namedAttributes.length > 0) {
    contextSection += "\n### Stored Attributes\n";
    context.namedAttributes.forEach(attr => {
      const valueStr = typeof attr.value === 'string' ? attr.value : JSON.stringify(attr.value);
      contextSection += `- ${attr.name}: ${valueStr.slice(0, 200)}${valueStr.length > 200 ? '...' : ''}\n`;
    });
  }
  
  // Add artifacts list
  if (context.artifacts.length > 0) {
    contextSection += "\n### Created Artifacts\n";
    context.artifacts.forEach(art => {
      contextSection += `- ${art.name} (${art.type})\n`;
    });
  }
  
  contextSection += `
## Instructions
- Use the blackboard to record important observations, insights, decisions, and progress
- Use the scratchpad for working notes and temporary calculations
- Use store_attribute to save important values for later reference
- Use create_artifact to produce final outputs
- Use signal_complete when you have fully completed the task
- Use request_user_input if you need clarification
- Be systematic and record your progress
- If you notice you're repeating yourself, try a different approach or signal completion
`;

  return systemPrompt + contextSection;
};

// Execute internal memory tools
const executeInternalTool = async (
  toolName: string,
  args: Record<string, unknown>,
  context: Context
): Promise<{ result: unknown; blackboardUpdate?: BlackboardEntry; isComplete?: boolean; requestInput?: string }> => {
  const timestamp = new Date().toISOString();
  const iteration = context.currentIteration;
  
  switch (toolName) {
    case "write_to_blackboard":
      const entry: BlackboardEntry = {
        id: crypto.randomUUID(),
        type: args.type as string,
        content: args.content as string,
        timestamp,
        iteration,
      };
      return { result: "Written to blackboard", blackboardUpdate: entry };
      
    case "update_scratchpad":
      return { result: `Scratchpad updated with ${(args.content as string).length} characters` };
      
    case "store_attribute":
      return { result: `Attribute '${args.name}' stored` };
      
    case "create_artifact":
      return { result: `Artifact '${args.name}' created (${args.type})` };
      
    case "signal_complete":
      return { result: args.summary, isComplete: true };
      
    case "request_user_input":
      return { result: "Waiting for user input", requestInput: args.question as string };
      
    case "think":
      return { result: "Thinking complete" };
      
    case "summarize":
      return { result: `Summary of content: ${(args.content as string).slice(0, 100)}...` };
      
    case "analyze":
      return { result: `Analysis complete (${args.analysisType || 'general'})` };
      
    default:
      return { result: `Unknown internal tool: ${toolName}` };
  }
};

// Execute external tool by calling other edge functions
const executeExternalTool = async (
  toolName: string,
  args: Record<string, unknown>,
  supabaseUrl: string,
  authHeader: string
): Promise<unknown> => {
  const toolEndpoints: Record<string, string> = {
    web_search: "brave-search",
    web_scrape: "web-scrape",
    get_current_time: "time",
    get_weather: "weather",
  };
  
  const endpoint = toolEndpoints[toolName];
  if (!endpoint) {
    return { error: `Unknown external tool: ${toolName}` };
  }
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(args),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Tool error: ${errorText}` };
    }
    
    return await response.json();
  } catch (error) {
    return { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { systemPrompt, userPrompt, model, context, enabledTools, iteration } = body;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const authHeader = req.headers.get("Authorization") || "";
    
    // Build messages
    const messages = [
      { role: "system", content: buildSystemMessage(systemPrompt, context) },
    ];
    
    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }
    
    // Get tool definitions
    const tools = getToolDefinitions(enabledTools);
    
    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.5-flash",
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
      }),
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${errorText}`);
    }
    
    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const message = choice?.message;
    
    // Process tool calls if present
    const blackboardUpdates: BlackboardEntry[] = [];
    const toolResults: Array<{ toolId: string; toolName: string; result: unknown; error?: string }> = [];
    let isComplete = false;
    let requestInput: string | undefined;
    let scratchpadUpdate: unknown;
    const newArtifacts: Array<{ name: string; type: string; content: string }> = [];
    
    if (message?.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown> = {};
        
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }
        
        // Check if internal or external tool
        const internalTools = ["write_to_blackboard", "update_scratchpad", "store_attribute", "create_artifact", "signal_complete", "request_user_input", "think", "summarize", "analyze"];
        
        if (internalTools.includes(toolName)) {
          const result = await executeInternalTool(toolName, args, context);
          
          if (result.blackboardUpdate) {
            blackboardUpdates.push(result.blackboardUpdate);
          }
          if (result.isComplete) {
            isComplete = true;
          }
          if (result.requestInput) {
            requestInput = result.requestInput;
          }
          if (toolName === "update_scratchpad") {
            scratchpadUpdate = { content: args.content, lastUpdated: new Date().toISOString() };
          }
          if (toolName === "create_artifact") {
            newArtifacts.push({
              name: args.name as string,
              type: args.type as string,
              content: args.content as string,
            });
          }
          
          toolResults.push({
            toolId: toolCall.id,
            toolName,
            result: result.result,
          });
        } else {
          // External tool
          const result = await executeExternalTool(toolName, args, supabaseUrl, authHeader);
          toolResults.push({
            toolId: toolCall.id,
            toolName,
            result,
            error: (result as Record<string, unknown>)?.error as string | undefined,
          });
        }
      }
    }
    
    const response = {
      iteration,
      response: {
        content: message?.content || null,
        toolCalls: message?.tool_calls,
        finishReason: choice?.finish_reason || "stop",
        usage: aiData.usage ? {
          promptTokens: aiData.usage.prompt_tokens,
          completionTokens: aiData.usage.completion_tokens,
          totalTokens: aiData.usage.total_tokens,
        } : undefined,
      },
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      blackboardUpdates,
      scratchpadUpdate,
      newArtifacts: newArtifacts.length > 0 ? newArtifacts : undefined,
      isComplete,
      shouldStop: isComplete || !!requestInput,
      stopReason: isComplete ? "Task completed" : requestInput ? "User input requested" : undefined,
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Free agent error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
