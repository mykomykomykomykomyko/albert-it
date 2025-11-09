import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface SavedCanvas {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface LoadCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (canvasData: any) => void;
}

export const LoadCanvasDialog = ({ open, onOpenChange, onLoad }: LoadCanvasDialogProps) => {
  const { t } = useTranslation('canvas');
  const [canvases, setCanvases] = useState<SavedCanvas[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCanvases();
    }
  }, [open]);

  const loadCanvases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_canvases')
        .select('id, name, description, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCanvases(data || []);
    } catch (error) {
      console.error('Error loading canvases:', error);
      toast.error('Failed to load canvases');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('saved_canvases')
        .select('canvas_data')
        .eq('id', id)
        .single();

      if (error) throw error;
      onLoad(data.canvas_data);
      onOpenChange(false);
      toast.success('Canvas loaded successfully');
    } catch (error) {
      console.error('Error loading canvas:', error);
      toast.error('Failed to load canvas');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('loadDialog.deleteConfirm'))) return;
    
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('saved_canvases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Canvas deleted');
      loadCanvases();
    } catch (error) {
      console.error('Error deleting canvas:', error);
      toast.error('Failed to delete canvas');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('loadDialog.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : canvases.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t('loadDialog.noCanvases')}
            </div>
          ) : (
            <div className="space-y-2">
              {canvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{canvas.name}</h3>
                    {canvas.description && (
                      <p className="text-sm text-muted-foreground">{canvas.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('loadDialog.updated')} {format(new Date(canvas.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad(canvas.id)}
                    >
                      {t('loadDialog.load')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(canvas.id)}
                      disabled={deleting === canvas.id}
                    >
                      {deleting === canvas.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};