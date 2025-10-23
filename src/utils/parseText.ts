/**
 * Check if a file is a text file based on its type or extension
 * @param file - File to check
 * @returns True if the file is a text file
 */
export const isTextFile = (file: File): boolean => {
  const textTypes = [
    'text/plain',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
  ];

  const textExtensions = [
    '.txt', '.csv', '.log', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.rb', '.go', '.rs', '.php', '.sh', '.bat', '.yaml', '.yml'
  ];

  // Check MIME type
  if (textTypes.includes(file.type)) {
    return true;
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  return textExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Extract text content from text files
 * @param files - Array of files to extract text from
 * @returns Promise with array of file data
 */
export const extractTextFromFiles = async (files: File[]): Promise<Array<{
  filename: string;
  content: string;
  type: string;
}>> => {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const text = await file.text();
        return {
          filename: file.name,
          content: text,
          type: file.type || 'text/plain'
        };
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        throw new Error(`Failed to read ${file.name}`);
      }
    })
  );

  return results;
};
