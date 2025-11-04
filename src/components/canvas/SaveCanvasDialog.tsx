import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSavedCanvases } from '@/hooks/useSavedCanvases';

interface SaveCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowData: {
    name: string;
    nodes: any[];
    edges: any[];
    globalInput: string;
  };
}

export const SaveCanvasDialog = ({ open, onOpenChange, workflowData }: SaveCanvasDialogProps) => {
  const { saveCanvas } = useSavedCanvases();
  const [name, setName] = useState(workflowData.name || 'Untitled Canvas');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await saveCanvas(name, description, workflowData);
      onOpenChange(false);
      setName('');
      setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Canvas</DialogTitle>
          <DialogDescription>
            Save your workflow to load it later
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="canvas-name">Name *</Label>
            <Input
              id="canvas-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workflow"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canvas-description">Description</Label>
            <Textarea
              id="canvas-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this canvas do?"
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : 'Save Canvas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};