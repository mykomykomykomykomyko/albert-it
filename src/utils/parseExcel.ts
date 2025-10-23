import * as ExcelJS from 'exceljs';

/**
 * Extract text value from Excel cell, handling objects and rich text
 * @param cellValue - The raw cell value from ExcelJS
 * @returns Clean text value
 */
const extractCellValue = (cellValue: any): string | number | null => {
  if (cellValue === null || cellValue === undefined) {
    return null;
  }
  
  // Handle rich text objects
  if (typeof cellValue === 'object' && cellValue !== null) {
    // Rich text format: { richText: [{ text: "value" }] }
    if (cellValue.richText && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((part: any) => part.text || '').join('');
    }
    
    // Formula result object: { result: "value" }
    if (cellValue.result !== undefined) {
      return extractCellValue(cellValue.result);
    }
    
    // Text object: { text: "value" }
    if (cellValue.text !== undefined) {
      return String(cellValue.text);
    }
    
    // Hyperlink object: { text: "display", hyperlink: "url" }
    if (cellValue.hyperlink && cellValue.text) {
      return String(cellValue.text);
    }
    
    // Date object
    if (cellValue instanceof Date) {
      return cellValue.toLocaleDateString();
    }
    
    // Try to extract any text property
    if (cellValue.toString && typeof cellValue.toString === 'function') {
      const stringValue = cellValue.toString();
      if (stringValue !== '[object Object]') {
        return stringValue;
      }
    }
    
    // Last resort: try to find any string property
    const keys = Object.keys(cellValue);
    for (const key of keys) {
      const value = cellValue[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    
    console.warn('Could not extract value from object:', cellValue);
    return null;
  }
  
  // Handle primitive values
  if (typeof cellValue === 'string') {
    return cellValue.trim();
  }
  
  if (typeof cellValue === 'number') {
    return cellValue;
  }
  
  if (typeof cellValue === 'boolean') {
    return cellValue ? 'TRUE' : 'FALSE';
  }
  
  // Convert other types to string
  return String(cellValue);
};

/**
 * Generate a clean header name from cell value
 * @param cellValue - The raw header cell value
 * @param columnIndex - The column index for fallback naming
 * @returns Clean header name
 */
const generateHeaderName = (cellValue: any, columnIndex: number): string => {
  const extractedValue = extractCellValue(cellValue);
  
  if (extractedValue && typeof extractedValue === 'string' && extractedValue.length > 0) {
    // Clean the header name
    return extractedValue
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }
  
  // Fallback to column letter naming (A, B, C, etc.)
  const columnLetter = String.fromCharCode(65 + (columnIndex % 26));
  return `Column_${columnLetter}`;
};

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: any[][];
  jsonData: Record<string, any>[];
}

export interface ExcelData {
  fileName: string;
  sheets: ExcelSheetData[];
  totalSheets: number;
}

/**
 * Parse an Excel file and convert it to structured JSON data
 * @param file - The Excel file to parse
 * @returns Object containing parsed Excel data
 */
export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  try {
    console.log(`Parsing Excel file: ${file.name}`);
    
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const sheets: ExcelSheetData[] = [];
    
    workbook.eachSheet((worksheet, sheetId) => {
      const sheetName = worksheet.name;
      console.log(`Processing sheet: ${sheetName}`);
      
      const rows: any[][] = [];
      const jsonData: Record<string, any>[] = [];
      let headers: string[] = [];
      let maxColumnCount = 0;
      
      // First pass: determine the maximum number of columns
      worksheet.eachRow((row, rowNumber) => {
        const actualColumnCount = row.actualCellCount || row.cellCount || 0;
        maxColumnCount = Math.max(maxColumnCount, actualColumnCount);
      });
      
      console.log(`Sheet ${sheetName} has maximum ${maxColumnCount} columns`);
      
      // Second pass: process all rows
      worksheet.eachRow((row, rowNumber) => {
        const rowValues: any[] = [];
        
        // Process each column up to the maximum count
        for (let colIndex = 1; colIndex <= maxColumnCount; colIndex++) {
          const cell = row.getCell(colIndex);
          const cellValue = extractCellValue(cell.value);
          rowValues.push(cellValue);
        }
        
        if (rowNumber === 1) {
          // First row as headers
          headers = rowValues.map((value, index) => {
            const headerName = generateHeaderName(value, index);
            console.log(`Header ${index + 1}: "${value}" -> "${headerName}"`);
            return headerName;
          });
        }
        
        rows.push(rowValues);
        
        // Convert to JSON (skip header row for JSON data)
        if (rowNumber > 1) {
          // Check if row has any non-empty values
          const hasData = rowValues.some(val => val !== null && val !== undefined && val !== '');
          
          if (hasData) {
            const jsonRow: Record<string, any> = {};
            headers.forEach((header, index) => {
              jsonRow[header] = rowValues[index] ?? null;
            });
            jsonData.push(jsonRow);
          }
        }
      });
      
      console.log(`Sheet ${sheetName} processed: ${headers.length} headers, ${jsonData.length} data rows`);
      
      sheets.push({
        sheetName,
        headers,
        rows,
        jsonData
      });
    });
    
    console.log(`Successfully parsed ${sheets.length} sheets from ${file.name}`);
    
    return {
      fileName: file.name,
      sheets,
      totalSheets: sheets.length
    };
    
  } catch (error) {
    console.error(`Error parsing Excel file ${file.name}:`, error);
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a file is an Excel file
 * @param file - The file to check
 * @returns True if the file is an Excel file
 */
export const isExcelFile = (file: File): boolean => {
  const excelMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/vnd.ms-excel.template.macroEnabled.12', // .xltm
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template' // .xltx
  ];
  
  const excelExtensions = ['.xlsx', '.xls', '.xlsm', '.xltm', '.xltx'];
  
  // Check MIME type
  if (excelMimeTypes.includes(file.type)) {
    return true;
  }
  
  // Check file extension as fallback
  const fileName = file.name.toLowerCase();
  return excelExtensions.some(ext => fileName.endsWith(ext));
};

export interface SelectedSheetData {
  sheetName: string;
  headers: string[];
  selectedRows: Record<string, any>[];
}

/**
 * Format Excel data for display in chat
 * @param selectedSheets - Array of selected sheet data
 * @param fileName - Name of the Excel file
 * @returns Formatted string for chat
 */
export const formatExcelDataForChat = (selectedSheets: SelectedSheetData[], fileName: string): string => {
  let formattedContent = `\n\n=== Excel Data: ${fileName} ===\n\n`;
  
  selectedSheets.forEach(sheet => {
    formattedContent += `\n## Sheet: ${sheet.sheetName}\n\n`;
    
    if (sheet.selectedRows && sheet.selectedRows.length > 0) {
      // Format selected rows as JSON
      formattedContent += '```json\n';
      formattedContent += JSON.stringify(sheet.selectedRows, null, 2);
      formattedContent += '\n```\n\n';
      
      // Add summary
      formattedContent += `**Summary:** ${sheet.selectedRows.length} rows selected from ${sheet.sheetName}\n\n`;
      
      // Add column information
      if (sheet.headers && sheet.headers.length > 0) {
        formattedContent += `**Columns:** ${sheet.headers.join(', ')}\n\n`;
      }
    } else {
      formattedContent += `**Note:** No rows selected from ${sheet.sheetName}\n\n`;
    }
  });
  
  return formattedContent;
};

/**
 * Convert Excel sheet data to CSV format
 * @param sheetData - Sheet data object
 * @param selectedRowIndices - Indices of selected rows (optional)
 * @returns CSV formatted string
 */
export const convertSheetToCSV = (sheetData: ExcelSheetData, selectedRowIndices?: number[]): string => {
  const { headers, jsonData } = sheetData;
  
  // Use selected rows or all rows
  const dataToConvert = selectedRowIndices 
    ? selectedRowIndices.map(index => jsonData[index]).filter(Boolean)
    : jsonData;
  
  if (dataToConvert.length === 0) {
    return '';
  }
  
  // Create CSV header
  const csvHeaders = headers.join(',');
  
  // Create CSV rows
  const csvRows = dataToConvert.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle values that contain commas, quotes, or newlines
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

export interface ExcelSummary {
  fileName: string;
  totalSheets: number;
  sheets: {
    name: string;
    totalRows: number;
    totalColumns: number;
    headers: string[];
    hasData: boolean;
    columnTypes?: Record<string, string>;
  }[];
}

/**
 * Get summary statistics for Excel data
 * @param excelData - Parsed Excel data
 * @returns Summary statistics
 */
export const getExcelSummary = (excelData: ExcelData): ExcelSummary => {
  const summary: ExcelSummary = {
    fileName: excelData.fileName,
    totalSheets: excelData.totalSheets,
    sheets: []
  };
  
  excelData.sheets.forEach(sheet => {
    const sheetSummary = {
      name: sheet.sheetName,
      totalRows: sheet.jsonData.length,
      totalColumns: sheet.headers.length,
      headers: sheet.headers,
      hasData: sheet.jsonData.length > 0,
      columnTypes: {} as Record<string, string>
    };
    
    // Get column types (basic detection)
    if (sheet.jsonData.length > 0) {
      sheet.headers.forEach(header => {
        const values = sheet.jsonData.map(row => row[header]).filter(val => val !== null && val !== undefined);
        if (values.length > 0) {
          const firstValue = values[0];
          if (typeof firstValue === 'number') {
            sheetSummary.columnTypes[header] = 'number';
          } else if (firstValue instanceof Date) {
            sheetSummary.columnTypes[header] = 'date';
          } else {
            sheetSummary.columnTypes[header] = 'text';
          }
        } else {
          sheetSummary.columnTypes[header] = 'empty';
        }
      });
    }
    
    summary.sheets.push(sheetSummary);
  });
  
  return summary;
};

export interface SearchResult {
  sheetName: string;
  rowIndex: number;
  column: string;
  value: any;
  row: Record<string, any>;
}

/**
 * Search Excel data for specific terms
 * @param excelData - Parsed Excel data
 * @param searchTerm - Term to search for
 * @param caseSensitive - Whether search should be case sensitive
 * @returns Array of search results
 */
export const searchExcelData = (excelData: ExcelData, searchTerm: string, caseSensitive = false): SearchResult[] => {
  const results: SearchResult[] = [];
  const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  excelData.sheets.forEach(sheet => {
    sheet.jsonData.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([column, value]) => {
        if (value !== null && value !== undefined) {
          const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();
          if (stringValue.includes(term)) {
            results.push({
              sheetName: sheet.sheetName,
              rowIndex,
              column,
              value,
              row
            });
          }
        }
      });
    });
  });
  
  return results;
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Excel file before processing
 * @param file - The file to validate
 * @returns Validation result
 */
export const validateExcelFile = (file: File): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Check if file exists
  if (!file) {
    result.isValid = false;
    result.errors.push('No file provided');
    return result;
  }
  
  // Check file type
  if (!isExcelFile(file)) {
    result.isValid = false;
    result.errors.push('File is not a valid Excel file (.xlsx, .xls, .xlsm, .xltm, .xltx)');
  }
  
  // Check file size (warn if > 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    result.warnings.push(`File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Large files may take longer to process.`);
  }
  
  // Check file name
  if (file.name.length > 255) {
    result.warnings.push('File name is very long and may be truncated in some displays.');
  }
  
  return result;
};

export interface ParseResult {
  results: ExcelData[];
  errors: string[];
}

/**
 * Process multiple Excel files
 * @param files - Array of Excel files to process
 * @returns Array of parsed Excel data
 */
export const parseMultipleExcelFiles = async (files: File[]): Promise<ParseResult> => {
  const results: ExcelData[] = [];
  const errors: string[] = [];
  
  for (const file of files) {
    try {
      const validation = validateExcelFile(file);
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
        continue;
      }
      
      const excelData = await parseExcelFile(file);
      results.push(excelData);
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { results, errors };
};

