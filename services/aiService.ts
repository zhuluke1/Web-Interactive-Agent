import AsyncStorage from '@react-native-async-storage/async-storage';
import { processWithLLM, generateExplanation } from '../utils/nlpProcessor';

// Cache key for storing processed commands
const COMMAND_CACHE_KEY = 'web_agent_command_cache';

// Interface for cached commands
interface CachedCommand {
  input: string;
  result: any;
  timestamp: number;
}

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// Initialize the cache
let commandCache: CachedCommand[] = [];

// Load cache from AsyncStorage
export async function initializeCache() {
  try {
    const cachedData = await AsyncStorage.getItem(COMMAND_CACHE_KEY);
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData) as CachedCommand[];
      
      // Filter out expired cache entries
      const now = Date.now();
      commandCache = parsedCache.filter(
        entry => now - entry.timestamp < CACHE_EXPIRATION
      );
      
      // Save the filtered cache back to storage
      await AsyncStorage.setItem(COMMAND_CACHE_KEY, JSON.stringify(commandCache));
    }
  } catch (error) {
    console.error('Error loading command cache:', error);
    // If there's an error, start with an empty cache
    commandCache = [];
  }
}

// Save cache to AsyncStorage
async function saveCache() {
  try {
    await AsyncStorage.setItem(COMMAND_CACHE_KEY, JSON.stringify(commandCache));
  } catch (error) {
    console.error('Error saving command cache:', error);
  }
}

// Process a command with AI, using cache when possible
export async function processCommand(input: string) {
  // Check if we have this command in cache
  const cachedEntry = commandCache.find(entry => entry.input.toLowerCase() === input.toLowerCase());
  
  if (cachedEntry) {
    // Return cached result if we have it
    return {
      ...cachedEntry.result,
      explanation: generateExplanation(cachedEntry.result),
      fromCache: true
    };
  }
  
  // Process with LLM if not in cache
  try {
    const result = await processWithLLM(input);
    
    // Add to cache
    commandCache.push({
      input,
      result,
      timestamp: Date.now()
    });
    
    // Limit cache size to 100 entries
    if (commandCache.length > 100) {
      commandCache = commandCache.slice(-100);
    }
    
    // Save updated cache
    saveCache();
    
    return {
      ...result,
      explanation: generateExplanation(result),
      fromCache: false
    };
  } catch (error) {
    console.error('Error processing command with AI:', error);
    return {
      type: 'error',
      confidence: 0,
      error: 'Failed to process command',
      explanation: 'Sorry, I had trouble understanding that command.'
    };
  }
}

// Clear the command cache
export async function clearCommandCache() {
  try {
    commandCache = [];
    await AsyncStorage.removeItem(COMMAND_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing command cache:', error);
  }
}