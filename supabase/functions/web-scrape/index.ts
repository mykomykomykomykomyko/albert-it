import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="https://esm.sh/v135/pdfjs-dist@4.0.379/types/src/pdf.d.ts"
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

// Configure PDF.js worker for Deno
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// URL validation to prevent SSRF attacks
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    // Block common private IP ranges and localhost
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }
    
    // Block private IP ranges (RFC 1918)
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const octets = match.slice(1, 5).map(Number);
      // 10.0.0.0/8
      if (octets[0] === 10) return false;
      // 172.16.0.0/12
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
      // 192.168.0.0/16
      if (octets[0] === 192 && octets[1] === 168) return false;
      // 169.254.0.0/16 (link-local)
      if (octets[0] === 169 && octets[1] === 254) return false;
    }
    
    // Block metadata services
    const blockedHosts = [
      '169.254.169.254', // AWS, Azure, GCP metadata
      'metadata.google.internal',
      '100.100.100.200', // Alibaba Cloud
    ];
    if (blockedHosts.includes(hostname)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Rotating User-Agents to avoid detection
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// Modern browser headers with Client Hints
const getModernHeaders = () => ({
  "User-Agent": getRandomUserAgent(),
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Sec-CH-UA": '"Not_A Brand";v="8", "Chromium";v="120"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
  "Cache-Control": "max-age=0",
  "Referer": "https://www.google.com/", // Add referer to appear more legitimate
});

// Smart fetch with retry logic
const smartFetch = async (url: string, retryCount = 0): Promise<Response> => {
  const maxRetries = 3;
  
  let headers: Record<string, string>;
  if (retryCount === 0) {
    headers = getModernHeaders();
  } else if (retryCount === 1) {
    headers = {
      "User-Agent": getRandomUserAgent(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    };
  } else {
    headers = {
      "User-Agent": getRandomUserAgent(),
      "Accept": "*/*",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok && retryCount < maxRetries) {
      console.log(`Retry ${retryCount + 1} for ${url} with fallback headers`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
      return smartFetch(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(`Retry ${retryCount + 1} for ${url} due to error: ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return smartFetch(url, retryCount + 1);
    }
    throw error;
  }
};

// Helper function to detect PDF URLs
const isPdfUrl = (url: string): boolean => {
  const urlLower = url.toLowerCase();
  return urlLower.endsWith('.pdf') || urlLower.includes('.pdf?');
};

// Helper function to extract text from PDF
const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<{ content: string; pageCount: number }> => {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent({
      includeMarkedContent: true
    });

    if (i > 1) {
      fullText += `\n\n--- Page ${i} ---\n\n`;
    }

    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();

    if (pageText) {
      fullText += pageText;
    }
  }

  return {
    content: fullText.trim(),
    pageCount: pdf.numPages
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, returnHtml } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL to prevent SSRF attacks
    if (!isValidUrl(url)) {
      console.error(`Blocked potentially unsafe URL: ${url}`);
      return new Response(
        JSON.stringify({ error: "Invalid or unsafe URL. Only public HTTP/HTTPS URLs are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping URL: ${url}, returnHtml: ${returnHtml}`);

    // Capture access timestamp
    const accessedAt = new Date().toISOString();

    // Check if URL is a PDF
    const isPdf = isPdfUrl(url);

    if (isPdf) {
      console.log(`Detected PDF URL: ${url}`);

      // Fetch PDF as binary
      const response = await smartFetch(url);

      if (!response.ok) {
        const domain = new URL(url).hostname;

        // Handle 403 gracefully
        if (response.status === 403) {
          console.log(`403 Forbidden for ${url} - site is blocking automated access`);

          return new Response(
            JSON.stringify({
              success: true,
              url,
              title: `Access Restricted: ${domain}`,
              content: `This website (${domain}) is blocking automated access. The content could not be retrieved automatically.\n\nTo access this content, please visit the URL directly: ${url}\n\nSome academic publishers and websites have anti-bot protection that prevents automated scraping.`,
              contentLength: 0,
              accessedAt,
              blocked: true,
              statusCode: 403
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Handle 404 gracefully
        if (response.status === 404) {
          console.log(`404 Not Found for ${url} - page does not exist`);

          return new Response(
            JSON.stringify({
              success: true,
              url,
              title: `Page Not Found: ${domain}`,
              content: `The requested page could not be found at ${url}.\n\nThe URL may be incorrect, the page may have been moved or deleted, or the content may no longer be available.\n\nPlease verify the URL or try searching for the content on ${domain}.`,
              contentLength: 0,
              accessedAt,
              notFound: true,
              statusCode: 404
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Failed to fetch PDF: ${response.statusText}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = new Uint8Array(arrayBuffer);

      // Check PDF size - skip processing if too large (> 5MB to avoid CPU limits)
      const maxPdfSize = 5 * 1024 * 1024; // 5MB
      if (pdfBuffer.length > maxPdfSize) {
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        const title = filename || "PDF Document";

        console.log(`PDF too large (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB), skipping extraction`);

        return new Response(
          JSON.stringify({
            success: true,
            url,
            title,
            content: `PDF Document: ${filename}\n\nPDF is too large for text extraction (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB). Please download directly from: ${url}`,
            contentLength: 0,
            isPdf: true,
            accessedAt,
            skipped: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Add timeout for PDF extraction to prevent CPU exhaustion
        const extractionTimeout = 20000; // 20 seconds max for PDF extraction
        const extractionPromise = extractPdfText(arrayBuffer);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF extraction timeout')), extractionTimeout)
        );

        const { content: fullText, pageCount } = await Promise.race([extractionPromise, timeoutPromise]) as { content: string; pageCount: number };

        // Limit content to 100k characters to avoid memory issues
        const content = fullText.substring(0, 100000);

        // Extract filename from URL for title
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        const title = filename || "PDF Document";

        console.log(`Successfully extracted text from PDF: ${pageCount} pages, ${content.length} characters`);

        return new Response(
          JSON.stringify({
            success: true,
            url,
            title,
            content,
            contentLength: content.length,
            pageCount,
            isPdf: true,
            accessedAt,
            truncated: fullText.length > 100000
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (pdfError) {
        console.error(`Error parsing PDF:`, pdfError);
        return new Response(
          JSON.stringify({
            error: `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use smart fetch with retry logic for non-PDF URLs
    const response = await smartFetch(url);

    if (!response.ok) {
      const domain = new URL(url).hostname;

      // Handle 403 gracefully - return success with warning message so workflow continues
      if (response.status === 403) {
        console.log(`403 Forbidden for ${url} - site is blocking automated access`);

        return new Response(
          JSON.stringify({
            success: true,
            url,
            title: `Access Restricted: ${domain}`,
            content: `This website (${domain}) is blocking automated access. The content could not be retrieved automatically.\n\nTo access this content, please visit the URL directly: ${url}\n\nSome academic publishers and websites have anti-bot protection that prevents automated scraping.`,
            contentLength: 0,
            accessedAt,
            blocked: true,
            statusCode: 403
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle 404 gracefully - return success with warning message so workflow continues
      if (response.status === 404) {
        console.log(`404 Not Found for ${url} - page does not exist`);

        return new Response(
          JSON.stringify({
            success: true,
            url,
            title: `Page Not Found: ${domain}`,
            content: `The requested page could not be found at ${url}.\n\nThe URL may be incorrect, the page may have been moved or deleted, or the content may no longer be available.\n\nPlease verify the URL or try searching for the content on ${domain}.`,
            contentLength: 0,
            accessedAt,
            notFound: true,
            statusCode: 404
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For other errors, return error response
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "No title found";

    let content: string;
    
    if (returnHtml) {
      // Return raw HTML
      content = html;
      console.log(`Successfully scraped ${url}: ${content.length} characters (HTML)`);
    } else {
      // Simple HTML parsing - extract text content
      // Remove script and style tags
      let textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      // Limit to first 5000 characters
      textContent = textContent.substring(0, 5000);
      content = textContent;
      console.log(`Successfully scraped ${url}: ${content.length} characters (text)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        title,
        content,
        contentLength: content.length,
        accessedAt
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in web-scrape function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
