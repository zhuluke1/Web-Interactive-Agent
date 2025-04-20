import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AgentStatusScreenProps {
  theme: 'light' | 'dark';
  statusUpdates: string[];
  onClose: () => void;
}

export default function AgentStatusScreen({ 
  theme, 
  statusUpdates, 
  onClose 
}: AgentStatusScreenProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1a1a2e' : '#f0f8ff';
  const textColor = isDark ? '#fff' : '#333';
  const cardBgColor = isDark ? '#2d2d42' : '#fff';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';
  
  useEffect(() => {
    // Scroll to bottom when status updates change
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [statusUpdates]);

  // Group status updates by action
  const groupedUpdates: { [key: string]: string[] } = {};
  let currentAction = 'Initialization';
  
  statusUpdates.forEach(update => {
    // Try to identify new actions based on common patterns
    if (update.includes('Received command:')) {
      const commandMatch = update.match(/Received command: "(.+)"/);
      if (commandMatch && commandMatch[1]) {
        currentAction = commandMatch[1];
      }
    }
    
    if (!groupedUpdates[currentAction]) {
      groupedUpdates[currentAction] = [];
    }
    
    groupedUpdates[currentAction].push(update);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Agent Activity Log</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {Object.keys(groupedUpdates).length === 0 ? (
          <View style={[styles.emptyState, { borderColor }]}>
            <Ionicons name="information-circle-outline" size={40} color={isDark ? '#6a6aff' : '#4040ff'} />
            <Text style={[styles.emptyText, { color: textColor }]}>
              No agent activity recorded yet.
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? '#aaa' : '#666' }]}>
              Execute commands to see detailed status updates.
            </Text>
          </View>
        ) : (
          Object.entries(groupedUpdates).map(([action, updates], index) => (
            <View 
              key={index} 
              style={[styles.actionCard, { backgroundColor: cardBgColor, borderColor }]}
            >
              <View style={styles.actionHeader}>
                <Ionicons 
                  name="code-working" 
                  size={18} 
                  color={isDark ? '#6a6aff' : '#4040ff'} 
                />
                <Text style={[styles.actionTitle, { color: textColor }]}>
                  {action}
                </Text>
              </View>
              
              <View style={styles.timeline}>
                {updates.map((update, updateIndex) => {
                  // Extract timestamp if present
                  const timestampMatch = update.match(/\[([\d:]+)\]/);
                  const timestamp = timestampMatch ? timestampMatch[1] : '';
                  const message = timestampMatch 
                    ? update.replace(/\[[\d:]+\]\s/, '') 
                    : update;
                  
                  // Determine if this is an error message
                  const isError = message.toLowerCase().includes('error');
                  
                  return (
                    <View key={updateIndex} style={styles.timelineItem}>
                      {updateIndex < updates.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
                      )}
                      <View style={styles.timelineContent}>
                        <View 
                          style={[
                            styles.timelineDot, 
                            { 
                              backgroundColor: isError 
                                ? '#ff4d4d' 
                                : isDark ? '#6a6aff' : '#4040ff' 
                            }
                          ]} 
                        />
                        {timestamp && (
                          <Text style={[styles.timestamp, { color: isDark ? '#aaa' : '#666' }]}>
                            {timestamp}
                          </Text>
                        )}
                        <Text 
                          style={[
                            styles.updateText, 
                            { 
                              color: isError 
                                ? '#ff4d4d' 
                                : textColor 
                            }
                          ]}
                        >
                          {message}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  actionCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeline: {
    padding: 12,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 15,
    width: 2,
    height: '100%',
    zIndex: 1,
  },
  timelineContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 2,
    zIndex: 2,
  },
  timestamp: {
    fontSize: 12,
    marginRight: 8,
    marginTop: 2,
  },
  updateText: {
    fontSize: 14,
    flex: 1,
  },
});