import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrompts } from '@/hooks/usePrompts';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Edit, Eye } from 'lucide-react';

export default function PromptReviewTab() {
  const { loadPendingPrompts, approvePrompt, rejectPrompt, sendBackForEditing } = usePrompts();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    const data = await loadPendingPrompts();
    setPrompts(data);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedPrompt) return;
    await approvePrompt(selectedPrompt.id);
    setSelectedPrompt(null);
    setReviewNotes('');
    loadPending();
  };

  const handleReject = async () => {
    if (!selectedPrompt) return;
    await rejectPrompt(selectedPrompt.id, reviewNotes);
    setSelectedPrompt(null);
    setReviewNotes('');
    loadPending();
  };

  const handleSendBack = async () => {
    if (!selectedPrompt || !reviewNotes.trim()) return;
    await sendBackForEditing(selectedPrompt.id, reviewNotes);
    setSelectedPrompt(null);
    setReviewNotes('');
    loadPending();
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading pending prompts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Pending Prompt Reviews</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve prompts submitted to the marketplace
        </p>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No prompts pending review
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                    {prompt.category && (
                      <Badge variant="secondary" className="mt-2">
                        {prompt.category}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
                {prompt.description && (
                  <CardDescription className="mt-2">
                    {prompt.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                    {prompt.prompt_text}
                  </div>

                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Submitted: {prompt.submitted_at ? format(new Date(prompt.submitted_at), 'MMM d, yyyy') : 'N/A'}
                  </div>

                  <Button
                    onClick={() => setSelectedPrompt(prompt)}
                    className="w-full"
                    variant="outline"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedPrompt} onOpenChange={() => setSelectedPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Prompt: {selectedPrompt?.name}</DialogTitle>
            <DialogDescription>
              Review this prompt submission and decide to approve, send back for editing, or reject
            </DialogDescription>
          </DialogHeader>

          {selectedPrompt && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm mt-1">{selectedPrompt.name}</p>
              </div>

              {selectedPrompt.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm mt-1">{selectedPrompt.description}</p>
                </div>
              )}

              {selectedPrompt.category && (
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm mt-1">
                    <Badge variant="secondary">{selectedPrompt.category}</Badge>
                  </p>
                </div>
              )}

              {selectedPrompt.tags && selectedPrompt.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPrompt.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Prompt Content</label>
                <div className="bg-muted p-4 rounded-md text-sm mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {selectedPrompt.prompt_text}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes (optional for approval, required for sending back)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your review decision..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleApprove}
              variant="default"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve & Publish
            </Button>
            <Button
              onClick={handleSendBack}
              variant="outline"
              disabled={!reviewNotes.trim()}
            >
              <Edit className="mr-2 h-4 w-4" />
              Send Back for Editing
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
