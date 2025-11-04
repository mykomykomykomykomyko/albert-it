import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSavedCanvases } from '@/hooks/useSavedCanvases';
import { Loader2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface LoadCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (canvasData: any) => void;
}

export const LoadCanvasDialog = ({ open, onOpenChange, onLoad }: LoadCanvasDialogProps) => {
  const { savedCanvases, loading } = useSavedCanvases();

  const handleLoad = (canvas: any) => {
    onLoad(canvas.canvas_data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Load Canvas</DialogTitle>
          <DialogDescription>
            Select a previously saved canvas to load
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : savedCanvases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No saved canvases found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Save your current canvas to load it later
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
              {savedCanvases.map((canvas) => (
                <Card
                  key={canvas.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleLoad(canvas)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{canvas.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {canvas.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(canvas.updated_at), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};