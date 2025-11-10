import { useState } from "react";
import { Upload, FileText, X, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/utils/fileTextExtraction";
import { isTextFile, extractTextFromFiles } from "@/utils/parseText";
import { formatBytes } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AgentDocument {
  id: string;
  filename: string;
  content: string;
  fileSize: number;
  uploadedAt: string;
  storagePath: string;
  pageCount?: number;
}

interface AgentDocumentManagerProps {
  documents: AgentDocument[];
  onDocumentsChange: (documents: AgentDocument[]) => void;
  agentId?: string;
}

const MAX_DOCUMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AgentDocumentManager({
  documents,
  onDocumentsChange,
  agentId,
}: AgentDocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AgentDocument | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (documents.length + files.length > MAX_DOCUMENTS) {
      toast.error(`Maximum ${MAX_DOCUMENTS} documents allowed`);
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newDocuments: AgentDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        // Check if document with same name already exists
        if (documents.some(doc => doc.filename === file.name)) {
          toast.error(`Document with name "${file.name}" already exists`);
          continue;
        }

        // Extract text content
        let content = "";
        let pageCount: number | undefined;

        try {
          const ext = file.name.toLowerCase();
          if (ext.endsWith('.pdf') || ext.endsWith('.docx')) {
            const extracted = await extractTextFromFile(file);
            content = extracted.content;
            pageCount = extracted.pageCount;
          } else if (isTextFile(file)) {
            const textFiles = await extractTextFromFiles([file]);
            content = textFiles[0]?.content || "";
          } else {
            toast.error(`Unsupported file type: ${file.name}`);
            continue;
          }
        } catch (error) {
          console.error("Error extracting text:", error);
          toast.error(`Failed to extract text from ${file.name}`);
          continue;
        }

        if (!content.trim()) {
          toast.error(`No text content found in ${file.name}`);
          continue;
        }

        // Upload to storage
        const storagePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('agent-documents')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        newDocuments.push({
          id: crypto.randomUUID(),
          filename: file.name,
          content,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          storagePath,
          pageCount,
        });
      }

      if (newDocuments.length > 0) {
        onDocumentsChange([...documents, ...newDocuments]);
        toast.success(`Added ${newDocuments.length} document(s)`);
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async (doc: AgentDocument) => {
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('agent-documents')
        .remove([doc.storagePath]);

      if (error) throw error;

      onDocumentsChange(documents.filter(d => d.id !== doc.id));
      toast.success("Document removed");
    } catch (error) {
      console.error("Error removing document:", error);
      toast.error("Failed to remove document");
    }
  };

  const handleDownloadDocument = async (doc: AgentDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('agent-documents')
        .download(doc.storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Knowledge Documents</h3>
          <p className="text-xs text-muted-foreground">
            Upload documents to provide context (PDF, DOCX, TXT, MD, etc.)
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {documents.length}/{MAX_DOCUMENTS} documents
        </div>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(doc.fileSize)}
                      {doc.pageCount && ` • ${doc.pageCount} pages`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {doc.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDownloadDocument(doc)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveDocument(doc)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {documents.length < MAX_DOCUMENTS && (
        <div className="relative">
          <input
            type="file"
            id="document-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md,.json,.csv"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
          <label htmlFor="document-upload">
            <Button
              variant="outline"
              className="w-full"
              disabled={uploading}
              asChild
            >
              <div className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Documents"}
              </div>
            </Button>
          </label>
        </div>
      )}

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.filename}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <div className="text-sm whitespace-pre-wrap p-4">
              {previewDoc?.content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
