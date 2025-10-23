import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AgentSelectorDialog } from '@/components/agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { FileUploader } from '@/components/imageAnalysis/FileUploader';
import { ImageGallery } from '@/components/imageAnalysis/ImageGallery';
import { ResultsDisplay } from '@/components/imageAnalysis/ResultsDisplay';
import { ResultsViewer } from '@/components/imageAnalysis/ResultsViewer';
import { PromptManager } from '@/components/imageAnalysis/PromptManager';
import { ProcessedImage, AnalysisResult, AnalysisPrompt } from '@/types/imageAnalysis';
import { generateId } from '@/lib/utils';

export default function ImageAnalysis() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [prompts, setPrompts] = useState<AnalysisPrompt[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showResultsViewer, setShowResultsViewer] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const handleFilesAdded = (newImages: ProcessedImage[]) => {
    console.log('handleFilesAdded called with:', newImages.length, 'images');
    console.log('New images data:', newImages);
    setImages(prev => {
      const updated = [...prev, ...newImages];
      console.log('Updated images state:', updated.length, 'total images');
      console.log('Full images array:', updated);
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
    setResults(prev => prev.filter(r => r.imageId !== imageId));
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

    const totalAnalyses = selectedImages.length * selectedPrompts.length;
    let completedAnalyses = 0;

    try {
      // Run analysis for each image-prompt combination
      for (const image of selectedImages) {
        for (const prompt of selectedPrompts) {
          const resultId = generateId();
          
          // Create pending result
          const pendingResult: AnalysisResult = {
            id: resultId,
            imageId: image.id,
            promptId: prompt.id,
            content: '',
            status: 'processing',
            processingTime: 0,
            createdAt: new Date()
          };
          setResults(prev => [...prev, pendingResult]);

          const startTime = Date.now();

          try {
            // Get image data URL
            let imageDataUrl = await convertImageToDataUrl(image);

            // Resize if enabled
            if (image.resizeEnabled) {
              imageDataUrl = await resizeImage(imageDataUrl, 1000);
            }

            const systemPrompt = 'You are a helpful AI assistant that analyzes images.';
            
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat-with-images`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                },
                body: JSON.stringify({
                  message: prompt.content,
                  images: [imageDataUrl],
                  systemPrompt,
                  messageHistory: []
                })
              }
            );

            if (!response.ok) {
              throw new Error(`Failed to analyze ${image.name} with ${prompt.name}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let resultText = '';

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.text) {
                        resultText += data.text;
                        // Update result in real-time
                        setResults(prev =>
                          prev.map(r =>
                            r.id === resultId
                              ? { ...r, content: resultText }
                              : r
                          )
                        );
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              }
            }

            const processingTime = Date.now() - startTime;

            // Update result to completed
            setResults(prev =>
              prev.map(r =>
                r.id === resultId
                  ? { ...r, status: 'completed', processingTime }
                  : r
              )
            );

            completedAnalyses++;
            console.log(`Completed ${completedAnalyses}/${totalAnalyses} analyses`);

          } catch (error) {
            console.error(`Error analyzing ${image.name} with ${prompt.name}:`, error);
            setResults(prev =>
              prev.map(r =>
                r.id === resultId
                  ? {
                      ...r,
                      status: 'error',
                      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                      processingTime: Date.now() - startTime
                    }
                  : r
              )
            );
            completedAnalyses++;
          }
        }
      }

      toast.success(`Analysis complete: ${completedAnalyses} results generated`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedImageCount = images.filter(img => img.selected).length;
  const selectedImage = selectedImageId ? images.find(img => img.id === selectedImageId) || null : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
        {/* Left Panel - Images & Controls */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0 max-h-[50vh] lg:max-h-none">
          {/* Controls Section - Fixed max height */}
          <div className="max-h-[50vh] overflow-y-auto border-b border-border flex-shrink-0">
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Image Analysis</h2>
              
              {/* File Uploader */}
              <FileUploader onFilesAdded={handleFilesAdded} disabled={isAnalyzing} />

              {/* Prompt Manager */}
              <PromptManager
                prompts={prompts}
                selectedPromptIds={selectedPromptIds}
                onPromptsChange={setPrompts}
                onSelectionChange={setSelectedPromptIds}
                onOpenAgentSelector={() => setShowAgentSelector(true)}
                disabled={isAnalyzing}
              />

              {/* Analysis Button */}
              <Button
                onClick={startAnalysis}
                disabled={isAnalyzing || selectedImageCount === 0 || selectedPromptIds.length === 0}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze {selectedImageCount} Image{selectedImageCount !== 1 ? 's' : ''} × {selectedPromptIds.length} Prompt{selectedPromptIds.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Image Gallery Section - Takes remaining space */}
          <div className="flex-1 overflow-y-auto bg-background">
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
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 overflow-hidden flex-1">
          <div className="p-6 border-b border-border flex-shrink-0">
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {results.length} result{results.length !== 1 ? 's' : ''} generated
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <ResultsDisplay
              results={results}
              images={images}
              prompts={prompts}
              selectedImageId={selectedImageId || undefined}
              onImageClick={handleImageClick}
            />
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
