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
  ): Promise<void> {
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

    // Process stream and wait for completion
    await this.processStream(conversationId, messageId, reader, onChunk);
  }

  private async processStream(
    conversationId: string,
    messageId: string,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk?: (content: string) => void
  ) {
    const decoder = new TextDecoder();
    let accumulatedContent = "";
    let buffer = "";
    let displayQueue: string[] = [];
    let isDisplaying = false;

    // Smooth character-by-character display
    const displayNextChunk = async () => {
      if (isDisplaying || displayQueue.length === 0) return;
      isDisplaying = true;

      while (displayQueue.length > 0) {
        const chunk = displayQueue.shift()!;
        
        // Split into characters for ultra-smooth display
        for (let i = 0; i < chunk.length; i++) {
          accumulatedContent += chunk[i];
          if (onChunk) {
            onChunk(accumulatedContent);
          }
          // Small delay for smooth typing effect (adjust for speed)
          if (i % 3 === 0) { // Update every 3 characters for balance
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
      
      isDisplaying = false;
    };

    try {
      console.log(`📖 [${conversationId}] Starting smooth token-by-token stream for message ${messageId}`);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✅ [${conversationId}] Stream complete. Final length: ${accumulatedContent.length}`);
          // Display any remaining queued content
          await displayNextChunk();
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(6).trim();
              
              if (jsonStr && jsonStr !== "{}" && jsonStr !== "[DONE]") {
                const data = JSON.parse(jsonStr);

                if (data.error) {
                  console.error(`❌ [${conversationId}] Stream error:`, data.error);
                  accumulatedContent = `Error: ${data.error}`;
                  
                  if (onChunk) {
                    onChunk(accumulatedContent);
                  }
                } else {
                  const text = data.choices?.[0]?.delta?.content || data.text;
                  
                  if (text) {
                    // Add to display queue for smooth rendering
                    displayQueue.push(text);
                    
                    // Start displaying if not already
                    if (!isDisplaying) {
                      displayNextChunk();
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

      // Process any remaining buffer content
      if (buffer.trim()) {
        if (buffer.startsWith("data: ")) {
          try {
            const jsonStr = buffer.substring(6).trim();
            if (jsonStr && jsonStr !== "{}" && jsonStr !== "[DONE]") {
              const data = JSON.parse(jsonStr);
              const text = data.choices?.[0]?.delta?.content || data.text;
              if (text) {
                displayQueue.push(text);
                await displayNextChunk();
              }
            }
          } catch (e) {
            console.warn(`⚠️ [${conversationId}] Failed to parse final buffer:`, e);
          }
        }
      }

      // Final save to database
      console.log(`💾 [${conversationId}] Saving final content (${accumulatedContent.length} chars) to DB`);
      
      if (accumulatedContent.length === 0) {
        console.error(`❌ [${conversationId}] No content accumulated! Setting error message.`);
        accumulatedContent = "I apologize, but I received an empty response. Please try again.";
      }
      
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
