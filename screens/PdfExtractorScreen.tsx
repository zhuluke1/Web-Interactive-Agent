import React, { useState, useRef, useEffect } from 'react';
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
import ExtractionProgress from '../components/ExtractionProgress';
import DocumentInfo from '../components/DocumentInfo';

export default function PdfExtractorScreen({ theme = 'light' }) {
  const [document, setDocument] = useState<DocumentPicker.DocumentResult | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [showWebView, setShowWebView] = useState<boolean>(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const [preparationTime, setPreparationTime] = useState<number>(0);

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

      if (result.assets[0].mimeType === 'application/pdf') {
        try {
          const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          result._data = base64;
          console.log(`PDF loaded, size: ${base64.length} characters`);
        } catch (error) {
          console.error('Error reading PDF file:', error);
        }
      }

      setDocument(result);
      setExtractedText('');
      setError(null);
      
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
    
    setExtractedText('');
    setCurrentPage(0);
    setTotalPages(0);
    setError(null);
    setPreparationTime(0);

    if (mimeType === 'application/pdf') {
      console.log('Starting PDF extraction for:', fileUri);
      setIsLoading(true);
      
      try {
        console.log('Reading PDF file as base64...');
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log(`PDF file read complete. Data length: ${base64.length}`);
        
        setPdfUri(fileUri);
        setShowWebView(true);
      } catch (error) {
        console.error('Error reading PDF file:', error);
        setError(`Failed to read PDF file: ${error}`);
        setIsLoading(false);
      }
    } else if (mimeType === 'text/plain') {
      extractTextFromTxt(fileUri);
    } else {
      setError(`Unsupported file type: ${mimeType}`);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      console.log('Received message from WebView:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'pdfInfo') {
        console.log('PDF info received:', data);
        setTotalPages(data.totalPages);
      } 
      else if (data.type === 'pdfProgress') {
        console.log('PDF progress:', data.currentPage, 'of', data.totalPages);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      }
      else if (data.type === 'pdfPartialText') {
        console.log('Partial text received, final:', data.isFinal);
        setExtractedText(prevText => prevText + data.text);
        
        if (data.isFinal) {
          console.log('Final text received, closing WebView');
          setShowWebView(false);
          setIsLoading(false);
        }
      }
      else if (data.type === 'pdfText') {
        console.log('Full text received');
        setExtractedText(data.text);
        setShowWebView(false);
        setIsLoading(false);
      } 
      else if (data.type === 'pdfError') {
        console.error('PDF error:', data.error);
        setError(data.error);
        setShowWebView(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      setError('Failed to extract text from PDF.');
      setShowWebView(false);
      setIsLoading(false);
    }
  };

  const shareExtractedText = async () => {
    if (!extractedText) {
      Alert.alert('No Text', 'There is no extracted text to share.');
      return;
    }

    try {
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

  const createPdfExtractorHtml = (pdfBase64: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Text Extractor</title>
        <script src="https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js"></script>
      </head>
      <body>
        <div id="status">Loading PDF.js...</div>
        
        <script>
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
          
          function sendToReactNative(message) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(message));
            }
          }
          
          document.getElementById('status').textContent = 'Starting extraction...';
          
          const pdfData = atob('${pdfBase64}');
          const uint8Array = new Uint8Array(pdfData.length);
          for (let i = 0; i < pdfData.length; i++) {
            uint8Array[i] = pdfData.charCodeAt(i);
          }
          
          pdfjsLib.getDocument({data: uint8Array}).promise.then(function(pdf) {
            const totalPages = pdf.numPages;
            document.getElementById('status').textContent = 'PDF loaded: ' + totalPages + ' pages';
            
            sendToReactNative({
              type: 'pdfInfo',
              totalPages: totalPages
            });
            
            let extractedText = '';
            let currentPage = 0;
            
            function extractNextPage() {
              currentPage++;
              
              if (currentPage <= totalPages) {
                document.getElementById('status').textContent = 'Extracting page ' + currentPage + ' of ' + totalPages;
                
                sendToReactNative({
                  type: 'pdfProgress',
                  currentPage: currentPage,
                  totalPages: totalPages
                });
                
                pdf.getPage(currentPage).then(function(page) {
                  page.getTextContent().then(function(textContent) {
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    extractedText += pageText + '\\n\\n';
                    
                    if (currentPage % 3 === 0 || currentPage === totalPages) {
                      sendToReactNative({
                        type: 'pdfPartialText',
                        text: extractedText,
                        isFinal: currentPage === totalPages
                      });
                      
                      if (currentPage !== totalPages) {
                        extractedText = '';
                      }
                    }
                    
                    setTimeout(extractNextPage, 10);
                  }).catch(function(error) {
                    sendToReactNative({
                      type: 'pdfError',
                      error: 'Error extracting text from page ' + currentPage + ': ' + error.message
                    });
                  });
                }).catch(function(error) {
                  sendToReactNative({
                    type: 'pdfError',
                    error: 'Error getting page ' + currentPage + ': ' + error.message
                  });
                });
              }
            }
            
            extractNextPage();
          }).catch(function(error) {
            document.getElementById('status').textContent = 'Error loading PDF: ' + error.message;
            sendToReactNative({
              type: 'pdfError',
              error: 'Error loading PDF: ' + error.message
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isLoading && showWebView && totalPages === 0) {
      timer = setInterval(() => {
        setPreparationTime(prev => prev + 1);
      }, 1000);
    } else {
      setPreparationTime(0);
      if (timer) {
        clearInterval(timer);
      }
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isLoading, showWebView, totalPages]);

  useEffect(() => {
    let timeoutTimer: NodeJS.Timeout | null = null;
    
    if (isLoading && showWebView && totalPages === 0 && preparationTime > 15) {
      timeoutTimer = setTimeout(() => {
        console.log('PDF preparation timed out after 15 seconds');
        setError('PDF extraction timed out. Please try again or try a different PDF.');
        setShowWebView(false);
        setIsLoading(false);
      }, 1000);
    }
    
    return () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };
  }, [isLoading, showWebView, totalPages, preparationTime]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {showWebView && pdfUri ? (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ 
              html: createPdfExtractorHtml(
                document && !document.canceled ? 
                  document.assets[0].mimeType === 'application/pdf' ? 
                    document._data || '' : '' 
                  : ''
              )
            }}
            onMessage={handleWebViewMessage}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setError(`WebView error: ${nativeEvent.description}`);
              setShowWebView(false);
              setIsLoading(false);
            }}
          />
          <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>
              {totalPages > 0 
                ? `Extracting text: page ${currentPage} of ${totalPages}` 
                : `Preparing PDF for extraction... (${preparationTime}s)`}
            </Text>
            {preparationTime > 10 && totalPages === 0 && (
              <Text style={[styles.loadingSubText, { color: '#ff9999' }]}>
                This is taking longer than expected. Please try again.
              </Text>
            )}
            {totalPages > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${(currentPage / totalPages) * 100}%`, backgroundColor: '#fff' }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((currentPage / totalPages) * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
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
              <DocumentInfo 
                name={document.assets[0].name}
                size={document.assets[0].size}
                type={document.assets[0].mimeType}
                theme={theme}
              />
            )}
          </View>

          {document && !document.canceled && (
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

          {isLoading && currentPage > 0 && totalPages > 0 && (
            <ExtractionProgress 
              currentPage={currentPage}
              totalPages={totalPages}
              theme={theme}
            />
          )}

          {error && (
            <View style={[styles.errorContainer, { borderColor: '#ff4d4d' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#ff4d4d" />
              <Text style={[styles.errorText, { color: '#ff4d4d' }]}>{error}</Text>
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
        </>
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
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginTop: 15,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  progressText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    width: 40,
    textAlign: 'right',
  },
});
