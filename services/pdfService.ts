import * as FileSystem from 'expo-file-system';

/**
 * Extracts text from a document file
 * @param uri The URI of the document file
 * @returns A promise that resolves to the extracted text
 */
export async function extractTextFromDocument(uri: string): Promise<string> {
  try {
    // For PDF files, we'll handle them in the component using WebView
    if (uri.toLowerCase().endsWith('.pdf')) {
      // This is a placeholder - actual extraction happens in the WebView
      return "PDF text extraction in progress...";
    }
    
    // For text files, we can read them directly
    if (uri.toLowerCase().endsWith('.txt')) {
      return await FileSystem.readAsStringAsync(uri);
    }
    
    // For other document types
    throw new Error('Unsupported document type. Only PDF and TXT files are currently supported.');
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw new Error(`Failed to extract text: ${error}`);
  }
}