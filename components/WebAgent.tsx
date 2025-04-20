import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AgentStatusScreen from './AgentStatusScreen';
import { processCommand, initializeCache } from '../services/aiService';

interface WebAgentProps {
  theme: 'light' | 'dark';
}

export default function WebAgent({ theme }: WebAgentProps) {
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<string[]>([]);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [showFullStatusScreen, setShowFullStatusScreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const statusScrollViewRef = useRef<ScrollView>(null);
  const historyScrollViewRef = useRef<ScrollView>(null);

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1a1a2e' : '#f0f8ff';
  const textColor = isDark ? '#fff' : '#333';
  const inputBgColor = isDark ? '#2d2d42' : '#fff';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';
  const accentColor = isDark ? '#6a6aff' : '#4040ff';
  const statusBgColor = isDark ? '#2a2a3e' : '#e6f0ff';

  useEffect(() => {
    initializeCache();
  }, []);

  const addStatusUpdate = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const update = `[${timestamp}] ${message}`;
    setStatusUpdates(prev => [...prev, update]);
    
    setTimeout(() => {
      statusScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addHistoryItem = (message: string) => {
    setHistory(prev => [...prev, message]);
    
    setTimeout(() => {
      historyScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    addHistoryItem(`> ${command}`);
    addStatusUpdate(`Received command: "${command}"`);
    
    setIsProcessing(true);
    addStatusUpdate(`Processing with AI...`);
    
    try {
      const result = await processCommand(command);
      
      if (result.fromCache) {
        addStatusUpdate(`Found similar command in cache`);
      } else {
        addStatusUpdate(`AI processed the command`);
      }
      
      addStatusUpdate(`Understanding: ${result.explanation} (confidence: ${Math.round(result.confidence * 100)}%)`);
      
      if (result.confidence >= 0.6) {
        switch (result.type) {
          case 'navigation':
            navigateToSite(result.url || '');
            break;
            
          case 'search':
            searchGoogle(result.query || '');
            break;
            
          case 'navigation_control':
            switch (result.action) {
              case 'back':
                webViewRef.current?.goBack();
                addHistoryItem('Going back to previous page');
                addStatusUpdate('Navigating to previous page in history');
                break;
                
              case 'forward':
                webViewRef.current?.goForward();
                addHistoryItem('Going forward to next page');
                addStatusUpdate('Navigating to next page in history');
                break;
                
              case 'reload':
                webViewRef.current?.reload();
                addHistoryItem('Reloading page');
                addStatusUpdate('Refreshing current page content');
                break;
            }
            break;
            
          case 'interaction':
            switch (result.action) {
              case 'click':
                clickElement(result.target || '');
                break;
                
              case 'type':
                typeText(result.text || '');
                break;
            }
            break;
            
          case 'system':
            if (result.action === 'help') {
              showHelp();
            }
            break;
            
          default:
            addHistoryItem('I\'m not sure what you want me to do. Try rephrasing or type "help".');
            addStatusUpdate('Command intent unclear or unsupported');
        }
      } else {
        addHistoryItem(`I'm not confident I understood that correctly. Try rephrasing or type "help".`);
        addStatusUpdate(`Low confidence (${Math.round(result.confidence * 100)}%) - unable to execute command`);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      addHistoryItem('Sorry, I encountered an error processing your command.');
      addStatusUpdate(`Error processing command: ${error}`);
    } finally {
      setIsProcessing(false);
      setCommand('');
    }
  };

  const navigateToSite = (site: string) => {
    addStatusUpdate(`Processing URL: "${site}"`);
    
    let processedUrl = site;
    
    if (!site.startsWith('http://') && !site.startsWith('https://')) {
      processedUrl = 'https://' + site;
      addStatusUpdate(`Adding https:// protocol: "${processedUrl}"`);
    }
    
    if (!processedUrl.includes('.')) {
      processedUrl += '.com';
      addStatusUpdate(`Adding .com TLD: "${processedUrl}"`);
    }
    
    addStatusUpdate(`Initiating navigation to: ${processedUrl}`);
    setUrl(processedUrl);
    addHistoryItem(`Navigating to ${processedUrl}`);
  };

  const searchGoogle = (query: string) => {
    addStatusUpdate(`Preparing search for: "${query}"`);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    addStatusUpdate(`Encoded search URL: ${searchUrl}`);
    setUrl(searchUrl);
    addHistoryItem(`Searching for "${query}"`);
    addStatusUpdate(`Initiated Google search for: "${query}"`);
  };

  const clickElement = (element: string) => {
    addStatusUpdate(`Looking for element containing text: "${element}"`);
    
    const script = `
      (function() {
        const elements = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"]'));
        const found = elements.find(el => 
          el.innerText && el.innerText.toLowerCase().includes('${element.toLowerCase()}')
        );
        
        if (found) {
          const originalBackground = found.style.backgroundColor;
          const originalTransition = found.style.transition;
          found.style.transition = 'background-color 0.3s';
          found.style.backgroundColor = '#ffcc00';
          
          setTimeout(() => {
            found.style.backgroundColor = originalBackground;
            found.style.transition = originalTransition;
            found.click();
          }, 300);
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'elementFound',
            text: found.innerText || found.value || 'element',
            tagName: found.tagName
          }));
          return true;
        }
        
        const ariaElement = Array.from(document.querySelectorAll('[aria-label]')).find(
          el => el.getAttribute('aria-label').toLowerCase().includes('${element.toLowerCase()}')
        );
        
        if (ariaElement) {
          const originalBackground = ariaElement.style.backgroundColor;
          const originalTransition = ariaElement.style.transition;
          ariaElement.style.transition = 'background-color 0.3s';
          ariaElement.style.backgroundColor = '#ffcc00';
          
          setTimeout(() => {
            ariaElement.style.backgroundColor = originalBackground;
            ariaElement.style.transition = originalTransition;
            ariaElement.click();
          }, 300);
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'elementFound',
            text: ariaElement.innerText || ariaElement.getAttribute('aria-label') || 'element',
            tagName: ariaElement.tagName
          }));
          return true;
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'elementNotFound',
          searchText: '${element}'
        }));
        return false;
      })();
    `;
    
    webViewRef.current?.injectJavaScript(script);
    addHistoryItem(`Attempting to click "${element}"`);
  };

  const typeText = (text: string) => {
    addStatusUpdate(`Preparing to type text: "${text}"`);
    
    const script = `
      (function() {
        const input = document.querySelector('input:focus');
        if (input) {
          const originalValue = input.value;
          input.value = '${text.replace(/'/g, "\\'")}';
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'textTyped',
            element: input.name || input.id || 'input field',
            text: '${text.replace(/'/g, "\\'")}'
          }));
          return true;
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'noInputFocused'
        }));
        return false;
      })();
    `;
    
    webViewRef.current?.injectJavaScript(script);
    addHistoryItem(`Typing "${text}"`);
  };

  const showHelp = () => {
    addStatusUpdate('Displaying help information');
    
    const helpText = [
      'I understand natural language commands like:',
      '- "Go to Twitter" or "Visit nytimes.com"',
      '- "Search for React Native tutorials"',
      '- "Go back" or "Return to previous page"',
      '- "Refresh the page" or "Reload"',
      '- "Click on login" or "Press the submit button"',
      '- "Type hello world" or "Enter my email address"',
      '',
      'You can also use these specific commands:',
      '- go to [website]: Navigate to a website',
      '- search [query]: Search Google for query',
      '- back: Go back to previous page',
      '- forward: Go forward to next page',
      '- reload/refresh: Reload current page',
      '- click [element]: Click on an element with matching text',
      '- type [text]: Type text into focused input field',
      '- help: Show this help message'
    ];
    
    helpText.forEach(text => addHistoryItem(text));
    addStatusUpdate('Help information displayed successfully');
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'elementFound':
          addStatusUpdate(`Found element: <${data.tagName.toLowerCase()}> with text "${data.text}"`);
          addStatusUpdate(`Clicking on element...`);
          break;
        case 'elementNotFound':
          addStatusUpdate(`Error: Could not find any element containing "${data.searchText}"`);
          break;
        case 'textTyped':
          addStatusUpdate(`Text entered into ${data.element}`);
          break;
        case 'noInputFocused':
          addStatusUpdate(`Error: No input field is currently focused`);
          break;
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  if (showFullStatusScreen) {
    return (
      <AgentStatusScreen 
        theme={theme}
        statusUpdates={statusUpdates}
        onClose={() => setShowFullStatusScreen(false)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Web Agent</Text>
        <Text style={[styles.currentUrl, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
          {currentUrl}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.statusToggle, { backgroundColor: accentColor }]}
            onPress={() => setShowStatusPanel(!showStatusPanel)}
          >
            <Text style={styles.statusToggleText}>
              {showStatusPanel ? 'Hide Status' : 'Show Status'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.fullStatusButton, { backgroundColor: accentColor }]}
            onPress={() => setShowFullStatusScreen(true)}
          >
            <Ionicons name="analytics-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {showStatusPanel && (
        <View style={[styles.statusContainer, { backgroundColor: statusBgColor, borderColor }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: textColor }]}>
              Agent Status Updates
            </Text>
            <TouchableOpacity onPress={() => setShowFullStatusScreen(true)}>
              <Text style={[styles.viewFullButton, { color: accentColor }]}>
                View Full Log
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            ref={statusScrollViewRef}
            style={styles.statusScrollView}
            contentContainerStyle={styles.statusContent}
          >
            {statusUpdates.length === 0 ? (
              <Text style={[styles.statusEmpty, { color: isDark ? '#aaa' : '#666' }]}>
                No status updates yet. Execute a command to see updates.
              </Text>
            ) : (
              statusUpdates.slice(-10).map((update, index) => (
                <Text key={index} style={[styles.statusItem, { color: textColor }]}>
                  {update}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      )}
      
      <View style={[
        styles.webViewContainer, 
        { flex: showStatusPanel ? 0.4 : 1 }
      ]}>
        {isLoading && (
          <ActivityIndicator 
            style={styles.loader} 
            size="large" 
            color={accentColor} 
          />
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoadStart={() => {
            setIsLoading(true);
            addStatusUpdate(`Loading started: ${url}`);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            addStatusUpdate(`Page loaded successfully: ${currentUrl}`);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            addStatusUpdate(`Error loading page: ${nativeEvent.description}`);
          }}
          onNavigationStateChange={(navState) => {
            if (navState.url !== currentUrl) {
              addStatusUpdate(`Navigation state changed to: ${navState.url}`);
              setCurrentUrl(navState.url);
            }
          }}
          onMessage={handleWebViewMessage}
        />
      </View>
      
      <View style={[styles.controlsContainer, { backgroundColor }]}>
        <ScrollView 
          ref={historyScrollViewRef}
          style={[styles.historyContainer, { backgroundColor: inputBgColor, borderColor }]}
          contentContainerStyle={styles.historyContent}
        >
          {history.map((item, index) => (
            <Text key={index} style={[styles.historyItem, { color: textColor }]}>
              {item}
            </Text>
          ))}
        </ScrollView>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: inputBgColor, 
                color: textColor,
                borderColor
              }
            ]}
            placeholder="Enter command in natural language..."
            placeholderTextColor={isDark ? '#aaa' : '#999'}
            value={command}
            onChangeText={setCommand}
            onSubmitEditing={executeCommand}
            editable={!isProcessing}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              { 
                backgroundColor: accentColor,
                opacity: isProcessing ? 0.7 : 1 
              }
            ]} 
            onPress={executeCommand}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentUrl: {
    fontSize: 12,
    flex: 1,
    marginHorizontal: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 5,
  },
  fullStatusButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    height: Dimensions.get('window').height * 0.25,
    borderWidth: 1,
    borderRadius: 5,
    margin: 10,
    padding: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewFullButton: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusScrollView: {
    flex: 1,
  },
  statusContent: {
    paddingBottom: 5,
  },
  statusItem: {
    fontSize: 12,
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    zIndex: 1,
  },
  controlsContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  historyContainer: {
    height: 120,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
  },
  historyContent: {
    paddingBottom: 10,
  },
  historyItem: {
    fontSize: 12,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
