import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Send, 
  RotateCcw, 
  Download, 
  Loader2, 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Copy,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat, ImageAttachment, FileAttachment } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { isExcelFile, parseExcelFile } from '@/utils/parseExcel';
import { processPDFFile } from '@/utils/parsePdf';
import { isTextFile, extractTextFromFiles } from '@/utils/parseText';
import { PDFSelector } from './PDFSelector';
import { ExcelSelector } from './ExcelSelector';
import { ChatHeader } from './ChatHeader';

interface PendingPDF {
  file: File;
  pdfInfo: any;
  thumbnails: any[];
  arrayBuffer: ArrayBuffer;
}

interface PendingExcel {
  fileName: string;
  sheets: any[];
  totalSheets: number;
}

const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

// Function to process markdown content and extract markdown from code blocks
const processMarkdownContent = (content: string): string => {
  // Pattern to match ```markdown ... ``` blocks (case insensitive, with optional whitespace)
  const markdownBlockPattern = /```\s*markdown\s*\n([\s\S]*?)\n\s*```/gi;
  
  // Pattern to match ``` ... ``` blocks that contain markdown-like content
  const genericCodeBlockPattern = /```\s*\n([\s\S]*?)\n\s*```/g;
  
  let processedContent = content;
  
  // First, handle explicit ```markdown blocks
  processedContent = processedContent.replace(markdownBlockPattern, (match, markdownContent) => {
    // Return the markdown content directly, without the code block wrapper
    return markdownContent.trim();
  });
  
  // Then, handle generic code blocks that might contain markdown
  // Only process if they contain markdown-like patterns (headers, tables, lists, etc.)
  processedContent = processedContent.replace(genericCodeBlockPattern, (match, codeContent) => {
    const trimmedContent = codeContent.trim();
    
    // Check if the content looks like markdown (contains common markdown patterns)
    const hasMarkdownPatterns = (
      trimmedContent.includes('# ') ||      // Headers
      trimmedContent.includes('## ') ||     // Headers
      trimmedContent.includes('### ') ||    // Headers
      trimmedContent.includes('| ') ||      // Tables
      trimmedContent.includes('**') ||      // Bold
      trimmedContent.includes('*') ||       // Italic/Lists
      trimmedContent.includes('- ') ||      // Lists
      trimmedContent.includes('1. ') ||     // Numbered lists
      trimmedContent.includes('[') ||       // Links
      trimmedContent.includes('> ')         // Blockquotes
    );
    
    // If it looks like markdown and doesn't look like actual code, process it as markdown
    const looksLikeCode = (
      trimmedContent.includes('function ') ||
      trimmedContent.includes('const ') ||
      trimmedContent.includes('let ') ||
      trimmedContent.includes('var ') ||
      trimmedContent.includes('import ') ||
      trimmedContent.includes('export ') ||
      trimmedContent.includes('class ') ||
      trimmedContent.includes('def ') ||
      trimmedContent.includes('<?php') ||
      trimmedContent.includes('<html') ||
      trimmedContent.includes('<div') ||
      trimmedContent.includes('SELECT ') ||
      trimmedContent.includes('FROM ')
    );
    
    if (hasMarkdownPatterns && !looksLikeCode) {
      // Return the content as markdown, not as a code block
      return trimmedContent;
    }
    
    // Otherwise, keep it as a code block
    return match;
  });
  
  return processedContent;
};

// Copy to clipboard utility
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

// Download text as markdown file
const downloadAsMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Message Actions Component
interface MessageActionsProps {
  content: string;
  messageIndex: number;
  role: 'user' | 'assistant';
}

const MessageActions: React.FC<MessageActionsProps> = ({ content, messageIndex, role }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy message');
    }
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${role}-message-${messageIndex + 1}-${timestamp}.md`;
    downloadAsMarkdown(content, filename);
    toast.success('Message downloaded');
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className={`w-3.5 h-3.5 ${
            role === 'user' 
              ? 'text-blue-100 hover:text-white' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`} />
        )}
      </button>
      <button
        onClick={handleDownload}
        className="p-1.5 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
        title="Download as Markdown"
      >
        <Download className={`w-3.5 h-3.5 ${
          role === 'user' 
            ? 'text-blue-100 hover:text-white' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`} />
      </button>
    </div>
  );
};

export function Chat() {
  const [inputMessage, setInputMessage] = useState('');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [pendingPdfs, setPendingPdfs] = useState<PendingPDF[]>([]);
  const [pendingExcels, setPendingExcels] = useState<PendingExcel[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPdfSelector, setShowPdfSelector] = useState(false);
  const [currentPdfData, setCurrentPdfData] = useState<PendingPDF | null>(null);
  const [showExcelSelector, setShowExcelSelector] = useState(false);
  const [currentExcelData, setCurrentExcelData] = useState<PendingExcel | null>(null);
  
  // Scroll management state
  const [scrollLocked, setScrollLocked] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const { messages, loading, isLoadingHistory, sendMessage, resetChat } = useChat();

  // Download chat as markdown
  const downloadChat = () => {
    const content = messages.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      return `## ${role}\n\n${msg.content}\n\n`;
    }).join('---\n\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Check if user is at bottom of scroll
  const isAtBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return false;
    
    return Math.abs(
      container.scrollTop + container.clientHeight - container.scrollHeight
    ) < 10;
  }, []);

  // Handle scroll events - only update scroll lock, don't force scroll
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Mark that user is actively scrolling
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to detect when user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 150);

    // Update scroll lock based on position
    const atBottom = isAtBottom();
    setScrollLocked(atBottom);
  }, [isAtBottom]);

  // Scroll to bottom only when appropriate
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && scrollLocked && !isUserScrolling) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollLocked, isUserScrolling]);

  // Auto-scroll when messages change, but only if conditions are met
  useEffect(() => {
    // Only auto-scroll if:
    // 1. Scroll is locked (user is at bottom)
    // 2. User is not actively scrolling
    // 3. We're not loading history
    if (scrollLocked && !isUserScrolling && !isLoadingHistory) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, scrollLocked, isUserScrolling, isLoadingHistory, scrollToBottom]);

  // Force scroll when AI starts responding (but only if user hasn't scrolled up)
  useEffect(() => {
    if (loading && scrollLocked && !isUserScrolling) {
      // When AI starts responding, ensure we're at bottom
      setTimeout(() => {
        if (scrollLocked && !isUserScrolling) {
          scrollToBottom();
        }
      }, 100);
    }
  }, [loading, scrollLocked, isUserScrolling, scrollToBottom]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const processImageFile = (file: File): Promise<ImageAttachment> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name,
          dataUrl: e.target?.result as string,
          size: file.size
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: File[]) => {
    const imageFiles: File[] = [];
    const textFiles: File[] = [];
    const pdfFiles: File[] = [];
    const excelFiles: File[] = [];
    const unsupportedFiles: File[] = [];

    // Categorize files
    for (const file of files) {
      if (isImageFile(file)) {
        imageFiles.push(file);
      } else if (isPdfFile(file)) {
        pdfFiles.push(file);
      } else if (isExcelFile(file)) {
        excelFiles.push(file);
      } else if (isTextFile(file)) {
        textFiles.push(file);
      } else {
        unsupportedFiles.push(file);
      }
    }

    // Process images
    for (const file of imageFiles) {
      try {
        const imageData = await processImageFile(file);
        setAttachedImages(prev => [...prev, imageData]);
        console.log('Successfully added image:', imageData.name);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error(`Failed to process image: ${file.name}`);
      }
    }

    // Process text files
    if (textFiles.length > 0) {
      try {
        const results = await extractTextFromFiles(textFiles);
        setAttachedFiles(prev => [...prev, ...results]);
      } catch (error) {
        console.error('Error processing text files:', error);
        toast.error('Failed to process text files');
      }
    }

    // Process PDFs
    for (const file of pdfFiles) {
      try {
        console.log('Processing PDF file:', file.name);
        const pdfData = await processPDFFile(file);
        console.log('PDF processed successfully:', pdfData.file.name, 'Thumbnails:', pdfData.thumbnails?.length);
        setPendingPdfs(prev => [...prev, pdfData as any]);
        toast.success(`PDF processed: ${file.name}`);
      } catch (error) {
        console.error('Error processing PDF:', error);
        toast.error(`Failed to process PDF: ${file.name}`);
      }
    }

    // Process Excel files
    for (const file of excelFiles) {
      try {
        console.log('Processing Excel file:', file.name);
        const excelData = await parseExcelFile(file);
        console.log('Excel processed successfully:', excelData.fileName, 'Sheets:', excelData.totalSheets);
        setPendingExcels(prev => [...prev, excelData]);
        toast.success(`Excel processed: ${file.name}`);
      } catch (error) {
        console.error('Error processing Excel:', error);
        toast.error(`Failed to process Excel: ${file.name}`);
      }
    }

    // Log unsupported files
    if (unsupportedFiles.length > 0) {
      console.warn('Unsupported files:', unsupportedFiles.map(f => f.name));
      unsupportedFiles.forEach(file => {
        toast.error(`Unsupported file type: ${file.name}`);
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await processFiles(files);
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removePdf = (index: number) => {
    setPendingPdfs(prev => prev.filter((_, i) => i !== index));
  };

  const removeExcel = (index: number) => {
    setPendingExcels(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllAttachments = () => {
    setAttachedImages([]);
    setAttachedFiles([]);
    setPendingPdfs([]);
    setPendingExcels([]);
  };

  const openPdfSelector = (pdfData: PendingPDF) => {
    setCurrentPdfData(pdfData);
    setShowPdfSelector(true);
  };

  const closePdfSelector = () => {
    setShowPdfSelector(false);
    setCurrentPdfData(null);
  };

  const handlePdfPagesSelected = (selectedImages: ImageAttachment[]) => {
    setAttachedImages(prev => [...prev, ...selectedImages]);
    
    // Remove the PDF from pending list
    if (currentPdfData) {
      const pdfIndex = pendingPdfs.findIndex(pdf => pdf === currentPdfData);
      if (pdfIndex !== -1) {
        setPendingPdfs(prev => prev.filter((_, i) => i !== pdfIndex));
      }
    }
    
    closePdfSelector();
  };

  const openExcelSelector = (excelData: PendingExcel) => {
    setCurrentExcelData(excelData);
    setShowExcelSelector(true);
  };

  const closeExcelSelector = () => {
    setShowExcelSelector(false);
    setCurrentExcelData(null);
  };

  const handleExcelDataSelected = (selectedData: any) => {
    const fileAttachment: FileAttachment = {
      filename: selectedData.fileName,
      content: selectedData.formattedContent,
      totalSheets: selectedData.selectedData.length,
      totalRows: selectedData.totalRows,
      type: 'excel'
    };
    
    setAttachedFiles(prev => [...prev, fileAttachment]);
    
    // Remove the Excel from pending list
    if (currentExcelData) {
      const excelIndex = pendingExcels.findIndex(excel => excel === currentExcelData);
      if (excelIndex !== -1) {
        setPendingExcels(prev => prev.filter((_, i) => i !== excelIndex));
      }
    }
    
    closeExcelSelector();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachedImages.length === 0 && attachedFiles.length === 0) return;
    if (!user) {
      toast.error('Please sign in to use the chat');
      return;
    }

    // When sending a message, ensure we're at bottom and will auto-scroll
    setScrollLocked(true);
    setIsUserScrolling(false);

    const message = inputMessage.trim();
    const images = [...attachedImages];
    const files = [...attachedFiles];
    
    setInputMessage('');
    setAttachedImages([]);
    setAttachedFiles([]);
    adjustTextareaHeight();
    
    await sendMessage(message, images, files);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = async () => {
    await resetChat();
    setScrollLocked(true);
    setIsUserScrolling(false);
    toast.success('Chat history cleared');
  };

  // Function to manually scroll to bottom (for user action)
  const forceScrollToBottom = () => {
    setScrollLocked(true);
    setIsUserScrolling(false);
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
          <p className="text-muted-foreground">Please sign in to use the chat feature.</p>
        </Card>
      </div>
    );
  }

  const totalAttachments = attachedImages.length + attachedFiles.length + pendingPdfs.length + pendingExcels.length;

  return (
    <>
      <ChatHeader />
      <div 
        className={`flex flex-col bg-background ${isDragOver ? 'bg-accent/10' : ''}`}
        style={{ height: 'calc(100vh - 70px)' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Header */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">AI Chat</h2>
              <Badge variant="outline" className="text-xs">
                {messages.length} messages
              </Badge>
              {/* {!scrollLocked && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={forceScrollToBottom}>
                  Scroll unlocked - Click to resume auto-scroll
                </Badge>
              )} */}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={loading || messages.length === 0}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={downloadChat} disabled={messages.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Chat Messages Area */}
        <main className="flex-1 overflow-hidden">
          <div
            ref={chatContainerRef}
            className="h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6"
            onScroll={handleScroll}
          >
            <div className="max-w-8xl mx-auto space-y-4 sm:space-y-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading chat history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="max-w-sm mx-auto">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Welcome to AI Chat</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a conversation with AI. You can upload images, PDFs, Excel files, and documents.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Try asking: "Analyze this document" or "What's in this image?"
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[85%] lg:max-w-[85%] rounded-2xl shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Images */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="p-3 pb-0">
                            <div className={`grid gap-2 rounded-xl overflow-hidden ${
                              msg.images.length === 1 ? 'grid-cols-1' : 
                              msg.images.length === 2 ? 'grid-cols-2' : 
                              msg.images.length === 3 ? 'grid-cols-3' : 
                              'grid-cols-2 sm:grid-cols-3'
                            }`}>
                              {msg.images.map((image, imgIndex) => (
                                <div key={imgIndex} className="relative group cursor-pointer">
                                  <img
                                    src={image.dataUrl}
                                    alt={image.name}
                                    className="w-full h-20 sm:h-24 object-cover hover:opacity-90 transition-opacity"
                                  />
                                  <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded truncate">
                                    {image.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Files */}
                        {msg.files && msg.files.length > 0 && (
                          <div className="p-3 pb-0">
                            <div className="space-y-2">
                              {msg.files.map((file, fileIndex) => (
                                <div key={fileIndex} className="flex items-center gap-2 bg-black bg-opacity-10 rounded-lg p-2">
                                  <File className="w-4 h-4 text-blue-100" />
                                  <span className="text-xs text-blue-100 truncate">{file.filename}</span>
                                  {file.pageCount && (
                                    <span className="text-xs text-blue-200">({file.pageCount} pages)</span>
                                  )}
                                  {file.totalSheets && (
                                    <span className="text-xs text-blue-200">({file.totalSheets} sheets)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Message content */}
                        <div className="p-3 sm:p-4">
                          <div className="text-sm sm:text-base">
                            {msg.role === 'assistant' ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-900 dark:prose-p:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-200 prose-pre:text-gray-100 prose-table:text-gray-900 dark:prose-table:text-gray-100">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto my-4">
                                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children }) => (
                                      <thead className="bg-gray-50 dark:bg-gray-700">
                                        {children}
                                      </thead>
                                    ),
                                    th: ({ children }) => (
                                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">
                                        {children}
                                      </td>
                                    ),
                                    tr: ({ children, ...props }) => (
                                      <tr className="even:bg-gray-50 dark:even:bg-gray-800/50" {...props}>
                                        {children}
                                      </tr>
                                    ),
                                    h1: ({ children }) => (
                                      <h1 className="text-xl font-bold mt-6 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-lg font-semibold mt-5 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-base font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">
                                        {children}
                                      </h3>
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300">
                                        {children}
                                      </blockquote>
                                    ),
                                    code: ({ children, ...props }) => {
                                      const isInline = !props.className?.includes('language-');
                                      if (isInline) {
                                        return (
                                          <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                                            {children}
                                          </code>
                                        );
                                      }
                                      return (
                                        <code className="text-gray-900 dark:text-gray-100">
                                          {children}
                                        </code>
                                      );
                                    },
                                    pre: ({ children }) => (
                                      <pre className="bg-gray-200 dark:bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                                        {children}
                                      </pre>
                                    ),
                                  }}
                                >
                                  {processMarkdownContent(msg.content)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-white">{msg.content}</p>
                            )}
                          </div>
                          
                          {/* Message footer */}
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className={`text-xs ${
                              msg.role === 'user'
                                ? 'text-blue-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {formatTimestamp(msg.timestamp)}
                            </div>
                            <MessageActions 
                              content={msg.content} 
                              messageIndex={index} 
                              role={msg.role}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} className="h-1"></div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Attachments Preview */}
        {totalAttachments > 0 && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    {totalAttachments} attachment{totalAttachments > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAttachments}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear all
                  </Button>
                </div>
                
                {/* Images */}
                {attachedImages.length > 0 && (
                  <div className="mb-3">
                    <div className="grid grid-cols-4 gap-2">
                      {attachedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.dataUrl}
                            alt={image.name}
                            className="w-full h-16 object-cover rounded"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-1 -right-1 w-5 h-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-600 rounded p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm truncate">{file.filename}</span>
                            {file.pageCount && (
                              <span className="text-xs text-muted-foreground">({file.pageCount} pages)</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending PDFs */}
                {pendingPdfs.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-2">
                      {pendingPdfs.map((pdf, index) => (
                        <div key={index} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">{pdf.file.name}</span>
                            <span className="text-xs text-muted-foreground">({pdf.pdfInfo.numPages} pages)</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPdfSelector(pdf)}
                            >
                              Select Pages
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePdf(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Excel */}
                {pendingExcels.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-2">
                      {pendingExcels.map((excel, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{excel.fileName}</span>
                            <span className="text-xs text-muted-foreground">({excel.totalSheets} sheets)</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openExcelSelector(excel)}
                            >
                              Select Data
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExcel(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <footer className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    adjustTextareaHeight();
                  }}
                  placeholder="Type your message, paste images (Ctrl+V), or attach files..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={1}
                  style={{ minHeight: '32px', maxHeight: '120px' }}
                />
                
                {/* Send Button (inside textarea) */}
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && totalAttachments === 0) || loading}
                  className="absolute bottom-2 right-4 p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex-shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </footer>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.xlsx,.xls,.docx,.txt,.json,.js,.ts,.tsx,.vue,.css,.html,.md,.xml,.yaml,.yml,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Drag overlay */}
        {isDragOver && (
          <div className="fixed inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center z-40 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-400">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Drop files here</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Images, documents, and Excel files supported</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Selector Modal */}
      {showPdfSelector && currentPdfData && (
        <PDFSelector
          pdfData={currentPdfData}
          onClose={closePdfSelector}
          onSelect={handlePdfPagesSelected}
        />
      )}

      {/* Excel Selector Modal */}
      {showExcelSelector && currentExcelData && (
        <ExcelSelector
          excelData={currentExcelData}
          onClose={closeExcelSelector}
          onSelect={handleExcelDataSelected}
        />
      )}
    </>
  );
}

export default Chat;

