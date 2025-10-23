import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Upload, Image, FileText, Loader2 } from 'lucide-react';
import { ProcessedImage, ImageAttachment } from '@/types/imageAnalysis';
import { generateId } from '@/lib/utils';
import { processPDFFile, ProcessedPDFFile } from '@/lib/parsePdf';
import { PDFSelector } from './PDFSelector';
import { toast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFilesAdded: (files: ProcessedImage[]) => void;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded, disabled = false }) => {
  const [pdfData, setPdfData] = useState<ProcessedPDFFile | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const processedImages: ProcessedImage[] = [];

    for (const file of acceptedFiles) {
      if (file.type === 'application/pdf') {
        // Handle PDF files differently
        try {
          setIsProcessingPdf(true);
          console.log('Processing PDF file:', file.name);
          const processed = await processPDFFile(file);
          setPdfData(processed);
          toast({
            title: "PDF processed successfully",
            description: `Select pages from ${file.name} to add to your collection.`,
          });
        } catch (error) {
          console.error('Error processing PDF:', error);
          toast({
            title: "Error processing PDF",
            description: "Failed to process the PDF file. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessingPdf(false);
        }
      } else {
        // Handle regular image files
        const processedFile: ProcessedImage = {
          id: generateId(),
          file: file,
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          size: file.size,
          selected: false,
          resizeEnabled: false,
          uploadedAt: new Date()
        };
        processedImages.push(processedFile);
      }
    }

    if (processedImages.length > 0) {
      onFilesAdded(processedImages);
      toast({
        title: "Files uploaded successfully",
        description: `Added ${processedImages.length} file(s) to your collection.`,
      });
    }
  }, [onFilesAdded]);

  const handlePdfSelection = useCallback((selectedImages: ImageAttachment[]) => {
    // Convert PDF pages to ProcessedImage objects
    const processedImages: ProcessedImage[] = selectedImages.map(img => ({
      id: generateId(),
      file: new File([img.dataUrl], img.name, { type: 'image/png' }),
      url: img.dataUrl,
      name: img.name,
      type: 'image/png',
      size: img.size,
      selected: false,
      resizeEnabled: false,
      uploadedAt: new Date()
    }));

    onFilesAdded(processedImages);
    setPdfData(null);
    
    toast({
      title: "PDF pages added",
      description: `Added ${processedImages.length} page(s) from PDF to your collection.`,
    });
  }, [onFilesAdded]);

  const handlePdfClose = useCallback(() => {
    setPdfData(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: disabled || isProcessingPdf,
  });

  return (
    <>
      <Card className="relative overflow-hidden">
        <div
          {...getRootProps()}
          className={`
            relative cursor-pointer transition-all duration-300 p-8
            ${isDragActive ? 'bg-primary/5 border-primary' : 'hover:bg-accent/50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isProcessingPdf ? 'pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} disabled={disabled || isProcessingPdf} />
          
          <div className="flex flex-col items-center text-center space-y-4">
            {isProcessingPdf ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div>
                  <p className="text-lg font-medium text-foreground">Processing PDF...</p>
                  <p className="text-sm text-muted-foreground">
                    Generating page thumbnails
                  </p>
                </div>
              </>
            ) : isDragActive ? (
              <>
                <Upload className="w-12 h-12 text-primary" />
                <div>
                  <p className="text-lg font-medium text-primary">Drop your files here</p>
                  <p className="text-sm text-muted-foreground">
                    Release to upload your images and PDFs
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <Image className="w-8 h-8 text-muted-foreground" />
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drag & drop files here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse your files
                  </p>
                </div>
              </>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span className="flex items-center">
                <Image className="w-4 h-4 mr-1" />
                Images: JPG, PNG, WebP
              </span>
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                PDFs
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* PDF Selector Modal */}
      {pdfData && (
        <PDFSelector
          pdfData={pdfData}
          onClose={handlePdfClose}
          onSelect={handlePdfSelection}
        />
      )}
    </>
  );
};