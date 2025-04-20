import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExtractionProgressProps {
  currentPage: number;
  totalPages: number;
  theme: 'light' | 'dark';
}

export default function ExtractionProgress({ currentPage, totalPages, theme }: ExtractionProgressProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#fff' : '#333';
  const backgroundColor = isDark ? '#2d2d42' : '#f0f8ff';
  const accentColor = isDark ? '#6a6aff' : '#4040ff';
  
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text-outline" size={24} color={accentColor} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: textColor }]}>
          Extracting Text
        </Text>
        
        <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
          Page {currentPage} of {totalPages > 0 ? totalPages : '?'}
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: accentColor
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: isDark ? '#aaa' : '#666' }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
      
      <ActivityIndicator size="small" color={accentColor} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  iconContainer: {
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  spinner: {
    marginLeft: 10,
  },
});