import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ProcessedImage, AnalysisResult, AnalysisPrompt } from '@/types/imageAnalysis';
import { Download, ChevronLeft, ChevronRight, Clock, FileText, Calendar, Eye } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { ObjectDetectionViewer } from './ObjectDetectionViewer';

interface ResultsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImage: ProcessedImage | null;
  results: AnalysisResult[];
  prompts: AnalysisPrompt[];
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  isOpen,
  onClose,
  selectedImage,
  results,
  prompts
}) => {
  // All useState hooks first
  const [currentIndex, setCurrentIndex] = useState(0);
  const [objectDetectionOpen, setObjectDetectionOpen] = useState(false);
  const [selectedObjectImage, setSelectedObjectImage] = useState<{
    url: string;
    name: string;
    boxes: any[];
  } | null>(null);

  // All derived state/memoized values
  const imageResults = useMemo(() => {
    return selectedImage ? results.filter(r => r.imageId === selectedImage.id) : [];
  }, [results, selectedImage?.id]);
  
  const items = useMemo(() => {
    if (!selectedImage) return [];
    return [
      { type: 'image' as const, data: selectedImage },
      ...imageResults.map(result => ({ type: 'result' as const, data: result }))
    ];
  }, [selectedImage, imageResults]);

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;
  const currentItem = items[currentIndex] || null;

  // All useEffect hooks
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen, selectedImage?.id]);

  // Early return after all hooks
  if (!selectedImage || !currentItem) return null;

  // Event handlers
  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDownloadResults = () => {
    const exportData = {
      image: {
        name: selectedImage.name,
        size: selectedImage.size,
        type: selectedImage.type,
        uploadedAt: selectedImage.uploadedAt
      },
      results: imageResults.map(result => {
        const prompt = prompts.find(p => p.id === result.promptId);
        return {
          promptName: prompt?.name || 'Unknown Prompt',
          promptContent: prompt?.content || '',
          analysis: result.content,
          processingTime: result.processingTime,
          status: result.status,
          createdAt: result.createdAt
        };
      }),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedImage.name.replace(/\.[^/.]+$/, '')}_analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between min-w-0">
            <DialogTitle className="flex items-center space-x-2 min-w-0 flex-1 mr-4">
              <FileText className="w-5 h-5 flex-shrink-0" />
              <span className="truncate" title={selectedImage.name}>{selectedImage.name}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleDownloadResults}>
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>
          
          {/* Navigation indicator */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>{formatBytes(selectedImage.size)}</span>
              <span>{selectedImage.type}</span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {selectedImage.uploadedAt.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span>{currentIndex + 1} of {items.length}</span>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="w-8 h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="w-8 h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6">
          <ScrollArea className="h-full">
            <div className="pr-6">
              {currentItem.type === 'image' ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4">Original Image</h3>
                    <div className="inline-block border rounded-lg overflow-hidden shadow-lg bg-white">
                      <img
                        src={selectedImage.url}
                        alt={selectedImage.name}
                        className="max-w-full max-h-[60vh] object-contain"
                      />
                    </div>
                  </div>
                  
                  <div className="text-center text-muted-foreground">
                    <p>Navigate right to view {imageResults.length} analysis result{imageResults.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ) : (
                <ResultCard
                  result={currentItem.data as AnalysisResult}
                  prompt={prompts.find(p => p.id === currentItem.data.promptId)}
                  imageUrl={selectedImage.url}
                  imageName={selectedImage.name}
                  onViewObjects={(boxes) => {
                    setSelectedObjectImage({
                      url: selectedImage.url,
                      name: selectedImage.name,
                      boxes
                    });
                    setObjectDetectionOpen(true);
                  }}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Object Detection Viewer */}
        {selectedObjectImage && (
          <ObjectDetectionViewer
            isOpen={objectDetectionOpen}
            onClose={() => {
              setObjectDetectionOpen(false);
              setSelectedObjectImage(null);
            }}
            imageUrl={selectedObjectImage.url}
            imageName={selectedObjectImage.name}
            boundingBoxes={selectedObjectImage.boxes}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface ResultCardProps {
  result: AnalysisResult;
  prompt?: AnalysisPrompt;
  imageUrl?: string;
  imageName?: string;
  onViewObjects?: (boxes: any[]) => void;
}

// Function to detect and parse bounding box data from analysis results
const detectBoundingBoxes = (content: string): any[] | null => {
  try {
    // Look for JSON blocks in the content
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    const matches = [...content.matchAll(jsonBlockRegex)];
    
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1]);
        
        // Check if it's an array of objects with box_2d property
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasBoxes = parsed.every(item => 
            item && 
            typeof item === 'object' && 
            'box_2d' in item && 
            Array.isArray(item.box_2d) && 
            item.box_2d.length === 4 &&
            'label' in item
          );
          
          if (hasBoxes) {
            return parsed;
          }
        }
      } catch (e) {
        // Continue to next match if this one fails to parse
        continue;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const ResultCard: React.FC<ResultCardProps> = ({ result, prompt, imageUrl, imageName, onViewObjects }) => {
  const boundingBoxes = detectBoundingBoxes(result.content);
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {prompt?.name || 'Unknown Prompt'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={result.status === 'completed' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
              {result.status}
            </Badge>
            {result.processingTime > 0 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                {(result.processingTime / 1000).toFixed(1)}s
              </div>
            )}
            {boundingBoxes && boundingBoxes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewObjects?.(boundingBoxes)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                View Objects ({boundingBoxes.length})
              </Button>
            )}
          </div>
        </div>
        
        {prompt?.content && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            <strong>Prompt:</strong> {prompt.content}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {result.content}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Analyzed on {result.createdAt.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};