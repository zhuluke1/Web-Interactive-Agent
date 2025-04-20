import * as FileSystem from 'expo-file-system';

/**
 * Extracts text from a document file
 * @param uri The URI of the document file
 * @returns A promise that resolves to the extracted text
 */
export async function extractTextFromDocument(uri: string): Promise<string> {
  try {
    // For text files, we can read them directly
    if (uri.toLowerCase().endsWith('.txt')) {
      return await FileSystem.readAsStringAsync(uri);
    }
    
    // For PDF files, we'll use a WebView-based approach in the component
    if (uri.toLowerCase().endsWith('.pdf')) {
      // This function will just return the file URI, and the actual extraction
      // will happen in the WebView component
      return uri;
    }
    
    // For other document types
    throw new Error('Unsupported document type. Only PDF and TXT files are currently supported.');
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw new Error(`Failed to extract text: ${error}`);
  }
}