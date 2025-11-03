import { useState, useEffect } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConversationSharing } from '@/hooks/useConversationSharing';
import { toast } from 'sonner';

interface ShareConversationDialogProps {
  conversationId: string;
  conversationTitle: string;
  isShared?: boolean;
  shareToken?: string | null;
  onShareStatusChange?: () => void;
}

export function ShareConversationDialog({
  conversationId,
  conversationTitle,
  isShared: initialIsShared = false,
  shareToken: initialShareToken = null,
  onShareStatusChange
}: ShareConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isShared, setIsShared] = useState(initialIsShared);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const { generateShareLink, revokeShareLink, isGenerating } = useConversationSharing();

  useEffect(() => {
    if (initialShareToken) {
      setShareUrl(`${window.location.origin}/chat/shared/${initialShareToken}`);
      setIsShared(true);
    } else {
      setShareUrl('');
      setIsShared(false);
    }
  }, [initialShareToken, initialIsShared]);

  const handleToggleSharing = async (enabled: boolean) => {
    if (enabled) {
      // Generate share link
      const url = await generateShareLink(conversationId);
      if (url) {
        setShareUrl(url);
        setIsShared(true);
        toast.success('Share link generated!');
        onShareStatusChange?.();
      }
    } else {
      // Revoke share link
      const success = await revokeShareLink(conversationId);
      if (success) {
        setShareUrl('');
        setIsShared(false);
        onShareStatusChange?.();
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Share conversation"
          className="hover:bg-accent text-foreground"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Share "{conversationTitle}" with anyone via a public link
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Enable/Disable Sharing Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="share-toggle" className="flex flex-col space-y-1">
              <span>Enable sharing</span>
              <span className="text-sm text-muted-foreground font-normal">
                Anyone with the link can view this conversation
              </span>
            </Label>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleSharing}
              disabled={isGenerating}
            />
          </div>

          {/* Share Link Display */}
          {isShared && shareUrl && (
            <div className="space-y-2">
              <Label htmlFor="share-url">Share link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={handleCopyLink}
                  disabled={isCopied}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link will remain active until you disable sharing.
              </p>
            </div>
          )}

          {/* Warning when sharing is disabled */}
          {!isShared && (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Enable sharing to generate a public link for this conversation.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
