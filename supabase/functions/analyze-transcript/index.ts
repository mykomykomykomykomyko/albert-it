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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    console.log("Analyzing transcript with Gemini...");

    const prompt = `You are an AI assistant that analyzes meeting transcripts. Extract key information accurately and structure it properly.

Analyze this meeting transcript and extract:
1. A concise summary (2-3 sentences)
2. Key decisions made
3. Action items with responsible parties

Transcript:
${transcript}

Use the analyze_meeting function to provide your analysis.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        tools: [{
          function_declarations: [{
            name: "analyze_meeting",
            description: "Analyze a meeting transcript and extract structured information",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "A concise summary of the meeting (2-3 sentences)"
                },
                actionItems: {
                  type: "array",
                  description: "List of action items from the meeting",
                  items: {
                    type: "object",
                    properties: {
                      task: {
                        type: "string",
                        description: "The action item task"
                      },
                      assignee: {
                        type: "string",
                        description: "Person responsible for the task"
                      },
                      dueDate: {
                        type: "string",
                        description: "Due date if mentioned"
                      }
                    },
                    required: ["task"]
                  }
                },
                keyDecisions: {
                  type: "array",
                  description: "Key decisions made during the meeting",
                  items: {
                    type: "string",
                    description: "A key decision"
                  }
                }
              },
              required: ["summary", "actionItems", "keyDecisions"]
            }
          }]
        }],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["analyze_meeting"]
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze transcript" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));

    // Extract the function call from Gemini's response
    const functionCall = data.candidates?.[0]?.content?.parts?.find((part: any) => part.functionCall);
    if (!functionCall?.functionCall || functionCall.functionCall.name !== "analyze_meeting") {
      throw new Error("No valid function call in response");
    }

    const analysisResult = functionCall.functionCall.args;

    return new Response(
      JSON.stringify({
        summary: analysisResult.summary || "",
        action_items: analysisResult.actionItems || [],
        key_decisions: analysisResult.keyDecisions || ""
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
