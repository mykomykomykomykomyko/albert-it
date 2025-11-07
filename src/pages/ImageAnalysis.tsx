import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AgentSelectorDialog } from '@/components/agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { FileUploader } from '@/components/imageAnalysis/FileUploader';
import { ImageGallery } from '@/components/imageAnalysis/ImageGallery';
import { ResultsDisplay } from '@/components/imageAnalysis/ResultsDisplay';
import { ResultsViewer } from '@/components/imageAnalysis/ResultsViewer';
import { PromptManager } from '@/components/imageAnalysis/PromptManager';
import { ProcessedImage, AnalysisResult, AnalysisPrompt, PREDEFINED_PROMPTS } from '@/types/imageAnalysis';
import { generateId, resizeAndCompressImage } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ImageAnalysis() {
  const navigate = useNavigate();
  const { t } = useTranslation('image');
  // Don't persist images - blob URLs and File objects become invalid after page reload
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [prompts, setPrompts] = useState<AnalysisPrompt[]>(() => {
    const saved = localStorage.getItem('imageAnalysis_prompts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('imageAnalysis_selectedPromptIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>(() => {
    const saved = localStorage.getItem('imageAnalysis_results');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showResultsViewer, setShowResultsViewer] = useState(false);

  useEffect(() => {
    checkAuth();
    // Clean up any stale image data from previous sessions
    localStorage.removeItem('imageAnalysis_images');
    
    // Clean up orphaned results (results for images that don't exist)
    const savedResults = localStorage.getItem('imageAnalysis_results');
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);
        const cleanedResults = parsedResults.filter((r: AnalysisResult) => 
          images.some(img => img.id === r.imageId)
        );
        if (cleanedResults.length !== parsedResults.length) {
          console.log(`Cleaned up ${parsedResults.length - cleanedResults.length} orphaned results on mount`);
          setResults(cleanedResults);
        }
      } catch (error) {
        console.error('Error cleaning up results:', error);
      }
    }
  }, []);

  // Persist prompts to localStorage
  useEffect(() => {
    localStorage.setItem('imageAnalysis_prompts', JSON.stringify(prompts));
  }, [prompts]);

  // Persist selected prompt IDs to localStorage
  useEffect(() => {
    localStorage.setItem('imageAnalysis_selectedPromptIds', JSON.stringify(selectedPromptIds));
  }, [selectedPromptIds]);

  // Persist results to localStorage
  useEffect(() => {
    localStorage.setItem('imageAnalysis_results', JSON.stringify(results));
  }, [results]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const handleFilesAdded = (newImages: ProcessedImage[]) => {
    console.log('=== handleFilesAdded called ===');
    console.log('New images count:', newImages.length);
    console.log('New images:', newImages);
    
    setImages(prev => {
      const updated = [...prev, ...newImages];
      console.log('Updated images state - total count:', updated.length);
      console.log('Updated images array:', updated);
      
      // Force a re-render by also logging after state update
      setTimeout(() => {
        console.log('After state update - images length should be:', updated.length);
      }, 100);
      
      return updated;
    });
  };

  const handleImageSelect = (imageId: string) => {
    setImages(prev =>
      prev.map(img => (img.id === imageId ? { ...img, selected: !img.selected } : img))
    );
  };

  const handleImageRemove = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    // Remove all results associated with this image
    setResults(prev => {
      const removedCount = prev.filter(r => r.imageId === imageId).length;
      const filtered = prev.filter(r => r.imageId !== imageId);
      console.log(`Removed ${removedCount} results associated with deleted image`);
      return filtered;
    });
  };

  const handleSelectAll = () => {
    setImages(prev => prev.map(img => ({ ...img, selected: true })));
  };

  const handleDeselectAll = () => {
    setImages(prev => prev.map(img => ({ ...img, selected: false })));
  };

  const handleResizeToggle = (imageId: string) => {
    setImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, resizeEnabled: !img.resizeEnabled } : img
      )
    );
  };

  const handleSelectAgent = (agent: Agent) => {
    // Add agent as a new prompt
    const agentPrompt: AnalysisPrompt = {
      id: generateId(),
      name: agent.name,
      content: agent.user_prompt,
      isCustom: true,
      createdAt: new Date()
    };
    
    setPrompts(prev => [...prev, agentPrompt]);
    setSelectedPromptIds(prev => [...prev, agentPrompt.id]);
    setShowAgentSelector(false);
    toast.success(`Agent "${agent.name}" added to prompts`);
  };

  const handleImageClick = (imageId: string) => {
    setSelectedImageId(imageId);
    setShowResultsViewer(true);
  };

  const resizeImage = async (dataUrl: string, maxWidth: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  };

  const convertImageToDataUrl = (image: ProcessedImage): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If URL is already a data URL, return it
      if (image.url.startsWith('data:')) {
        resolve(image.url);
        return;
      }

      // Otherwise read from file
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(image.file);
    });
  };

  const startAnalysis = async () => {
    const selectedImages = images.filter(img => img.selected);
    const selectedPrompts = prompts.filter(p => selectedPromptIds.includes(p.id));
    
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    if (selectedPrompts.length === 0) {
      toast.error('Please select at least one prompt');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert blob URLs to base64 data URLs (with optional resizing)
      const convertBlobToBase64 = async (blobUrl: string, shouldResize: boolean): Promise<string> => {
        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          let finalBlob = blob;

          // Resize if enabled for this image
          if (shouldResize) {
            const file = new File([blob], 'image', { type: blob.type });
            const resizedFile = await resizeAndCompressImage(file);
            finalBlob = resizedFile;
          }

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(finalBlob);
          });
        } catch (error) {
          console.error('Error converting blob to base64:', error);
          throw error;
        }
      };

      // Convert all image URLs to base64 (with resize if enabled)
      console.log('Converting images to base64...');
      const imageDataUrls = await Promise.all(
        selectedImages.map(img => convertBlobToBase64(img.url, img.resizeEnabled))
      );
      console.log('Images converted successfully:', imageDataUrls.length);

      // Process each prompt separately
      for (const prompt of selectedPrompts) {
        console.log(`Processing prompt: ${prompt.name}`);

        try {
          // Create temporary results for real-time updates
          const tempResults: AnalysisResult[] = [];
          for (let i = 0; i < selectedImages.length; i++) {
            const tempResult: AnalysisResult = {
              id: generateId(),
              imageId: selectedImages[i].id,
              promptId: prompt.id,
              content: '',
              processingTime: 0,
              createdAt: new Date(),
              status: 'processing'
            };
            tempResults.push(tempResult);
          }

          // Add temporary results to show processing state
          setResults(prev => [...prev, ...tempResults]);

          const systemPrompt = `You are analyzing ${selectedImages.length} image(s). Please provide a separate, detailed analysis for each image. Number your responses (Image 1:, Image 2:, etc.) and analyze each image thoroughly based on the given prompt.`;

          // Call Gemini edge function with proper streaming
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-process-images`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
              },
              body: JSON.stringify({
                message: prompt.content,
                images: imageDataUrls,
                systemPrompt
              })
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response stream available');
          }

          let fullContent = '';

          // Process the stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) {
                    fullContent += data.text;

                    // Split analysis by image
                    const imageAnalyses = splitAnalysisByImage(fullContent, selectedImages.length);

                    // Update results in real-time
                    setResults(prev => {
                      const updatedResults = [...prev];
                      for (let i = 0; i < tempResults.length; i++) {
                        const resultIndex = updatedResults.findIndex(r => r.id === tempResults[i].id);
                        if (resultIndex !== -1) {
                          const analysis = imageAnalyses[i] || fullContent;
                          updatedResults[resultIndex] = {
                            ...updatedResults[resultIndex],
                            content: typeof analysis === 'string' ? analysis.trim() : String(analysis).trim(),
                            status: 'processing'
                          };
                        }
                      }
                      return updatedResults;
                    });
                  }
                  if (data.error) {
                    console.error('Streaming error:', data.error);
                    throw new Error(data.error);
                  }
                } catch (e) {
                  // Ignore JSON parse errors for streaming chunks
                  console.log('Parse error for chunk:', e);
                }
              }
            }
          }

          // Mark results as completed
          setResults(prev => {
            const updatedResults = [...prev];
            for (const tempResult of tempResults) {
              const resultIndex = updatedResults.findIndex(r => r.id === tempResult.id);
              if (resultIndex !== -1) {
                updatedResults[resultIndex] = {
                  ...updatedResults[resultIndex],
                  status: 'completed',
                  processingTime: Math.random() * 2000 + 1000
                };
              }
            }
            return updatedResults;
          });

        } catch (error) {
          console.error(`Error processing prompt "${prompt.name}":`, error);

          // Update existing results to show error
          setResults(prev => {
            const updatedResults = [...prev];
            for (const image of selectedImages) {
              const errorResult: AnalysisResult = {
                id: generateId(),
                imageId: image.id,
                promptId: prompt.id,
                content: `Error processing image with prompt "${prompt.name}": ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                processingTime: 0,
                createdAt: new Date(),
                status: 'error'
              };
              updatedResults.push(errorResult);
            }
            return updatedResults;
          });
        }
      }

      toast.success(`Analysis complete`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to split analysis by image
  const splitAnalysisByImage = (content: string, imageCount: number): string[] => {
    if (imageCount === 1) {
      return [content];
    }

    // Try to split by "Image X:" pattern
    const imagePattern = /Image\s+(\d+):/gi;
    const parts = content.split(imagePattern);

    if (parts.length >= imageCount * 2) {
      // Successfully split by image markers
      const analyses: string[] = [];
      for (let i = 1; i < parts.length; i += 2) {
        const imageNumber = parts[i];
        const analysis = parts[i + 1];
        if (analysis) {
          analyses.push(`Image ${imageNumber}:${analysis}`);
        }
      }
      return analyses.slice(0, imageCount);
    }

    // Fallback: split content roughly by sections
    const sections = content.split(/\n\s*\n/);
    if (sections.length >= imageCount) {
      return sections.slice(0, imageCount);
    }

    // Last fallback: return the same content for each image
    return Array(imageCount).fill(content);
  };

  const selectedImageCount = images.filter(img => img.selected).length;
  const selectedImage = selectedImageId ? images.find(img => img.id === selectedImageId) || null : null;

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all images, prompts, and results? This cannot be undone.')) {
      console.log('Clearing all data...');
      setImages([]);
      setPrompts([]);
      setSelectedPromptIds([]);
      setResults([]);
      setSelectedImageId(null);
      localStorage.removeItem('imageAnalysis_images');
      localStorage.removeItem('imageAnalysis_prompts');
      localStorage.removeItem('imageAnalysis_selectedPromptIds');
      localStorage.removeItem('imageAnalysis_results');
      console.log('All data cleared successfully');
      toast.success('All data cleared');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-border flex-shrink-0 flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{t('title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('subtitle')}
              </p>
            </div>

            {/* File Uploader */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('uploadImage')}</h3>
              <FileUploader onFilesAdded={handleFilesAdded} disabled={isAnalyzing} />
            </div>

            {/* Prompt Manager */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('prompt.examples')}</h3>
              <PromptManager
                prompts={prompts}
                selectedPromptIds={selectedPromptIds}
                onPromptsChange={setPrompts}
                onSelectionChange={setSelectedPromptIds}
                onOpenAgentSelector={() => setShowAgentSelector(true)}
                disabled={isAnalyzing}
              />
            </div>

            {/* Analysis Button */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('analyze')}</h3>
              <Button
                onClick={startAnalysis}
                disabled={isAnalyzing || selectedImageCount === 0 || selectedPromptIds.length === 0}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('analyze')} {selectedImageCount} × {selectedPromptIds.length}
                  </>
                )}
              </Button>
            </div>

            {/* Clear All Button */}
            <div className="space-y-2">
              <Button
                onClick={handleClearAll}
                disabled={isAnalyzing || (images.length === 0 && results.length === 0)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          {/* Image Gallery */}
          <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0">
            <div className="p-6 border-b border-border flex-shrink-0">
              <h3 className="text-xl font-semibold">Image Gallery</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {images.length} image{images.length !== 1 ? 's' : ''} uploaded
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <ImageGallery
                  images={images}
                  onImageSelect={handleImageSelect}
                  onImageRemove={handleImageRemove}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  selectedCount={selectedImageCount}
                  onImageClick={handleImageClick}
                  onResizeToggle={handleResizeToggle}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Results Panel */}
          <div className="w-full lg:w-1/2 flex flex-col min-h-0 overflow-hidden flex-1">
          <div className="p-6 border-b border-border flex-shrink-0">
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {results.filter(r => images.some(img => img.id === r.imageId)).length} result{results.filter(r => images.some(img => img.id === r.imageId)).length !== 1 ? 's' : ''} generated
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <ResultsDisplay
                results={results}
                images={images}
                prompts={prompts}
                selectedImageId={selectedImageId || undefined}
                onImageClick={handleImageClick}
              />
            </div>
          </ScrollArea>
          </div>
        </div>
      </div>

      {/* Agent Selector Dialog */}
      <AgentSelectorDialog
        open={showAgentSelector}
        onOpenChange={setShowAgentSelector}
        onSelectAgent={handleSelectAgent}
      />

      {/* Results Viewer Dialog */}
      <ResultsViewer
        isOpen={showResultsViewer}
        onClose={() => {
          setShowResultsViewer(false);
          setSelectedImageId(null);
        }}
        selectedImage={selectedImage}
        results={results}
        prompts={prompts}
      />
    </div>
  );
}
