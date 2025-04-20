import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebAgent from './components/WebAgent';
import PdfExtractorScreen from './screens/PdfExtractorScreen';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [showWebAgent, setShowWebAgent] = useState(false);
  const [showPdfExtractor, setShowPdfExtractor] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const logoSource = theme === 'light' 
    ? require('./assets/appacella-logo-blue.png')
    : require('./assets/appacella-logo-white.png');

  const goBack = () => {
    setShowWebAgent(false);
    setShowPdfExtractor(false);
  };

  if (showWebAgent) {
    return (
      <SafeAreaProvider>
        <WebAgent theme={theme === 'light' ? 'light' : 'dark'} />
        <TouchableOpacity 
          style={[
            styles.backButton,
            { backgroundColor: theme === 'light' ? '#333' : '#f0f8ff' }
          ]} 
          onPress={goBack}
        >
          <Text style={{ 
            color: theme === 'light' ? '#fff' : '#333',
            fontWeight: 'bold'
          }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    );
  }

  if (showPdfExtractor) {
    return (
      <SafeAreaProvider>
        <PdfExtractorScreen theme={theme === 'light' ? 'light' : 'dark'} />
        <TouchableOpacity 
          style={[
            styles.backButton,
            { backgroundColor: theme === 'light' ? '#333' : '#f0f8ff' }
          ]} 
          onPress={goBack}
        >
          <Text style={{ 
            color: theme === 'light' ? '#fff' : '#333',
            fontWeight: 'bold'
          }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[
        styles.container,
        { backgroundColor: theme === 'light' ? '#f0f8ff' : '#1a1a2e' }
      ]}>
        <Animated.View style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <Image 
            source={logoSource} 
            style={styles.logo} 
            resizeMode="contain"
          />
          
          <Text style={[
            styles.title,
            { color: theme === 'light' ? '#333' : '#fff' }
          ]}>
            Welcome to Kiki
          </Text>
          
          <Text style={[
            styles.subtitle,
            { color: theme === 'light' ? '#666' : '#ccc' }
          ]}>
            Tell the AI what to make!
          </Text>

          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme === 'light' ? '#4040ff' : '#6a6aff' }
            ]}
            onPress={() => setShowPdfExtractor(true)}
          >
            <Text style={styles.startButtonText}>
              PDF Text Extractor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.startButton,
              { 
                backgroundColor: theme === 'light' ? '#4040ff' : '#6a6aff',
                marginTop: 15
              }
            ]}
            onPress={() => setShowWebAgent(true)}
          >
            <Text style={styles.startButtonText}>
              Start Web Agent
            </Text>
          </TouchableOpacity>

          <View style={styles.reactContainer}>
            <Text style={[
              styles.poweredBy,
              { color: theme === 'light' ? '#666' : '#ccc' }
            ]}>
              Powered by
            </Text>
            <Image 
              source={require('./assets/react-logo.png')} 
              style={styles.reactLogo} 
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <TouchableOpacity 
          style={[
            styles.themeToggle,
            { backgroundColor: theme === 'light' ? '#333' : '#f0f8ff' }
          ]} 
          onPress={toggleTheme}
        >
          <Text style={{ 
            color: theme === 'light' ? '#fff' : '#333',
            fontWeight: 'bold'
          }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </Text>
        </TouchableOpacity>
        
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    width: 220,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  poweredBy: {
    fontSize: 14,
    marginRight: 6,
  },
  reactLogo: {
    width: 24,
    height: 24,
  },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
