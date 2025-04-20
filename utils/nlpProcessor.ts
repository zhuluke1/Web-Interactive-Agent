// Simple NLP processor for web agent commands
// This is a mock implementation that simulates LLM processing

type CommandIntent = {
  type: string;
  action?: string;
  target?: string;
  query?: string;
  url?: string;
  text?: string;
  confidence: number;
};

// Mock LLM processing function
export async function processNaturalLanguage(input: string): Promise<CommandIntent> {
  // Convert to lowercase for easier matching
  const text = input.toLowerCase().trim();
  
  // Navigation intents
  if (text.includes('go to') || 
      text.includes('navigate to') || 
      text.includes('open') || 
      text.includes('visit') || 
      text.includes('take me to') ||
      text.includes('browse to')) {
    
    // Extract URL - look for words after the action verb
    const urlMatches = text.match(/(go to|navigate to|open|visit|take me to|browse to)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const simpleUrlMatches = text.match(/([a-zA-Z0-9.-]+\.(com|org|net|io|gov|edu|co|app))/);
    
    if (urlMatches && urlMatches[2]) {
      return {
        type: 'navigation',
        action: 'navigate',
        url: urlMatches[2],
        confidence: 0.9
      };
    } else if (simpleUrlMatches && simpleUrlMatches[1]) {
      return {
        type: 'navigation',
        action: 'navigate',
        url: simpleUrlMatches[1],
        confidence: 0.85
      };
    } else {
      // Try to extract any potential website name
      const words = text.split(/\s+/);
      const actionWords = ['go', 'to', 'navigate', 'open', 'visit', 'take', 'me', 'browse'];
      const potentialSites = words.filter(word => 
        !actionWords.includes(word) && 
        word.length > 3 && 
        !word.match(/^(the|and|or|but|if|then|when|how|what|why|who|where)$/)
      );
      
      if (potentialSites.length > 0) {
        return {
          type: 'navigation',
          action: 'navigate',
          url: potentialSites[0],
          confidence: 0.7
        };
      }
    }
  }
  
  // Search intents
  if (text.includes('search for') || 
      text.includes('find') || 
      text.includes('look up') || 
      text.includes('google') ||
      text.includes('search')) {
    
    // Extract search query
    let query = '';
    
    if (text.includes('search for')) {
      query = text.split('search for')[1].trim();
    } else if (text.includes('find')) {
      query = text.split('find')[1].trim();
    } else if (text.includes('look up')) {
      query = text.split('look up')[1].trim();
    } else if (text.includes('google')) {
      query = text.split('google')[1].trim();
    } else if (text.includes('search')) {
      query = text.split('search')[1].trim();
    }
    
    if (query) {
      return {
        type: 'search',
        action: 'search',
        query,
        confidence: 0.85
      };
    }
  }
  
  // Navigation controls
  if (text.includes('back') || text === 'go back' || text === 'previous page') {
    return {
      type: 'navigation_control',
      action: 'back',
      confidence: 0.95
    };
  }
  
  if (text.includes('forward') || text === 'go forward' || text === 'next page') {
    return {
      type: 'navigation_control',
      action: 'forward',
      confidence: 0.95
    };
  }
  
  if (text.includes('reload') || 
      text.includes('refresh') || 
      text.includes('update page') || 
      text === 'reload page') {
    return {
      type: 'navigation_control',
      action: 'reload',
      confidence: 0.95
    };
  }
  
  // Click intents
  if (text.includes('click') || 
      text.includes('press') || 
      text.includes('select') || 
      text.includes('choose') ||
      text.includes('tap')) {
    
    // Extract target element
    let target = '';
    
    if (text.includes('click on')) {
      target = text.split('click on')[1].trim();
    } else if (text.includes('click')) {
      target = text.split('click')[1].trim();
    } else if (text.includes('press')) {
      target = text.split('press')[1].trim();
    } else if (text.includes('select')) {
      target = text.split('select')[1].trim();
    } else if (text.includes('choose')) {
      target = text.split('choose')[1].trim();
    } else if (text.includes('tap')) {
      target = text.split('tap')[1].trim();
    }
    
    if (target) {
      return {
        type: 'interaction',
        action: 'click',
        target,
        confidence: 0.8
      };
    }
  }
  
  // Type intents
  if (text.includes('type') || 
      text.includes('enter') || 
      text.includes('input') || 
      text.includes('write')) {
    
    // Extract text to type
    let textToType = '';
    
    if (text.includes('type')) {
      textToType = text.split('type')[1].trim();
    } else if (text.includes('enter')) {
      textToType = text.split('enter')[1].trim();
    } else if (text.includes('input')) {
      textToType = text.split('input')[1].trim();
    } else if (text.includes('write')) {
      textToType = text.split('write')[1].trim();
    }
    
    if (textToType) {
      return {
        type: 'interaction',
        action: 'type',
        text: textToType,
        confidence: 0.8
      };
    }
  }
  
  // Help intent
  if (text === 'help' || 
      text.includes('help me') || 
      text.includes('show help') || 
      text.includes('what can you do') ||
      text.includes('commands') ||
      text.includes('how to use')) {
    return {
      type: 'system',
      action: 'help',
      confidence: 0.95
    };
  }
  
  // If we can't determine the intent, return a low confidence result
  return {
    type: 'unknown',
    confidence: 0.3
  };
}

// In a real implementation, this would connect to an actual LLM API
// This is just a placeholder for the mock implementation
export async function processWithLLM(input: string): Promise<CommandIntent> {
  // For now, we'll just use our simple NLP processor
  return processNaturalLanguage(input);
}

// Function to generate a human-readable explanation of what the agent understood
export function generateExplanation(intent: CommandIntent): string {
  switch (intent.type) {
    case 'navigation':
      return `I'll navigate to ${intent.url}`;
      
    case 'search':
      return `I'll search for "${intent.query}"`;
      
    case 'navigation_control':
      switch (intent.action) {
        case 'back':
          return "I'll go back to the previous page";
        case 'forward':
          return "I'll go forward to the next page";
        case 'reload':
          return "I'll refresh the current page";
        default:
          return "I'll perform a navigation action";
      }
      
    case 'interaction':
      switch (intent.action) {
        case 'click':
          return `I'll click on "${intent.target}"`;
        case 'type':
          return `I'll type "${intent.text}"`;
        default:
          return "I'll interact with the page";
      }
      
    case 'system':
      if (intent.action === 'help') {
        return "I'll show you what commands I understand";
      }
      return "I'll perform a system action";
      
    case 'unknown':
    default:
      return "I'm not sure what you want me to do. Try rephrasing or type 'help' for assistance.";
  }
}