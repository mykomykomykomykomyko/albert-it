import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  FileText, 
  AlertTriangle,
  Check
} from 'lucide-react';
import { rasterizeSelectedPages } from '@/utils/parsePdf';
import { ImageAttachment } from '@/types/imageAnalysis';

interface PDFThumbnail {
  pageIndex: number;
  pageNumber: number;
  dataUrl?: string;
  error?: string;
  selected: boolean;
}

interface PDFData {
  file: {
    name: string;
    size: number;
    type: string;
  };
  pdfInfo: {
    numPages: number;
  };
  thumbnails: PDFThumbnail[];
  arrayBuffer: ArrayBuffer;
}

interface PDFSelectorProps {
  pdfData: PDFData;
  onClose: () => void;
  onSelect: (selectedImages: ImageAttachment[]) => void;
}

export function PDFSelector({ pdfData, onClose, onSelect }: PDFSelectorProps) {
  const [pages, setPages] = useState<PDFThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPageSet, setCurrentPageSet] = useState(1);
  const pagesPerSet = 20;

  const totalPages = pdfData.pdfInfo.numPages;
  const totalPageSets = Math.ceil(totalPages / pagesPerSet);
  const selectedCount = pages.filter(p => p.selected).length;
  const allSelected = pages.length > 0 && pages.every(p => p.selected);

  const currentPages = pages.slice(
    (currentPageSet - 1) * pagesPerSet,
    currentPageSet * pagesPerSet
  );

  useEffect(() => {
    loadInitialPages();
  }, []);

  const loadInitialPages = async () => {
    try {
      setIsLoading(true);
      console.log('Loading initial pages for PDF:', pdfData.file.name);
      console.log('Available thumbnails:', pdfData.thumbnails?.length || 0);
      
      if (pdfData.thumbnails && pdfData.thumbnails.length > 0) {
        // Use existing thumbnails from processPDFFile
        console.log('Using existing thumbnails');
        setPages(pdfData.thumbnails.map(thumb => ({
          ...thumb,
          selected: false
        })));
      } else {
        console.log('No thumbnails found');
        setPages([]);
      }
    } catch (error) {
      console.error('Error loading initial PDF pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const retryLoading = async () => {
    console.log('Retrying to load PDF pages');
    await loadInitialPages();
  };

  const handleImageError = (pageIndex: number) => {
    setPages(prev => prev.map(page => 
      page.pageIndex === pageIndex 
        ? { ...page, error: 'Failed to load image' }
        : page
    ));
  };

  const togglePageSelection = (page: PDFThumbnail) => {
    setPages(prev => prev.map(p => 
      p.pageIndex === page.pageIndex 
        ? { ...p, selected: !p.selected }
        : p
    ));
  };

  const toggleSelectAll = () => {
    const newState = !allSelected;
    setPages(prev => prev.map(page => ({ ...page, selected: newState })));
  };

  const previousPageSet = () => {
    if (currentPageSet > 1) {
      setCurrentPageSet(prev => prev - 1);
    }
  };

  const nextPageSet = () => {
    if (currentPageSet < totalPageSets) {
      setCurrentPageSet(prev => prev + 1);
    }
  };

  const confirmSelection = async () => {
    try {
      const selectedPages = pages.filter(p => p.selected);
      if (selectedPages.length === 0) return;

      console.log(`Confirming selection of ${selectedPages.length} pages`);

      // Convert selected pages to high-quality images
      const selectedIndices = selectedPages.map(p => p.pageIndex);
      console.log('Selected page indices:', selectedIndices);
      
      const highQualityPages = await rasterizeSelectedPages(
        pdfData.arrayBuffer,
        selectedIndices,
        2.5 // Higher scale for final images
      );

      console.log('High quality pages generated:', highQualityPages.length);

      // Convert to image objects compatible with chat
      const imageObjects: ImageAttachment[] = highQualityPages
        .filter(p => p.success && p.dataUrl)
        .map(p => ({
          name: `${pdfData.file.name} - Page ${p.pageNumber}`,
          dataUrl: p.dataUrl!,
          size: 0, // We don't have size info for generated images
          pageNumber: p.pageNumber,
          source: 'pdf'
        }));

      console.log('Image objects created:', imageObjects.length);
      onSelect(imageObjects);
    } catch (error) {
      console.error('Error processing selected pages:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl shadow-2xl max-w-6xl w-full my-auto flex flex-col" style={{maxHeight: 'calc(100vh - 2rem)'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-semibold truncate">Select PDF Pages</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
              {pdfData.file.name} • {pdfData.pdfInfo.numPages} pages
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Page {currentPageSet} of {totalPageSets}</span>
              <span className="sm:hidden">{currentPageSet}/{totalPageSets}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={previousPageSet}
                  disabled={currentPageSet === 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextPageSet}
                  disabled={currentPageSet === totalPageSets}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Action buttons */}
            <Button
              variant="ghost"
              onClick={toggleSelectAll}
              className="text-primary hidden md:flex"
              size="sm"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content with enforced scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center p-8 md:p-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading PDF pages...</p>
              </div>
            </div>
          )}

          {/* No pages state */}
          {!isLoading && pages.length === 0 && (
            <div className="flex items-center justify-center p-8 md:p-12">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No PDF pages loaded</p>
                <p className="text-sm text-muted-foreground mb-4">
                  PDF Info: {pdfData.pdfInfo.numPages} pages<br/>
                  Thumbnails: {pdfData.thumbnails?.length || 0} loaded
                </p>
                <Button onClick={retryLoading}>
                  Retry Loading
                </Button>
              </div>
            </div>
          )}

          {/* PDF Pages Grid */}
          {!isLoading && pages.length > 0 && (
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {currentPages.map((page) => (
                  <div
                    key={page.pageIndex}
                    className="relative group cursor-pointer"
                    onClick={() => togglePageSelection(page)}
                  >
                    {/* Page thumbnail */}
                    <div
                      className={`relative border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                        page.selected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      {page.dataUrl && !page.error ? (
                        <img
                          src={page.dataUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-auto object-contain bg-white"
                          loading="lazy"
                          onError={() => handleImageError(page.pageIndex)}
                        />
                      ) : page.error ? (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">Error loading</p>
                            <p className="text-xs">{page.error}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      )}

                      {/* Selection overlay */}
                      {page.selected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
                    </div>

                    {/* Page number */}
                    <div className="text-center mt-2">
                      <span className="text-sm font-medium">
                        Page {page.pageNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 md:p-6 border-t shrink-0 bg-background">
          <div className="text-xs md:text-sm text-muted-foreground">
            {selectedCount} of {totalPages} pages selected
          </div>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              onClick={toggleSelectAll}
              variant="outline"
              className="flex-1 sm:flex-initial md:hidden"
            >
              {allSelected ? 'Deselect' : 'Select All'}
            </Button>
            <Button
              onClick={confirmSelection}
              disabled={selectedCount === 0}
              className="flex-1 sm:flex-initial"
            >
              Add {selectedCount} Page{selectedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
