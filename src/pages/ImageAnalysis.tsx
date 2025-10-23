import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatHeader } from '@/components/ChatHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Loader2, Image as ImageIcon, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AgentSelectorDialog } from '@/components/agents/AgentSelectorDialog';
import { Agent } from '@/hooks/useAgents';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProcessedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  dataUrl?: string;
  selected: boolean;
}

interface AnalysisResult {
  imageId: string;
  prompt: string;
  result: string;
  timestamp: number;
}

export default function ImageAnalysis() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ProcessedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      const url = URL.createObjectURL(file);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImages(prev => prev.map(img => 
          img.file === file ? { ...img, dataUrl } : img
        ));
      };
      reader.readAsDataURL(file);

      newImages.push({
        id: `img-${Date.now()}-${i}`,
        file,
        url,
        name: file.name,
        selected: false
      });
    }

    setImages(prev => [...prev, ...newImages]);
    toast.success(`Added ${newImages.length} image(s)`);
  };

  const toggleImageSelection = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, selected: !img.selected } : img
    ));
  };

  const removeImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setResults(prev => prev.filter(r => r.imageId !== imageId));
  };

  const handleSelectAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setCustomPrompt(agent.user_prompt);
    setShowAgentSelector(false);
    toast.success(`Agent "${agent.name}" selected`);
  };

  const startAnalysis = async () => {
    const selectedImages = images.filter(img => img.selected && img.dataUrl);
    
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    const prompt = customPrompt.trim() || (currentAgent?.user_prompt);
    if (!prompt) {
      toast.error('Please enter a prompt or select an agent');
      return;
    }

    setIsAnalyzing(true);
    const newResults: AnalysisResult[] = [];

    try {
      for (const image of selectedImages) {
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
              images: [image.dataUrl],
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
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        }

        newResults.push({
          imageId: image.id,
          prompt,
          result: resultText,
          timestamp: Date.now()
        });
      }

      setResults(prev => [...prev, ...newResults]);
      toast.success(`Analysis complete for ${selectedImages.length} image(s)`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedCount = images.filter(img => img.selected).length;

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Images & Controls */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold mb-4">Image Analysis</h2>
            
            {/* Upload Button */}
            <div className="mb-4">
              <label htmlFor="image-upload">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload images</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WebP</p>
                </div>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Agent & Prompt Controls */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAgentSelector(true)}
                  variant="outline"
                  className="flex-1"
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
            </div>
          </div>

          {/* Image Gallery */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded</p>
                  <p className="text-sm">Upload images to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image) => (
                    <Card
                      key={image.id}
                      className={`cursor-pointer transition-all ${
                        image.selected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      <div className="relative">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        {image.selected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-t-lg">
                            <Badge className="bg-primary">Selected</Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{image.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 flex flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No analysis results yet</p>
                  <p className="text-sm">Select images and start analysis</p>
                </div>
              ) : (
                results.map((result, index) => {
                  const image = images.find(img => img.id === result.imageId);
                  return (
                    <Card
                      key={`${result.imageId}-${index}`}
                      className={`cursor-pointer transition-all ${
                        selectedImageId === result.imageId ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedImageId(result.imageId)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {image && (
                            <img
                              src={image.url}
                              alt={image.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          {image?.name || 'Unknown Image'}
                        </CardTitle>
                        <Badge variant="secondary" className="w-fit">
                          {result.prompt}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result.result}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <AgentSelectorDialog
        open={showAgentSelector}
        onOpenChange={setShowAgentSelector}
        onSelectAgent={handleSelectAgent}
      />
    </div>
  );
}
