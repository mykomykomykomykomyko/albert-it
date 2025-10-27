import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2 } from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';

interface ShareWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string | null;
  workflowName: string;
}

export function ShareWorkflowDialog({ open, onOpenChange, workflowId, workflowName }: ShareWorkflowDialogProps) {
  const { shareWorkflow } = useWorkflows();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit' | 'execute'>('view');
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!workflowId || !email.trim()) {
      return;
    }

    setIsSharing(true);
    const success = await shareWorkflow(workflowId, email.trim(), permission);
    if (success) {
      setEmail('');
      setPermission('view');
      onOpenChange(false);
    }
    setIsSharing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share "{workflowName}" with another user by entering their email address.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <Select value={permission} onValueChange={(value: any) => setPermission(value)}>
              <SelectTrigger id="permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="edit">Can Edit</SelectItem>
                <SelectItem value="execute">Can Execute</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setEmail('');
                setPermission('view');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={!email.trim() || isSharing}>
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
