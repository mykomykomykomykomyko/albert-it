import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface TransparencyPanelProps {
  lastPayload: any;
  onClose: () => void;
}

export function TransparencyPanel({ lastPayload, onClose }: TransparencyPanelProps) {
  if (!lastPayload) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Request Details</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Send a message to see request details</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No request data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(lastPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded request data');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Full payload sent to the LLM</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-2" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {lastPayload.timestamp && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Timestamp</h4>
                <Badge variant="outline">{new Date(lastPayload.timestamp).toLocaleString()}</Badge>
              </div>
            )}

            {lastPayload.endpoint && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Endpoint</h4>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {lastPayload.endpoint}
                </code>
              </div>
            )}

            {lastPayload.model && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Model</h4>
                <Badge>{lastPayload.model}</Badge>
              </div>
            )}

            {lastPayload.agent && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Agent</h4>
                <p className="text-sm text-muted-foreground">{lastPayload.agent.name}</p>
              </div>
            )}

            {lastPayload.systemPrompt && (
              <div>
                <h4 className="text-sm font-semibold mb-1">System Prompt</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {lastPayload.systemPrompt}
                </pre>
              </div>
            )}

            {lastPayload.messages && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Message History ({lastPayload.messages.length})</h4>
                <div className="space-y-2">
                  {lastPayload.messages.map((msg: any, idx: number) => (
                    <div key={idx} className="bg-muted p-2 rounded">
                      <Badge variant="secondary" className="mb-1">{msg.role}</Badge>
                      <pre className="text-xs whitespace-pre-wrap">
                        {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastPayload.attachments && lastPayload.attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Attachments ({lastPayload.attachments.length})</h4>
                <div className="space-y-1">
                  {lastPayload.attachments.map((att: any, idx: number) => (
                    <Badge key={idx} variant="outline">
                      {att.type}: {att.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {lastPayload.fullRequest && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Full Request JSON</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(lastPayload.fullRequest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
