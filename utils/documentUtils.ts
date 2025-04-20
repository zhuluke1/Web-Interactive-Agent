import * as FileSystem from 'expo-file-system';

/**
 * Saves text to a file in the cache directory
 * @param text The text to save
 * @param filename The name of the file
 * @returns The URI of the saved file
 */
export async function saveTextToFile(text: string, filename: string): Promise<string> {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, text);
  return fileUri;
}

/**
 * Gets the file extension from a URI
 * @param uri The URI of the file
 * @returns The file extension (without the dot)
 */
export function getFileExtension(uri: string): string {
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Gets the file name from a URI
 * @param uri The URI of the file
 * @returns The file name (with extension)
 */
export function getFileName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

/**
 * Formats file size in a human-readable format
 * @param bytes The file size in bytes
 * @returns A formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}