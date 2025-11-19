import { supabase } from "@/integrations/supabase/client";

interface ActiveStream {
  conversationId: string;
  messageId: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abortController: AbortController;
}

class StreamManager {
  private activeStreams: Map<string, ActiveStream> = new Map();

  async startStream(
    conversationId: string,
    messageId: string,
    response: Response,
    onChunk?: (content: string) => void
  ) {
    // Cancel any existing stream for this conversation
    this.cancelStream(conversationId);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const abortController = new AbortController();
    this.activeStreams.set(conversationId, {
      conversationId,
      messageId,
      reader,
      abortController,
    });

    // Process stream in background
    this.processStream(conversationId, messageId, reader, onChunk);
  }

  private async processStream(
    conversationId: string,
    messageId: string,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk?: (content: string) => void
  ) {
    const decoder = new TextDecoder();
    let accumulatedContent = "";

    try {
      console.log(`📖 [${conversationId}] Starting stream for message ${messageId}`);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✅ [${conversationId}] Stream complete. Length: ${accumulatedContent.length}`);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(6).trim();
              if (jsonStr && jsonStr !== "{}" && jsonStr !== "[DONE]") {
                const data = JSON.parse(jsonStr);

                if (data.error) {
                  console.error(`❌ [${conversationId}] Stream error:`, data.error);
                  accumulatedContent = `Error: ${data.error}`;
                } else {
                  // Support both formats: OpenAI-style (choices[0].delta.content) and simple (text)
                  const text = data.choices?.[0]?.delta?.content || data.text;
                  
                  if (text) {
                    accumulatedContent += text;
                    
                    // Update database immediately
                    await supabase
                      .from("messages")
                      .update({ content: accumulatedContent })
                      .eq("id", messageId);

                    // Notify listeners (for UI updates if viewing this conversation)
                    if (onChunk) {
                      onChunk(accumulatedContent);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn(`⚠️ [${conversationId}] Failed to parse line:`, e);
            }
          }
        }
      }

      // Final save
      console.log(`💾 [${conversationId}] Saving final content to DB`);
      await supabase
        .from("messages")
        .update({ content: accumulatedContent })
        .eq("id", messageId);

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    } catch (error: any) {
      console.error(`❌ [${conversationId}] Stream error:`, error);
      await supabase
        .from("messages")
        .update({ content: accumulatedContent || "Error processing response" })
        .eq("id", messageId);
    } finally {
      // Clean up
      this.activeStreams.delete(conversationId);
      console.log(`🧹 [${conversationId}] Stream cleaned up`);
    }
  }

  cancelStream(conversationId: string) {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      console.log(`🛑 [${conversationId}] Cancelling stream`);
      stream.abortController.abort();
      stream.reader.cancel();
      this.activeStreams.delete(conversationId);
    }
  }

  isStreaming(conversationId: string): boolean {
    return this.activeStreams.has(conversationId);
  }

  cancelAllStreams() {
    console.log("🛑 Cancelling all streams");
    for (const [conversationId] of this.activeStreams) {
      this.cancelStream(conversationId);
    }
  }
}

// Singleton instance
export const streamManager = new StreamManager();
