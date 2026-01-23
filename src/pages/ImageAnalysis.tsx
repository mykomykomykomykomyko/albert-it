import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Trash2, Upload, CheckCircle2, Zap, Image as ImageIcon, X, FileText, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AgentSelectorDialog } from '@/components/agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import { FileUploader } from '@/components/imageAnalysis/FileUploader';
import { ResultsDisplay } from '@/components/imageAnalysis/ResultsDisplay';
import { ResultsViewer } from '@/components/imageAnalysis/ResultsViewer';
import { PromptManager } from '@/components/imageAnalysis/PromptManager';
import { ProcessedImage, AnalysisResult, AnalysisPrompt, PREDEFINED_PROMPTS } from '@/types/imageAnalysis';
import { generateId, resizeAndCompressImage, formatBytes } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Checkbox } from '@/components/ui/checkbox';

// Constants for timeout
const AGENT_ANALYSIS_TIMEOUT_MS = 120000; // 2 minutes for agent-based analysis

export default function ImageAnalysis() {
  const navigate = useNavigate();
  const { t } = useTranslation('image');
  // Don't persist images - blob URLs and File objects become invalid after page reload
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [prompts, setPrompts] = useState<AnalysisPrompt[]>(() => {
    const saved = localStorage.getItem('imageAnalysis_prompts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    // Load predefined prompts if none saved
    return PREDEFINED_PROMPTS.map((p, index) => ({
      ...p,
      id: `predefined-${index}`,
      createdAt: new Date()
    }));
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
  
  // New state for cancel/timeout functionality
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
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
    setImages(prev => [...prev, ...newImages]);
  };

  const handleImageSelect = (imageId: string) => {
    setImages(prev =>
      prev.map(img => (img.id === imageId ? { ...img, selected: !img.selected } : img))
    );
  };

  const handleImageRemove = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    // Remove all results associated with this image
    setResults(prev => prev.filter(r => r.imageId !== imageId));
  };

  const handleSelectAll = () => {
    setImages(prev => prev.map(img => ({ ...img, selected: true })));
  };

  const handleDeselectAll = () => {
    setImages(prev => prev.map(img => ({ ...img, selected: false })));
  };

  const handleSelectAgent = (agent: Agent) => {
    // Add agent as a new prompt with full agent data
    const agentPrompt: AnalysisPrompt = {
      id: generateId(),
      name: agent.name,
      content: agent.user_prompt || "Analyze this image",
      isCustom: true,
      createdAt: new Date(),
      agentId: agent.id,
      agentSystemPrompt: agent.system_prompt,
      agentKnowledgeDocuments: (agent as any).knowledge_documents || []
    };
    
    setPrompts(prev => [...prev, agentPrompt]);
    setSelectedPromptIds(prev => [...prev, agentPrompt.id]);
    setShowAgentSelector(false);
    toast.success(`Agent "${agent.name}" added to analysis`);
  };

  const handleImageClick = (imageId: string) => {
    setSelectedImageId(imageId);
    setShowResultsViewer(true);
  };

  const handleCancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    // Update any processing results to cancelled
    setResults(prev => prev.map(r => 
      r.status === 'processing' 
        ? { ...r, status: 'error' as const, content: 'Analysis cancelled by user' }
        : r
    ));
    
    setIsAnalyzing(false);
    setElapsedTime(0);
    toast.info('Analysis cancelled');
  }, []);

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
    setElapsedTime(0);
    
    // Start elapsed time counter
    const startTime = Date.now();
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

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
      const imageDataUrls = await Promise.all(
        selectedImages.map(img => convertBlobToBase64(img.url, img.resizeEnabled))
      );

      // Process each prompt separately
      for (const prompt of selectedPrompts) {
        // Create new AbortController for this prompt
        abortControllerRef.current = new AbortController();
        
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

          let response: Response;

          // Use agent endpoint if this is an agent prompt
          if (prompt.agentId && prompt.agentSystemPrompt) {
            // Set up timeout for agent requests
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutIdRef.current = setTimeout(() => {
                abortControllerRef.current?.abort();
                reject(new Error('TIMEOUT'));
              }, AGENT_ANALYSIS_TIMEOUT_MS);
            });
            
            const fetchPromise = fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                },
                body: JSON.stringify({
                  systemPrompt: prompt.agentSystemPrompt,
                  userPrompt: `Analyze ${selectedImages.length} image(s) with the following instructions: ${prompt.content}`,
                  images: imageDataUrls,
                  knowledgeDocuments: prompt.agentKnowledgeDocuments || [],
                  tools: []
                }),
                signal: abortControllerRef.current.signal
              }
            );
            
            response = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Clear timeout on success
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
              timeoutIdRef.current = null;
            }
          } else {
            // Use standard image analysis endpoint
            const systemPrompt = `You are analyzing ${selectedImages.length} image(s). Please provide a separate, detailed analysis for each image. Number your responses (Image 1:, Image 2:, etc.) and analyze each image thoroughly based on the given prompt.`;
            
            response = await fetch(
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
                }),
                signal: abortControllerRef.current.signal
              }
            );
          }

          if (!response.ok) {
            const errorText = await response.text();
            
            // Parse error message if JSON
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
              }
            } catch {
              if (errorText) {
                errorMessage = errorText;
              }
            }
            
            // Handle specific error codes
            if (response.status === 504) {
              throw new Error('Analysis timed out. Please try with fewer images or simpler prompts.');
            } else if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (response.status === 402) {
              throw new Error('AI credits exhausted. Please add funds to continue.');
            }
            
            throw new Error(errorMessage);
          }

          // Handle response based on endpoint type
          if (prompt.agentId && prompt.agentSystemPrompt) {
            // Agent endpoint returns JSON response
            const result = await response.json();
            if (result.error) {
              throw new Error(result.error);
            }

            const fullContent = result.output || '';
            
            // Split analysis by image
            const imageAnalyses = splitAnalysisByImage(fullContent, selectedImages.length);

            // Update results with final content
            setResults(prev => {
              const updatedResults = [...prev];
              for (let i = 0; i < tempResults.length; i++) {
                const resultIndex = updatedResults.findIndex(r => r.id === tempResults[i].id);
                if (resultIndex !== -1) {
                  const analysis = imageAnalyses[i] || fullContent;
                  updatedResults[resultIndex] = {
                    ...updatedResults[resultIndex],
                    content: typeof analysis === 'string' ? analysis.trim() : String(analysis).trim(),
                    status: 'completed',
                    processingTime: elapsedTime
                  };
                }
              }
              return updatedResults;
            });

          } else {
            // Standard endpoint uses streaming
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
                      throw new Error(`Streaming error: ${data.error}`);
                    }
                  } catch (e) {
                    console.error('Error parsing SSE line:', e);
                  }
                }
              }
            }

            // Mark streaming results as completed
            setResults(prev =>
              prev.map(r =>
                tempResults.some(tr => tr.id === r.id) && r.status === 'processing'
                  ? { ...r, status: 'completed' }
                  : r
              )
            );
          }
        } catch (error) {
          console.error(`Error processing prompt "${prompt.name}":`, error);
          
          // Check if this was a user cancellation or timeout
          const isCancelled = error instanceof Error && error.name === 'AbortError';
          const isTimeout = error instanceof Error && error.message === 'TIMEOUT';
          
          if (isCancelled && !isTimeout) {
            // User cancelled - don't add error results, they're already marked
            continue;
          }

          // Determine error message
          let errorMessage = 'Unknown error occurred';
          if (isTimeout) {
            errorMessage = 'Analysis timed out after 2 minutes. Please try with fewer images or simpler prompts.';
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          // Update existing processing results to error state OR add new error results
          setResults(prev => {
            const updatedResults = prev.map(r => {
              // Find processing results for this prompt and update them
              if (r.promptId === prompt.id && r.status === 'processing') {
                return {
                  ...r,
                  content: `Error: ${errorMessage}`,
                  status: 'error' as const
                };
              }
              return r;
            });
            return updatedResults;
          });
          
          // Show toast for specific error types
          if (isTimeout) {
            toast.error('Analysis timed out. Try with fewer images or simpler prompts.');
          }
        }
      }

      toast.success(`Analysis complete`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      // Clean up
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      abortControllerRef.current = null;
      setIsAnalyzing(false);
      setElapsedTime(0);
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
  const validResultsCount = results.filter(r => images.some(img => img.id === r.imageId)).length;

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all images, prompts, and results? This cannot be undone.')) {
      setImages([]);
      setPrompts(PREDEFINED_PROMPTS.map((p, index) => ({
        ...p,
        id: `predefined-${index}`,
        createdAt: new Date()
      })));
      setSelectedPromptIds([]);
      setResults([]);
      setSelectedImageId(null);
      localStorage.removeItem('imageAnalysis_images');
      localStorage.removeItem('imageAnalysis_prompts');
      localStorage.removeItem('imageAnalysis_selectedPromptIds');
      localStorage.removeItem('imageAnalysis_results');
      toast.success('All data cleared');
    }
  };

  const canAnalyze = selectedImageCount > 0 && selectedPromptIds.length > 0;

  // Format elapsed time for display
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Workflow Steps */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-xl font-semibold">{t('title')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('subtitle')}
                  </p>
                </div>

                {/* Step 1: Upload Images */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      images.length > 0 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {images.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                    </div>
                    <h3 className="font-medium">Upload Images</h3>
                    {images.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {images.length} file{images.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  <FileUploader onFilesAdded={handleFilesAdded} disabled={isAnalyzing} />
                  
                  {/* Inline Image Thumbnails */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {selectedImageCount} of {images.length} selected
                        </span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={handleSelectAll}
                            disabled={selectedImageCount === images.length}
                          >
                            Select all
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={handleDeselectAll}
                            disabled={selectedImageCount === 0}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {images.slice(0, 8).map((image) => (
                          <div
                            key={image.id}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              image.selected 
                                ? 'border-primary ring-1 ring-primary/30' 
                                : 'border-transparent hover:border-muted-foreground/50'
                            }`}
                            onClick={() => handleImageSelect(image.id)}
                          >
                            <div className="aspect-square bg-muted">
                              {image.type === 'application/pdf' ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-destructive" />
                                </div>
                              ) : (
                                <img 
                                  src={image.url} 
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="absolute top-1 left-1">
                              <Checkbox 
                                checked={image.selected}
                                className="w-4 h-4 bg-background/80"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageRemove(image.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {images.length > 8 && (
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                            +{images.length - 8}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Select Prompts */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      selectedPromptIds.length > 0 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedPromptIds.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                    </div>
                    <h3 className="font-medium">Select Prompts</h3>
                    {selectedPromptIds.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {selectedPromptIds.length} selected
                      </Badge>
                    )}
                  </div>
                  
                  <PromptManager
                    prompts={prompts}
                    selectedPromptIds={selectedPromptIds}
                    onPromptsChange={setPrompts}
                    onSelectionChange={setSelectedPromptIds}
                    onOpenAgentSelector={() => setShowAgentSelector(true)}
                    disabled={isAnalyzing}
                  />
                </div>

                {/* Step 3: Analyze */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      validResultsCount > 0 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {validResultsCount > 0 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                    </div>
                    <h3 className="font-medium">Analyze</h3>
                  </div>
                  
                  {isAnalyzing ? (
                    <div className="space-y-2">
                      <Button
                        onClick={handleCancelAnalysis}
                        variant="destructive"
                        className="w-full"
                        size="lg"
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        Cancel Analysis
                      </Button>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing... ({formatElapsedTime(elapsedTime)})</span>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={startAnalysis}
                      disabled={!canAnalyze}
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {canAnalyze 
                        ? `Analyze ${selectedImageCount} image${selectedImageCount !== 1 ? 's' : ''} × ${selectedPromptIds.length} prompt${selectedPromptIds.length !== 1 ? 's' : ''}`
                        : 'Select images and prompts'
                      }
                    </Button>
                  )}

                  {!canAnalyze && !isAnalyzing && (
                    <p className="text-xs text-muted-foreground text-center">
                      {images.length === 0 && selectedPromptIds.length === 0
                        ? 'Upload images and select prompts to start'
                        : images.length === 0
                        ? 'Upload some images first'
                        : selectedImageCount === 0
                        ? 'Select at least one image'
                        : 'Select at least one prompt'
                      }
                    </p>
                  )}
                </div>

                {/* Clear All */}
                {(images.length > 0 || results.length > 0) && (
                  <Button
                    onClick={handleClearAll}
                    disabled={isAnalyzing}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right Panel - Results */}
          <ResizablePanel defaultSize={65}>
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-border flex-shrink-0">
                <h3 className="text-xl font-semibold">{t('results.title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {validResultsCount > 0 
                    ? t('results.resultsGenerated', { count: validResultsCount })
                    : 'Results will appear here after analysis'
                  }
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {validResultsCount === 0 ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium text-lg mb-2">No analysis yet</h4>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Upload images, select prompts, then click <strong>Analyze</strong> to see AI-generated insights about your images.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResultsDisplay
                      results={results}
                      images={images}
                      prompts={prompts}
                      selectedImageId={selectedImageId || undefined}
                      onImageClick={handleImageClick}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
