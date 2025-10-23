import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AgentSelectorDialog } from '@/components/agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { FileUploader } from '@/components/imageAnalysis/FileUploader';
import { ImageGallery } from '@/components/imageAnalysis/ImageGallery';
import { ResultsDisplay } from '@/components/imageAnalysis/ResultsDisplay';
import { ResultsViewer } from '@/components/imageAnalysis/ResultsViewer';
import { ProcessedImage, AnalysisResult, AnalysisPrompt } from '@/types/imageAnalysis';
import { generateId } from '@/lib/utils';

export default function ImageAnalysis() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [prompts, setPrompts] = useState<AnalysisPrompt[]>([]);
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
    setImages(prev => [...prev, ...newImages]);
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
    setCurrentAgent(agent);
    setCustomPrompt(agent.user_prompt);
    setShowAgentSelector(false);
    toast.success(`Agent "${agent.name}" selected`);
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
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(image.file);
    });
  };

  const startAnalysis = async () => {
    const selectedImages = images.filter(img => img.selected);
    
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    const prompt = customPrompt.trim();
    if (!prompt) {
      toast.error('Please enter a prompt or select an agent');
      return;
    }

    setIsAnalyzing(true);

    // Create a prompt entry
    const promptEntry: AnalysisPrompt = {
      id: generateId(),
      name: currentAgent?.name || 'Custom Prompt',
      content: prompt,
      createdAt: new Date()
    };
    setPrompts(prev => [...prev, promptEntry]);

    const newResults: AnalysisResult[] = [];

    try {
      for (const image of selectedImages) {
        const resultId = generateId();
        
        // Create pending result
        const pendingResult: AnalysisResult = {
          id: resultId,
          imageId: image.id,
          promptId: promptEntry.id,
          content: '',
          status: 'processing',
          processingTime: 0,
          createdAt: new Date()
        };
        newResults.push(pendingResult);
        setResults(prev => [...prev, pendingResult]);

        const startTime = Date.now();

        try {
          // Get image data URL
          let imageDataUrl = image.url;
          if (image.url.startsWith('blob:')) {
            imageDataUrl = await convertImageToDataUrl(image);
          }

          // Resize if enabled
          if (image.resizeEnabled) {
            imageDataUrl = await resizeImage(imageDataUrl, 1000);
          }

          const systemPrompt = currentAgent?.system_prompt || 'You are a helpful AI assistant that analyzes images.';
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat-with-images`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
              },
              body: JSON.stringify({
                message: prompt,
                images: [imageDataUrl],
                systemPrompt,
                messageHistory: []
              })
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to analyze ${image.name}`);
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
        } catch (error) {
          console.error(`Error analyzing ${image.name}:`, error);
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
        }
      }

      toast.success(`Analysis complete for ${selectedImages.length} image(s)`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedCount = images.filter(img => img.selected).length;
  const selectedImage = selectedImageId ? images.find(img => img.id === selectedImageId) || null : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Images & Controls */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="p-6 space-y-4 border-b border-border">
            <h2 className="text-2xl font-bold">Image Analysis</h2>
            
            {/* File Uploader */}
            <FileUploader onFilesAdded={handleFilesAdded} disabled={isAnalyzing} />

            {/* Agent & Prompt Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAgentSelector(true)}
                    variant="outline"
                    className="flex-1"
                    disabled={isAnalyzing}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {currentAgent ? currentAgent.name : 'Select Agent'}
                  </Button>
                  {currentAgent && (
                    <Button
                      onClick={() => {
                        setCurrentAgent(null);
                        setCustomPrompt('');
                      }}
                      variant="ghost"
                      size="icon"
                      disabled={isAnalyzing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your analysis prompt here..."
                  className="min-h-[100px]"
                  disabled={isAnalyzing}
                />

                <Button
                  onClick={startAnalysis}
                  disabled={isAnalyzing || selectedCount === 0 || !customPrompt.trim()}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze {selectedCount} Image{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Image Gallery */}
          <div className="flex-1 overflow-hidden p-6">
            <ImageGallery
              images={images}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              selectedCount={selectedCount}
              onImageClick={handleImageClick}
              onResizeToggle={handleResizeToggle}
            />
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 flex flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-hidden p-6">
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
