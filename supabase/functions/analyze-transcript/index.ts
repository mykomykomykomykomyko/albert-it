import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Analyzing transcript with Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that analyzes meeting transcripts. Extract key information accurately and structure it properly."
          },
          {
            role: "user",
            content: `Analyze the following meeting transcript and extract the information using the provided function.

Transcript:
${transcript}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_meeting",
              description: "Analyze a meeting transcript and extract summary and action items",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A concise executive summary of the meeting (2-4 sentences covering main topics, decisions, and purpose)"
                  },
                  key_decisions: {
                    type: "string",
                    description: "Key decisions made during the meeting"
                  },
                  action_items: {
                    type: "array",
                    description: "List of action items extracted from the meeting",
                    items: {
                      type: "object",
                      properties: {
                        task: {
                          type: "string",
                          description: "Description of the task or action item"
                        },
                        owner: {
                          type: "string",
                          description: "Person responsible for the task (use '[Your Name]' if not specified)"
                        },
                        deadline: {
                          type: "string",
                          description: "Deadline for the task (use 'ASAP' or 'TBD' if not specified)"
                        }
                      },
                      required: ["task", "owner", "deadline"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["summary", "action_items"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_meeting" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lovable AI response:", JSON.stringify(data, null, 2));

    // Extract the function call result
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_meeting") {
      throw new Error("No valid function call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Parsed analysis result:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({
        summary: result.summary || "",
        action_items: result.action_items || [],
        key_decisions: result.key_decisions || ""
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-transcript:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
