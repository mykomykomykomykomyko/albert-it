import { X, FileText, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewCardProps {
  file: {
    name: string;
    dataUrl?: string;
    size: number;
    type?: string;
    content?: string;
  };
  onRemove: () => void;
  type: 'image' | 'file';
}

export function FilePreviewCard({ file, onRemove, type }: FilePreviewCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (type === 'image') return ImageIcon;
    if (file.name.match(/\.(xlsx?|csv)$/i)) return FileSpreadsheet;
    return FileText;
  };

  const Icon = getFileIcon();

  return (
    <div className="relative group bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-all">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="flex items-start gap-3">
        {type === 'image' && file.dataUrl ? (
          <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-border">
            <img
              src={file.dataUrl}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatFileSize(file.size)}
          </p>
          {file.type && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {file.type}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
