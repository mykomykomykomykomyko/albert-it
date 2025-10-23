import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, FileText, Image as ImageIcon, MoreVertical, Eye, Maximize2 } from 'lucide-react';
import { ProcessedImage } from '@/types/imageAnalysis';
import { formatBytes } from '@/lib/utils';

interface ImageGalleryProps {
  images: ProcessedImage[];
  onImageSelect: (imageId: string) => void;
  onImageRemove: (imageId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCount: number;
  onImageClick?: (imageId: string) => void;
  onResizeToggle: (imageId: string) => void;
}

export function ImageGallery({ 
  images, 
  onImageSelect, 
  onImageRemove, 
  onSelectAll, 
  onDeselectAll,
  selectedCount,
  onImageClick,
  onResizeToggle
}: ImageGalleryProps) {
  console.log('ImageGallery render - images count:', images.length);
  console.log('ImageGallery images:', images);
  
  const formatFileSize = (bytes: number) => {
    return formatBytes ? formatBytes(bytes) : `${Math.round(bytes / 1024)}KB`;
  };

  if (images.length === 0) {
    return (
      <Card className="p-6 text-center space-y-4 bg-gradient-subtle border-muted">
        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-muted-foreground">No images uploaded</h3>
          <p className="text-sm text-muted-foreground">Upload some files to get started</p>
        </div>
      </Card>
    );
  }

  console.log('ImageGallery rendering with', images.length, 'images');

  return (
    <div className="space-y-4">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">Image Gallery</h3>
          <p className="text-sm text-muted-foreground">
            {images.length} file{images.length !== 1 ? 's' : ''} uploaded
            {selectedCount > 0 && ` • ${selectedCount} selected`}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSelectAll}
            disabled={selectedCount === images.length}
          >
            Select All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDeselectAll}
            disabled={selectedCount === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Image Grid */}
      <div className="space-y-3">
        {images.map((image) => (
          <Card 
            key={image.id} 
            className={`p-3 transition-all duration-200 cursor-pointer hover:shadow-card ${
              image.selected 
                ? 'ring-2 ring-primary bg-gradient-subtle shadow-glow' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onImageSelect(image.id)}
          >
            <div className="flex items-center space-x-3">
              <Checkbox 
                checked={image.selected}
                onChange={() => onImageSelect(image.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              
              <div className="flex-shrink-0">
                {image.type === 'application/pdf' ? (
                  <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-destructive" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={image.url} 
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1 mr-2">
                    <p className="font-medium text-sm truncate" title={image.name}>{image.name}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {image.type.split('/')[1].toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(image.size)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResizeToggle(image.id);
                      }}
                      className={`h-8 w-8 p-0 transition-colors ${
                        image.resizeEnabled 
                          ? 'text-primary bg-primary/10' 
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                      title={image.resizeEnabled ? "Resize enabled (1000px width)" : "Click to enable resize to 1000px"}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick?.(image.id);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      title="View results"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageRemove(image.id);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}