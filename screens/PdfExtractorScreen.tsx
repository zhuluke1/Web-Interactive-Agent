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
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const text = await response.text();
        setExtractedText(text);
      } else {
        const text = await FileSystem.readAsStringAsync(uri);
        setExtractedText(text);
      }
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
      
      setPdfUri(fileUri);
      setShowWebView(true);
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
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(extractedText);
        Alert.alert('Success', 'Text copied to clipboard!');
      } else {
        const fileUri = `${FileSystem.cacheDirectory}extracted_text.txt`;
        await FileSystem.writeAsStringAsync(fileUri, extractedText);

        await Share.share({
          title: 'Extracted Text',
          message: extractedText,
          url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
        });
      }
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

  const createPdfExtractorHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Text Extractor</title>
        <script src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: #f5f5f5;
          }
          #status {
            padding: 10px;
            background-color: #333;
            color: white;
            font-weight: bold;
            text-align: center;
          }
          #drop-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border: 3px dashed #ccc;
            border-radius: 10px;
            margin: 20px;
            padding: 20px;
            text-align: center;
            background-color: #f9f9f9;
          }
          #drop-area.highlight {
            border-color: #2196F3;
            background-color: #e3f2fd;
          }
          #file-input {
            display: none;
          }
          #select-button {
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 10px 2px;
            cursor: pointer;
            border-radius: 5px;
          }
          #extract-button {
            background-color: #2196F3;
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 10px 2px;
            cursor: pointer;
            border-radius: 5px;
            display: none;
          }
          #progress-container {
            width: 100%;
            margin-top: 20px;
            display: none;
          }
          #progress-bar {
            width: 100%;
            background-color: #ddd;
            border-radius: 5px;
            overflow: hidden;
          }
          #progress {
            height: 20px;
            background-color: #4CAF50;
            width: 0%;
            text-align: center;
            line-height: 20px;
            color: white;
          }
          #file-info {
            margin-top: 10px;
            font-style: italic;
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="status">PDF Text Extractor</div>
        
        <div id="drop-area">
          <p>Drag & drop a PDF file here or click to select</p>
          <input type="file" id="file-input" accept="application/pdf" />
          <button id="select-button">Select PDF</button>
          <button id="extract-button">Extract Text</button>
          <div id="file-info"></div>
          <div id="progress-container">
            <div id="progress-bar">
              <div id="progress">0%</div>
            </div>
          </div>
        </div>
        
        <script>
          // Initialize PDF.js
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          
          // Elements
          const dropArea = document.getElementById('drop-area');
          const fileInput = document.getElementById('file-input');
          const selectButton = document.getElementById('select-button');
          const extractButton = document.getElementById('extract-button');
          const fileInfo = document.getElementById('file-info');
          const progressContainer = document.getElementById('progress-container');
          const progress = document.getElementById('progress');
          const status = document.getElementById('status');
          
          // Variables
          let selectedFile = null;
          let pdfDocument = null;
          
          // Function to send messages to React Native
          function sendToReactNative(message) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(message));
            } else {
              console.log('Message to React Native:', message);
            }
          }
          
          // Notify React Native that the page is ready
          setTimeout(() => {
            sendToReactNative({ type: 'pageReady' });
            status.textContent = 'Ready to extract text from PDF';
          }, 500);
          
          // Handle file selection via button
          selectButton.addEventListener('click', () => {
            fileInput.click();
          });
          
          // Handle file selection
          fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
          });
          
          // Handle drag and drop
          ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
          });
          
          function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
          }
          
          ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
          });
          
          ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
          });
          
          function highlight() {
            dropArea.classList.add('highlight');
          }
          
          function unhighlight() {
            dropArea.classList.remove('highlight');
          }
          
          dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
          });
          
          // Process the selected files
          function handleFiles(files) {
            if (files.length > 0) {
              selectedFile = files[0];
              
              if (selectedFile.type === 'application/pdf') {
                fileInfo.textContent = \`Selected: \${selectedFile.name} (\${formatFileSize(selectedFile.size)})\`;
                fileInfo.style.display = 'block';
                extractButton.style.display = 'inline-block';
                
                // Auto-extract if in React Native
                if (window.ReactNativeWebView) {
                  extractText();
                }
              } else {
                fileInfo.textContent = 'Please select a PDF file.';
                fileInfo.style.display = 'block';
                extractButton.style.display = 'none';
              }
            }
          }
          
          // Format file size
          function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' bytes';
            else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            else return (bytes / 1048576).toFixed(1) + ' MB';
          }
          
          // Extract text button
          extractButton.addEventListener('click', extractText);
          
          // Extract text from PDF
          function extractText() {
            if (!selectedFile) {
              status.textContent = 'No PDF file selected';
              return;
            }
            
            status.textContent = 'Loading PDF...';
            progressContainer.style.display = 'block';
            progress.style.width = '0%';
            progress.textContent = '0%';
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
              const typedArray = new Uint8Array(e.target.result);
              
              // Load the PDF document
              pdfjsLib.getDocument(typedArray).promise.then(pdf => {
                pdfDocument = pdf;
                const totalPages = pdf.numPages;
                
                status.textContent = \`PDF loaded: \${totalPages} pages\`;
                
                // Send total pages info to React Native
                sendToReactNative({
                  type: 'pdfInfo',
                  totalPages: totalPages
                });
                
                // Extract text from all pages
                let extractedText = '';
                let currentPage = 0;
                
                // Process pages one by one
                function processNextPage() {
                  currentPage++;
                  
                  if (currentPage <= totalPages) {
                    // Update progress
                    const percentComplete = Math.round((currentPage / totalPages) * 100);
                    progress.style.width = percentComplete + '%';
                    progress.textContent = percentComplete + '%';
                    
                    status.textContent = \`Extracting page \${currentPage} of \${totalPages}\`;
                    
                    // Send progress to React Native
                    sendToReactNative({
                      type: 'pdfProgress',
                      currentPage: currentPage,
                      totalPages: totalPages
                    });
                    
                    // Get page
                    pdf.getPage(currentPage).then(page => {
                      // Get text content
                      page.getTextContent().then(textContent => {
                        // Extract text
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        extractedText += pageText + '\\n\\n';
                        
                        // Send partial text every few pages or on the last page
                        if (currentPage % 3 === 0 || currentPage === totalPages) {
                          sendToReactNative({
                            type: 'pdfPartialText',
                            text: extractedText,
                            isFinal: currentPage === totalPages
                          });
                          
                          // Clear buffer if not the final page
                          if (currentPage !== totalPages) {
                            extractedText = '';
                          }
                        }
                        
                        // Process next page
                        setTimeout(processNextPage, 10);
                      }).catch(error => {
                        console.error('Error extracting text from page:', error);
                        status.textContent = \`Error extracting text from page \${currentPage}: \${error.message}\`;
                        
                        sendToReactNative({
                          type: 'pdfError',
                          error: \`Error extracting text from page \${currentPage}: \${error.message}\`
                        });
                      });
                    }).catch(error => {
                      console.error('Error getting page:', error);
                      status.textContent = \`Error getting page \${currentPage}: \${error.message}\`;
                      
                      sendToReactNative({
                        type: 'pdfError',
                        error: \`Error getting page \${currentPage}: \${error.message}\`
                      });
                    });
                  } else {
                    // All pages processed
                    status.textContent = 'Text extraction complete!';
                  }
                }
                
                // Start processing pages
                processNextPage();
                
              }).catch(error => {
                console.error('Error loading PDF:', error);
                status.textContent = \`Error loading PDF: \${error.message}\`;
                
                sendToReactNative({
                  type: 'pdfError',
                  error: \`Error loading PDF: \${error.message}\`
                });
              });
            };
            
            reader.onerror = function(error) {
              console.error('Error reading file:', error);
              status.textContent = \`Error reading file: \${error}\`;
              
              sendToReactNative({
                type: 'pdfError',
                error: \`Error reading file: \${error}\`
              });
            };
            
            // Read the file
            reader.readAsArrayBuffer(selectedFile);
          }
          
          // Function to load a PDF from a URL
          function loadPdfFromUrl(url) {
            status.textContent = 'Fetching PDF from URL...';
            
            fetch(url)
              .then(response => {
                if (!response.ok) {
                  throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                return response.blob();
              })
              .then(blob => {
                // Create a File object
                selectedFile = new File([blob], 'document.pdf', { type: 'application/pdf' });
                
                fileInfo.textContent = \`Selected: document.pdf (\${formatFileSize(selectedFile.size)})\`;
                fileInfo.style.display = 'block';
                
                // Auto-extract
                extractText();
              })
              .catch(error => {
                console.error('Error fetching PDF:', error);
                status.textContent = \`Error fetching PDF: \${error.message}\`;
                
                sendToReactNative({
                  type: 'pdfError',
                  error: \`Error fetching PDF: \${error.message}\`
                });
              });
          }
          
          // Expose the loadPdfFromUrl function to the window object
          window.loadPdfFromUrl = loadPdfFromUrl;
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
    
    if (isLoading && showWebView && totalPages === 0 && preparationTime > 10) {
      timeoutTimer = setTimeout(() => {
        console.log('PDF preparation timed out after 10 seconds');
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
            source={{ html: createPdfExtractorHtml() }}
            onMessage={handleWebViewMessage}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoad={() => {
              if (webViewRef.current && pdfUri) {
                console.log('WebView loaded, loading PDF from URI:', pdfUri);
                
                // Use a simpler approach to load the PDF
                webViewRef.current.injectJavaScript(`
                  // Call the loadPdfFromUrl function with the PDF URI
                  if (window.loadPdfFromUrl) {
                    window.loadPdfFromUrl('${pdfUri}');
                  } else {
                    console.error('loadPdfFromUrl function not available');
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'pdfError',
                        error: 'PDF loading function not available'
                      }));
                    }
                  }
                  true;
                `);
              }
            }}
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
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowWebView(false);
                  setIsLoading(false);
                  setError('PDF extraction cancelled. Please try again with a different PDF.');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
  cancelButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#ff4d4d',
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
