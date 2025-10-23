import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Eye, RotateCcw, FlipHorizontal } from 'lucide-react';

interface BoundingBox {
  box_2d: [number, number, number, number]; // [y_min, x_min, y_max, x_max] - default format
  label: string;
}

interface ObjectDetectionViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  boundingBoxes: BoundingBox[];
}

export const ObjectDetectionViewer: React.FC<ObjectDetectionViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  boundingBoxes
}) => {
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [flipCoordinates, setFlipCoordinates] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setHoveredBox(null);
    }
  }, [isOpen]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({
        width: naturalWidth,
        height: naturalHeight
      });
      setImageLoaded(true);
    }
  };

  const getScaledCoordinates = (box: [number, number, number, number]) => {
    if (!imageRef.current || !imageDimensions) return { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 };
    
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
    
    // Calculate scaling ratio from natural to displayed size
    const scaleX = clientWidth / naturalWidth;
    const scaleY = clientHeight / naturalHeight;
    
    // Coordinates are normalized to 1000, convert to actual pixels
    // Default format: [y_min, x_min, y_max, x_max]
    let x_min_norm, y_min_norm, x_max_norm, y_max_norm;
    
    if (flipCoordinates) {
      // Default: [y_min, x_min, y_max, x_max]
      [y_min_norm, x_min_norm, y_max_norm, x_max_norm] = box;
    } else {
      // Alternative: [x_min, y_min, x_max, y_max]
      [x_min_norm, y_min_norm, x_max_norm, y_max_norm] = box;
    }
    
    // Convert normalized coordinates to natural pixel coordinates
    const x1_natural = (x_min_norm / 1000) * naturalWidth;
    const y1_natural = (y_min_norm / 1000) * naturalHeight;
    const x2_natural = (x_max_norm / 1000) * naturalWidth;
    const y2_natural = (y_max_norm / 1000) * naturalHeight;
    
    // Scale to displayed image size
    const x1 = x1_natural * scaleX;
    const y1 = y1_natural * scaleY;
    const x2 = x2_natural * scaleX;
    const y2 = y2_natural * scaleY;
    
    return {
      x1,
      y1,
      x2,
      y2,
      width: x2 - x1,
      height: y2 - y1
    };
  };

  const generateBoxColor = (index: number) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
      '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe',
      '#fd79a8', '#fdcb6e', '#e84393', '#00b894'
    ];
    return colors[index % colors.length];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Object Detection - {imageName}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlipCoordinates(!flipCoordinates)}
              >
                <FlipHorizontal className="w-4 h-4 mr-2" />
                {flipCoordinates ? 'Y,X → X,Y' : 'X,Y → Y,X'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBoxes(!showBoxes)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {showBoxes ? 'Hide' : 'Show'} Boxes
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Found {boundingBoxes.length} object{boundingBoxes.length !== 1 ? 's' : ''} • Hover over boxes to see labels
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-auto">
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageName}
              className="max-w-full h-auto border rounded-lg shadow-lg"
              onLoad={handleImageLoad}
              style={{ 
                display: 'block'
              }}
            />
            
            {/* Bounding boxes overlay */}
            {imageLoaded && showBoxes && imageRef.current && (
              <div
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: imageRef.current.clientWidth,
                  height: imageRef.current.clientHeight
                }}
              >
                {boundingBoxes.map((box, index) => {
                  const coords = getScaledCoordinates(box.box_2d);
                  const color = generateBoxColor(index);
                  const isHovered = hoveredBox === index;
                  
                  return (
                    <div key={index}>
                      {/* Bounding box */}
                      <div
                        className="absolute border-2 pointer-events-auto cursor-pointer transition-all duration-200"
                        style={{
                          left: coords.x1,
                          top: coords.y1,
                          width: coords.width,
                          height: coords.height,
                          borderColor: color,
                          backgroundColor: isHovered ? `${color}20` : 'transparent',
                          boxShadow: isHovered ? `0 0 0 1px ${color}` : 'none'
                        }}
                        onMouseEnter={() => setHoveredBox(index)}
                        onMouseLeave={() => setHoveredBox(null)}
                      />
                      
                      {/* Label tooltip */}
                      {isHovered && (
                        <div
                          className="absolute z-10 px-2 py-1 text-xs font-medium text-white rounded shadow-lg pointer-events-none whitespace-nowrap"
                          style={{
                            backgroundColor: color,
                            left: coords.x1,
                            top: coords.y1 - 30,
                            transform: coords.y1 < 30 ? 'translateY(40px)' : 'none'
                          }}
                        >
                          {box.label}
                        </div>
                      )}
                      
                      {/* Box number indicator */}
                      <div
                        className="absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white pointer-events-none"
                        style={{
                          backgroundColor: color,
                          left: coords.x1 - 3,
                          top: coords.y1 - 3
                        }}
                      >
                        {index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Object list */}
        <div className="border-t bg-muted/20 p-4 flex-shrink-0">
          <div className="text-sm font-medium mb-2">Detected Objects:</div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {boundingBoxes.map((box, index) => (
              <div
                key={index}
                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                  hoveredBox === index ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  backgroundColor: generateBoxColor(index),
                  color: 'white'
                }}
                onMouseEnter={() => setHoveredBox(index)}
                onMouseLeave={() => setHoveredBox(null)}
              >
                {index + 1}. {box.label}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};