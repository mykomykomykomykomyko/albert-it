import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';

// Configure PDF.js worker using proper path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

console.log('PDF.js configured with worker:', pdfjsLib.GlobalWorkerOptions.workerSrc);

/**
 * Clone an ArrayBuffer to prevent detachment issues
 * @param buffer - The ArrayBuffer to clone
 * @returns A new ArrayBuffer with the same data
 */
const cloneArrayBuffer = (buffer: ArrayBuffer): ArrayBuffer => {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Invalid or empty ArrayBuffer');
  }
  
  // Create a new ArrayBuffer and copy the data
  const cloned = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(cloned).set(new Uint8Array(buffer));
  return cloned;
};

/**
 * Safely get ArrayBuffer from FileReader result
 * @param result - FileReader result
 * @returns Safe ArrayBuffer copy
 */
const getSafeArrayBuffer = (result: ArrayBuffer): ArrayBuffer => {
  if (!result) {
    throw new Error('No ArrayBuffer result from FileReader');
  }
  
  if (result.byteLength === 0) {
    throw new Error('Empty ArrayBuffer from FileReader');
  }
  
  // Always clone to prevent detachment issues
  return cloneArrayBuffer(result);
};

/**
 * Load PDF.js library
 * @returns PDF.js library object
 */
export const loadPdfJs = async () => {
  console.log('Using installed pdfjs-dist package');
  return pdfjsLib;
};

/**
 * Render a PDF page to a canvas element
 * @param pdfDocument - The PDF document object
 * @param pageNum - Page number to render (1-based)
 * @param targetScale - Scale factor for rendering (default: 1.5)
 * @returns Canvas element with rendered page
 */
export const renderPageToCanvas = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy, 
  pageNum: number, 
  targetScale = 1.5
): Promise<HTMLCanvasElement> => {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale: targetScale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  try {
    await page.render(renderContext).promise;
    console.debug(`Page ${pageNum} rendered successfully`);
  } catch (renderError) {
    console.warn(`Partial rendering for page ${pageNum} due to error: ${renderError}`);
    // Continue with partial rendering
  }

  return canvas;
};

/**
 * Rasterize a single PDF page to a data URL
 * @param pdfArrayBuffer - PDF file as ArrayBuffer
 * @param pageIndex - Page index to rasterize (0-based)
 * @param scale - Scale factor for rendering (default: 2.5)
 * @returns Data URL of the rasterized page
 */
export const rasterizePdfPage = async (
  pdfArrayBuffer: ArrayBuffer, 
  pageIndex: number, 
  scale = 2.5
): Promise<string> => {
  try {
    console.log(`Rasterizing PDF page ${pageIndex + 1}`);

    const pdfLib = await loadPdfJs();
    if (!pdfLib) {
      throw new Error('Failed to load PDF.js library');
    }

    // Clone the ArrayBuffer to prevent detachment
    const safeArrayBuffer = cloneArrayBuffer(pdfArrayBuffer);

    // Load the PDF document
    const loadingTask = pdfLib.getDocument({
      data: safeArrayBuffer
    });
    const pdf = await loadingTask.promise;

    // Get the specific page (PDF.js uses 1-based indexing)
    const page = await pdf.getPage(pageIndex + 1);

    // Set up canvas with specified scale for good quality
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    // Render the page with error handling for JPX issues
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    try {
      await page.render(renderContext).promise;
      console.debug(`Page ${pageIndex + 1} rendered successfully`);
    } catch (renderError) {
      console.warn(`Partial rendering for page ${pageIndex + 1} due to error: ${renderError}`);
      // Continue with partial rendering (text and non-JPX content)
    }

    // Convert canvas to data URL with high quality
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    console.log(`Successfully rasterized page ${pageIndex + 1}`);

    // Clean up
    canvas.remove();

    return dataUrl;
  } catch (error) {
    console.error(`Error rasterizing PDF page ${pageIndex + 1}:`, error);
    throw error; // Rethrow to allow calling code to handle
  }
};

export interface PDFTextContent {
  pagesText: string[];
}

/**
 * Extract text content from a PDF
 * @param arrayBuffer - PDF file as ArrayBuffer
 * @returns Object containing array of page texts
 */
export const extractPDFText = async (arrayBuffer: ArrayBuffer): Promise<PDFTextContent> => {
  if (!arrayBuffer) throw new Error('Invalid PDF input');

  const pdfLib = await loadPdfJs();
  if (!pdfLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Clone the ArrayBuffer to prevent detachment
  const safeArrayBuffer = cloneArrayBuffer(arrayBuffer);

  const loadingTask = pdfLib.getDocument({
    data: safeArrayBuffer
  });
  const pdf = await loadingTask.promise;
  const textContent: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContentItems = await page.getTextContent({
      includeMarkedContent: true
    });
    const pageText = textContentItems.items
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();
    textContent.push(pageText);
  }

  return { pagesText: textContent };
};

export interface PDFPages {
  pages: string[];
}

/**
 * Rasterize all pages of a PDF to data URLs
 * @param arrayBuffer - PDF file as ArrayBuffer
 * @param scale - Scale factor for rendering (default: 2.5)
 * @returns Object containing array of page data URLs
 */
export const rasterizePDF = async (arrayBuffer: ArrayBuffer, scale = 2.5): Promise<PDFPages> => {
  if (!arrayBuffer) throw new Error('Invalid PDF input');

  const pdfLib = await loadPdfJs();
  if (!pdfLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Clone the ArrayBuffer to prevent detachment
  const safeArrayBuffer = cloneArrayBuffer(arrayBuffer);

  const loadingTask = pdfLib.getDocument({
    data: safeArrayBuffer
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    try {
      await page.render({
        canvasContext: context,
        viewport,
        canvas: canvas,
      }).promise;
      console.debug(`Page ${i} rendered successfully`);
    } catch (renderError) {
      console.warn(`Partial rendering for page ${i} due to error: ${renderError}`);
      // Continue with partial rendering
    }

    const dataUrl = canvas.toDataURL('image/png', 0.95);
    pages.push(dataUrl);
    canvas.remove();
  }

  return { pages };
};

export interface PDFInfo {
  numPages: number;
  fingerprint: string;
  info: any;
}

/**
 * Get PDF metadata and page count
 * @param arrayBuffer - PDF file as ArrayBuffer
 * @returns Object containing PDF metadata
 */
export const getPDFInfo = async (arrayBuffer: ArrayBuffer): Promise<PDFInfo> => {
  if (!arrayBuffer) throw new Error('Invalid PDF input');

  const pdfLib = await loadPdfJs();
  if (!pdfLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Clone the ArrayBuffer to prevent detachment
  const safeArrayBuffer = cloneArrayBuffer(arrayBuffer);

  const loadingTask = pdfLib.getDocument({
    data: safeArrayBuffer
  });
  const pdf = await loadingTask.promise;

  return {
    numPages: pdf.numPages,
    fingerprint: pdf.fingerprints[0] || '',
    info: await pdf.getMetadata()
  };
};

export interface RasterizedPage {
  pageIndex: number;
  pageNumber: number;
  dataUrl?: string;
  error?: string;
  success: boolean;
}

/**
 * Rasterize specific pages of a PDF
 * @param arrayBuffer - PDF file as ArrayBuffer
 * @param pageIndices - Array of page indices to rasterize (0-based)
 * @param scale - Scale factor for rendering (default: 2.5)
 * @returns Array of objects containing page data and metadata
 */
export const rasterizeSelectedPages = async (
  arrayBuffer: ArrayBuffer, 
  pageIndices: number[], 
  scale = 2.5
): Promise<RasterizedPage[]> => {
  if (!arrayBuffer) throw new Error('Invalid PDF input');
  if (!Array.isArray(pageIndices) || pageIndices.length === 0) {
    throw new Error('Invalid page indices');
  }

  const pdfLib = await loadPdfJs();
  if (!pdfLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Clone the ArrayBuffer to prevent detachment
  const safeArrayBuffer = cloneArrayBuffer(arrayBuffer);

  const loadingTask = pdfLib.getDocument({
    data: safeArrayBuffer
  });
  const pdf = await loadingTask.promise;
  const results: RasterizedPage[] = [];

  for (const pageIndex of pageIndices) {
    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      console.warn(`Page index ${pageIndex} is out of range (0-${pdf.numPages - 1})`);
      continue;
    }

    try {
      // Use the original ArrayBuffer for each page to avoid detachment
      const dataUrl = await rasterizePdfPage(arrayBuffer, pageIndex, scale);
      results.push({
        pageIndex,
        pageNumber: pageIndex + 1,
        dataUrl,
        success: true
      });
    } catch (error) {
      console.error(`Failed to rasterize page ${pageIndex + 1}:`, error);
      results.push({
        pageIndex,
        pageNumber: pageIndex + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }

  return results;
};

export interface PDFThumbnail {
  pageIndex: number;
  pageNumber: number;
  dataUrl?: string;
  error?: string;
  selected: boolean;
}

/**
 * Create thumbnail images for PDF pages
 * @param arrayBuffer - PDF file as ArrayBuffer
 * @param maxPages - Maximum number of pages to create thumbnails for (default: 20)
 * @param scale - Scale factor for thumbnails (default: 1.0)
 * @returns Array of thumbnail objects
 */
export const createPDFThumbnails = async (
  arrayBuffer: ArrayBuffer, 
  maxPages = 20, 
  scale = 1.0
): Promise<PDFThumbnail[]> => {
  if (!arrayBuffer) throw new Error('Invalid PDF input');

  const pdfLib = await loadPdfJs();
  if (!pdfLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Clone the ArrayBuffer to prevent detachment
  const safeArrayBuffer = cloneArrayBuffer(arrayBuffer);

  const loadingTask = pdfLib.getDocument({
    data: safeArrayBuffer
  });
  const pdf = await loadingTask.promise;
  const thumbnails: PDFThumbnail[] = [];
  const pagesToProcess = Math.min(maxPages, pdf.numPages);

  for (let i = 0; i < pagesToProcess; i++) {
    try {
      // Use the original ArrayBuffer for each page
      const dataUrl = await rasterizePdfPage(arrayBuffer, i, scale);
      thumbnails.push({
        pageIndex: i,
        pageNumber: i + 1,
        dataUrl,
        selected: false
      });
    } catch (error) {
      console.error(`Failed to create thumbnail for page ${i + 1}:`, error);
      thumbnails.push({
        pageIndex: i,
        pageNumber: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        selected: false
      });
    }
  }

  return thumbnails;
};

export interface ProcessedPDFFile {
  file: {
    name: string;
    size: number;
    type: string;
  };
  pdfInfo: PDFInfo;
  thumbnails: PDFThumbnail[];
  arrayBuffer: ArrayBuffer;
}

/**
 * Process a PDF file and return both metadata and thumbnails
 * @param file - PDF file object
 * @returns Object containing file info, PDF metadata, and thumbnails for all pages
 */
export const processPDFFile = async (file: File): Promise<ProcessedPDFFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result as ArrayBuffer;
        
        if (!result) {
          throw new Error('Failed to read PDF file');
        }

        // Get a safe ArrayBuffer copy
        const arrayBuffer = getSafeArrayBuffer(result);

        // Get PDF info
        const pdfInfo = await getPDFInfo(arrayBuffer);
        
        // Create thumbnails for ALL pages (not just first 20)
        console.log(`Creating thumbnails for all ${pdfInfo.numPages} pages`);
        const thumbnails = await createPDFThumbnails(arrayBuffer, pdfInfo.numPages);

        resolve({
          file: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          pdfInfo,
          thumbnails,
          arrayBuffer // Keep the safe copy for later use
        });
      } catch (error) {
        reject(new Error(`Failed to process PDF ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read PDF file ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
};

