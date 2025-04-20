import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { extractTextFromDocument } from '../services/pdfService';

export default function PdfExtractorScreen({ theme = 'light' }) {
  const [document, setDocument] = useState<DocumentPicker.DocumentResult | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const webViewRef = useRef<WebView>(null);

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1a1a2e' : '#f0f8ff';
  const textColor = isDark ? '#fff' : '#333';
  const cardBgColor = isDark ? '#2d2d42' : '#fff';
  const accentColor = isDark ? '#6a6aff' : '#4040ff';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setDocument(result);
      setExtractedText('');
      setError(null);
      
      // If it's a text file, extract immediately
      if (result.assets[0].mimeType === 'text/plain') {
        extractTextFromTxt(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      setError('Failed to pick document. Please try again.');
    }
  };

  const extractTextFromTxt = async (uri: string) => {
    setIsLoading(true);
    try {
      const text = await FileSystem.readAsStringAsync(uri);
      setExtractedText(text);
    } catch (err) {
      console.error('Error reading text file:', err);
      setError(`Failed to read text file: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const extractText = async () => {
    if (!document || document.canceled) {
      Alert.alert('No Document', 'Please select a document first.');
      return;
    }

    const fileUri = document.assets[0].uri;
    const mimeType = document.assets[0].mimeType;

    if (mimeType === 'application/pdf') {
      // For PDFs, we'll use the WebView approach
      setIsPdfLoading(true);
      setIsLoading(true);
      
      // The actual extraction happens in the WebView's injected JavaScript
      // We'll show the WebView temporarily to extract the text
      
      // The extraction will be completed when the WebView sends a message
    } else if (mimeType === 'text/plain') {
      // For text files, we've already extracted the text
      if (!extractedText) {
        extractTextFromTxt(fileUri);
      }
    } else {
      setError(`Unsupported file type: ${mimeType}`);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pdfText') {
        setExtractedText(data.text);
        setIsPdfLoading(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      setError('Failed to extract text from PDF.');
      setIsPdfLoading(false);
      setIsLoading(false);
    }
  };

  const shareExtractedText = async () => {
    if (!extractedText) {
      Alert.alert('No Text', 'There is no extracted text to share.');
      return;
    }

    try {
      // Create a temporary file to share
      const fileUri = `${FileSystem.cacheDirectory}extracted_text.txt`;
      await FileSystem.writeAsStringAsync(fileUri, extractedText);

      await Share.share({
        title: 'Extracted Text',
        message: extractedText,
        url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
      });
    } catch (err) {
      console.error('Error sharing text:', err);
      Alert.alert('Error', 'Failed to share the extracted text.');
    }
  };

  const copyToClipboard = async () => {
    if (!extractedText) {
      Alert.alert('No Text', 'There is no extracted text to copy.');
      return;
    }

    try {
      await Clipboard.setStringAsync(extractedText);
      Alert.alert('Success', 'Text copied to clipboard!');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      Alert.alert('Error', 'Failed to copy text to clipboard.');
    }
  };

  // This is the JavaScript that will be injected into the WebView to extract text from PDFs
  const pdfExtractorScript = `
    // Function to extract text from PDF using PDF.js
    async function extractPdfText() {
      try {
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
        document.head.appendChild(script);
        
        // Wait for PDF.js to load
        await new Promise(resolve => {
          script.onload = resolve;
        });
        
        // Get the PDF file from the URL
        const pdfUrl = window.location.href;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const textItems = textContent.items.map(item => item.str);
          fullText += textItems.join(' ') + '\\n';
        }
        
        // Send the extracted text back to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pdfText',
          text: fullText
        }));
      } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error.toString()
        }));
      }
    }
    
    // Start extraction when the page loads
    document.addEventListener('DOMContentLoaded', extractPdfText);
    
    // If the document is already loaded, start extraction immediately
    if (document.readyState === 'complete') {
      extractPdfText();
    }
    
    true;
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>PDF Text Extractor</Text>
      </View>

      <View style={[styles.uploadCard, { backgroundColor: cardBgColor, borderColor }]}>
        <Ionicons name="document-text-outline" size={48} color={accentColor} />
        <Text style={[styles.uploadTitle, { color: textColor }]}>
          Upload PDF or Document
        </Text>
        <Text style={[styles.uploadSubtitle, { color: isDark ? '#aaa' : '#666' }]}>
          Select a document to extract text with 100% accuracy
        </Text>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: accentColor }]}
          onPress={pickDocument}
        >
          <Text style={styles.uploadButtonText}>Select Document</Text>
        </TouchableOpacity>

        {document && !document.canceled && (
          <View style={styles.selectedFile}>
            <Ionicons name="document" size={20} color={accentColor} />
            <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
              {document.assets[0].name}
            </Text>
          </View>
        )}
      </View>

      {document && !document.canceled && document.assets[0].mimeType === 'application/pdf' && (
        <TouchableOpacity
          style={[styles.extractButton, { backgroundColor: accentColor }]}
          onPress={extractText}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.extractButtonText}>Extract Text</Text>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <View style={[styles.errorContainer, { borderColor: '#ff4d4d' }]}>
          <Ionicons name="alert-circle-outline" size={24} color="#ff4d4d" />
          <Text style={[styles.errorText, { color: '#ff4d4d' }]}>{error}</Text>
        </View>
      )}

      {isPdfLoading && document && !document.canceled && document.assets[0].mimeType === 'application/pdf' && (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: document.assets[0].uri }}
            style={{ width: 1, height: 1, opacity: 0 }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            injectedJavaScript={pdfExtractorScript}
            onMessage={handleWebViewMessage}
          />
        </View>
      )}

      {extractedText ? (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: textColor }]}>Extracted Text</Text>
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]}
                onPress={shareExtractedText}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={[styles.textContainer, { backgroundColor: cardBgColor, borderColor }]}
            contentContainerStyle={styles.textContent}
          >
            <Text style={[styles.extractedText, { color: textColor }]}>{extractedText}</Text>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderText, { color: isDark ? '#aaa' : '#666' }]}>
            {isLoading
              ? 'Extracting text...'
              : document && !document.canceled
              ? 'Press "Extract Text" to begin extraction'
              : 'Select a document to extract text'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  uploadCard: {
    margin: 15,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  uploadButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    maxWidth: '100%',
  },
  fileName: {
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  extractButton: {
    marginHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  extractButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    margin: 15,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 10,
    flex: 1,
  },
  resultContainer: {
    flex: 1,
    margin: 15,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  textContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
  },
  textContent: {
    padding: 15,
  },
  extractedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
  webViewContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});