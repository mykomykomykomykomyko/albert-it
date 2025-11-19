import { supabase } from "@/integrations/supabase/client";

interface ActiveStream {
  conversationId: string;
  messageId: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abortController: AbortController;
  accumulatedContent: string;
  lastSaveTime: number;
  displayQueue: string[];
  isDisplaying: boolean;
  displayedContent: string;
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
    await this.cancelStream(conversationId);

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
      accumulatedContent: "",
      lastSaveTime: Date.now(),
      displayQueue: [],
      isDisplaying: false,
      displayedContent: "",
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
    const SAVE_INTERVAL = 1000; // Save to DB every 1 second
    const CHAR_DELAY = 1; // 1ms per character for very fast typing effect
    let lastSaveTime = Date.now();

    // Fast character-by-character display
    const displayCharacterByCharacter = async () => {
      const stream = this.activeStreams.get(conversationId);
      if (!stream || stream.isDisplaying) return;

      stream.isDisplaying = true;

      while (stream.displayQueue.length > 0) {
        const char = stream.displayQueue.shift()!;
        stream.displayedContent += char;
        
        if (onChunk) {
          onChunk(stream.displayedContent);
        }

        // Very small delay for fast character-by-character effect
        await new Promise(resolve => setTimeout(resolve, CHAR_DELAY));
      }

      stream.isDisplaying = false;

      // Continue if more content accumulated while displaying
      if (stream.accumulatedContent.length > stream.displayedContent.length) {
        const newChars = stream.accumulatedContent.slice(stream.displayedContent.length);
        stream.displayQueue.push(...newChars.split(''));
        displayCharacterByCharacter();
      }
    };

    // Function to save current content to database
    const saveToDatabase = async (content: string) => {
      if (content.length === 0) return;
      
      try {
        await supabase
          .from("messages")
          .update({ content })
          .eq("id", messageId);
        
        // Update stream's accumulated content and last save time
        const stream = this.activeStreams.get(conversationId);
        if (stream) {
          stream.accumulatedContent = content;
          stream.lastSaveTime = Date.now();
        }
        
        lastSaveTime = Date.now();
      } catch (error) {
        console.error(`❌ [${conversationId}] Failed to save to DB:`, error);
      }
    };

    try {
      console.log(`📖 [${conversationId}] Starting smooth token-by-token stream`);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✅ [${conversationId}] Stream complete. Final length: ${accumulatedContent.length}`);
          
          // Wait for display queue to finish
          const stream = this.activeStreams.get(conversationId);
          if (stream) {
            while (stream.displayQueue.length > 0 || stream.isDisplaying) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Final update with complete content
            if (onChunk && stream.displayedContent.length < accumulatedContent.length) {
              onChunk(accumulatedContent);
            }
          }
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
                    // Accumulate content
                    accumulatedContent += text;
                    
                    // Update stream and add to display queue
                    const stream = this.activeStreams.get(conversationId);
                    if (stream) {
                      stream.accumulatedContent = accumulatedContent;
                      // Add new characters to display queue
                      stream.displayQueue.push(...text.split(''));
                      
                      // Start fast character-by-character display
                      if (!stream.isDisplaying) {
                        displayCharacterByCharacter();
                      }
                    }
                    
                    // Periodic save to database
                    if (Date.now() - lastSaveTime > SAVE_INTERVAL) {
                      saveToDatabase(accumulatedContent);
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
                accumulatedContent += text;
                if (onChunk) {
                  onChunk(accumulatedContent);
                }
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

  async cancelStream(conversationId: string) {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      console.log(`🛑 [${conversationId}] Cancelling stream and saving content`);
      
      // Save accumulated content before cancelling
      if (stream.accumulatedContent && stream.accumulatedContent.length > 0) {
        try {
          await supabase
            .from("messages")
            .update({ content: stream.accumulatedContent })
            .eq("id", stream.messageId);
          console.log(`💾 [${conversationId}] Saved ${stream.accumulatedContent.length} chars before cancel`);
        } catch (error) {
          console.error(`❌ [${conversationId}] Failed to save before cancel:`, error);
        }
      }
      
      stream.abortController.abort();
      stream.reader.cancel();
      this.activeStreams.delete(conversationId);
    }
  }

  isStreaming(conversationId: string): boolean {
    return this.activeStreams.has(conversationId);
  }

  async cancelAllStreams() {
    console.log("🛑 Cancelling all streams");
    const cancelPromises = [];
    for (const [conversationId] of this.activeStreams) {
      cancelPromises.push(this.cancelStream(conversationId));
    }
    await Promise.all(cancelPromises);
  }
}

// Singleton instance
export const streamManager = new StreamManager();
