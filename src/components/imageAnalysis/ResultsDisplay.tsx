import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProcessedImage, AnalysisResult, AnalysisPrompt } from '@/types/imageAnalysis';
import { Clock, FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultsDisplayProps {
  results: AnalysisResult[];
  images: ProcessedImage[];
  prompts: AnalysisPrompt[];
  selectedImageId?: string;
  onImageClick?: (imageId: string) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  results, 
  images, 
  prompts, 
  selectedImageId,
  onImageClick 
}) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleResultExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  console.log('=== ResultsDisplay render ===');
  console.log('Results count:', results.length);
  console.log('Images count:', images.length);
  console.log('Prompts count:', prompts.length);
  
  // Filter out results for images that no longer exist
  const validResults = results.filter(r => images.some(img => img.id === r.imageId));
  console.log('Valid results count:', validResults.length);
  console.log('Filtered out:', results.length - validResults.length, 'orphaned results');
  
  if (validResults.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground py-8">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No analysis results yet</p>
          <p className="text-sm">Select images and prompts, then click "Analyze"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {images.map((image) => {
            const imageResults = validResults.filter(r => r.imageId === image.id);
            if (imageResults.length === 0) return null;

            return (
              <Card 
                key={image.id} 
                className={`cursor-pointer transition-all duration-200 ${
                  selectedImageId === image.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
              >
                <CardHeader className="pb-3 min-w-0">
                  <div className="flex items-center justify-between min-w-0 gap-2">
                    <CardTitle className="text-sm flex items-center min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-sm overflow-hidden bg-muted flex-shrink-0 mr-2">
                        {image.type === 'application/pdf' ? (
                          <FileText className="w-4 h-4 text-destructive m-1" />
                        ) : (
                          <img 
                            src={image.url} 
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="truncate max-w-[200px] sm:max-w-[300px]" title={image.name}>{image.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 flex-shrink-0 min-w-0">
                      <Badge variant="outline">
                        {imageResults.length} result{imageResults.length !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick?.(image.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {imageResults.slice(0, selectedImageId === image.id ? imageResults.length : 2).map((result) => {
                      const prompt = prompts.find(p => p.id === result.promptId);
                      const isExpanded = expandedResults.has(result.id);
                      const shouldTruncate = result.content.length > 200;
                      
                      return (
                        <div
                          key={result.id}
                          className="p-3 bg-muted/30 rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-xs">
                              {prompt?.name || 'Unknown Prompt'}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={
                                  result.status === 'completed' ? 'default' : 
                                  result.status === 'error' ? 'destructive' : 
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {result.status}
                              </Badge>
                              {result.processingTime > 0 && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {(result.processingTime / 1000).toFixed(1)}s
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isExpanded || !shouldTruncate ? (
                              <p className="whitespace-pre-wrap leading-relaxed">{result.content}</p>
                            ) : (
                              <p className="line-clamp-3">{result.content}</p>
                            )}
                          </div>
                          {shouldTruncate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs px-2"
                              onClick={() => toggleResultExpanded(result.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {imageResults.length > 2 && selectedImageId !== image.id && (
                      <div className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => onImageClick?.(image.id)}
                        >
                          View {imageResults.length - 2} more result{imageResults.length - 2 !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};