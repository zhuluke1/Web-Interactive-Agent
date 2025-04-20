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
  ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface WebAgentProps {
  theme: 'light' | 'dark';
}

export default function WebAgent({ theme }: WebAgentProps) {
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const webViewRef = useRef<WebView>(null);

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1a1a2e' : '#f0f8ff';
  const textColor = isDark ? '#fff' : '#333';
  const inputBgColor = isDark ? '#2d2d42' : '#fff';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';

  const executeCommand = () => {
    if (!command.trim()) return;
    
    setHistory(prev => [...prev, `> ${command}`]);
    
    // Simple command parsing
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.startsWith('go to ') || lowerCommand.startsWith('visit ')) {
      const site = command.split(' ').slice(2).join(' ');
      navigateToSite(site);
    } else if (lowerCommand.startsWith('search ')) {
      const query = command.split(' ').slice(1).join(' ');
      searchGoogle(query);
    } else if (lowerCommand === 'back') {
      webViewRef.current?.goBack();
      setHistory(prev => [...prev, 'Going back to previous page']);
    } else if (lowerCommand === 'forward') {
      webViewRef.current?.goForward();
      setHistory(prev => [...prev, 'Going forward to next page']);
    } else if (lowerCommand === 'reload' || lowerCommand === 'refresh') {
      webViewRef.current?.reload();
      setHistory(prev => [...prev, 'Reloading page']);
    } else if (lowerCommand.startsWith('click ')) {
      const element = command.split(' ').slice(1).join(' ');
      clickElement(element);
    } else if (lowerCommand.startsWith('type ')) {
      const text = command.split(' ').slice(1).join(' ');
      typeText(text);
    } else if (lowerCommand === 'help') {
      showHelp();
    } else {
      setHistory(prev => [...prev, 'Unknown command. Type "help" for available commands.']);
    }
    
    setCommand('');
  };

  const navigateToSite = (site: string) => {
    let processedUrl = site;
    
    // Check if the URL has a protocol
    if (!site.startsWith('http://') && !site.startsWith('https://')) {
      processedUrl = 'https://' + site;
    }
    
    // Add .com if there's no TLD
    if (!processedUrl.includes('.')) {
      processedUrl += '.com';
    }
    
    setUrl(processedUrl);
    setHistory(prev => [...prev, `Navigating to ${processedUrl}`]);
  };

  const searchGoogle = (query: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    setUrl(searchUrl);
    setHistory(prev => [...prev, `Searching for "${query}"`]);
  };

  const clickElement = (element: string) => {
    const script = `
      (function() {
        // Try to find by text content
        const elements = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"]'));
        const found = elements.find(el => 
          el.innerText && el.innerText.toLowerCase().includes('${element.toLowerCase()}')
        );
        
        if (found) {
          found.click();
          return true;
        }
        
        // Try to find by aria-label
        const ariaElement = Array.from(document.querySelectorAll('[aria-label]')).find(
          el => el.getAttribute('aria-label').toLowerCase().includes('${element.toLowerCase()}')
        );
        
        if (ariaElement) {
          ariaElement.click();
          return true;
        }
        
        return false;
      })();
    `;
    
    webViewRef.current?.injectJavaScript(script);
    setHistory(prev => [...prev, `Attempting to click "${element}"`]);
  };

  const typeText = (text: string) => {
    const script = `
      (function() {
        const input = document.querySelector('input:focus');
        if (input) {
          input.value = '${text.replace(/'/g, "\\'")}';
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          return true;
        }
        return false;
      })();
    `;
    
    webViewRef.current?.injectJavaScript(script);
    setHistory(prev => [...prev, `Typing "${text}"`]);
  };

  const showHelp = () => {
    const helpText = [
      'Available commands:',
      '- go to [website]: Navigate to a website',
      '- visit [website]: Navigate to a website',
      '- search [query]: Search Google for query',
      '- back: Go back to previous page',
      '- forward: Go forward to next page',
      '- reload/refresh: Reload current page',
      '- click [element]: Click on an element with matching text',
      '- type [text]: Type text into focused input field',
      '- help: Show this help message'
    ];
    
    setHistory(prev => [...prev, ...helpText]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Web Agent</Text>
        <Text style={[styles.currentUrl, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
          {currentUrl}
        </Text>
      </View>
      
      <View style={styles.webViewContainer}>
        {isLoading && (
          <ActivityIndicator 
            style={styles.loader} 
            size="large" 
            color={isDark ? '#6a6aff' : '#4040ff'} 
          />
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={(navState) => {
            setCurrentUrl(navState.url);
          }}
        />
      </View>
      
      <View style={[styles.controlsContainer, { backgroundColor }]}>
        <ScrollView 
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
            placeholder="Enter command (type 'help' for options)"
            placeholderTextColor={isDark ? '#aaa' : '#999'}
            value={command}
            onChangeText={setCommand}
            onSubmitEditing={executeCommand}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              { backgroundColor: isDark ? '#6a6aff' : '#4040ff' }
            ]} 
            onPress={executeCommand}
          >
            <Ionicons name="send" size={20} color="#fff" />
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  currentUrl: {
    fontSize: 12,
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