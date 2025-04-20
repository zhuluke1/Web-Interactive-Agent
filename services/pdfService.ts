import * as FileSystem from 'expo-file-system';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source
GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/build/pdf.worker.min.js';

/**
 * Extracts text from a PDF file
 * @param uri The URI of the PDF file
 * @returns A promise that resolves to the extracted text
 */
export async function extractTextFromPdf(uri: string): Promise<string> {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to array buffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Load the PDF document
    const loadingTask = getDocument({ data: bytes.buffer });
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str);
      fullText += textItems.join(' ') + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text: ${error}`);
  }
}

/**
 * Extracts text from a document file (currently only supports PDFs)
 * @param uri The URI of the document file
 * @returns A promise that resolves to the extracted text
 */
export async function extractTextFromDocument(uri: string): Promise<string> {
  // Check if the file is a PDF
  if (uri.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPdf(uri);
  }
  
  // For other document types, we could add support here
  throw new Error('Unsupported document type. Only PDF files are currently supported.');
}