import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExtractionProgressProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  theme: 'light' | 'dark';
}

export default function ExtractionProgress({ status, message, theme }: ExtractionProgressProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#fff' : '#333';
  const backgroundColor = isDark ? '#2d2d42' : '#fff';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';
  
  let statusColor = '#4040ff'; // Default blue
  let icon = 'information-circle-outline';
  
  switch (status) {
    case 'loading':
      statusColor = isDark ? '#6a6aff' : '#4040ff';
      icon = 'hourglass-outline';
      break;
    case 'success':
      statusColor = '#4CAF50'; // Green
      icon = 'checkmark-circle-outline';
      break;
    case 'error':
      statusColor = '#ff4d4d'; // Red
      icon = 'alert-circle-outline';
      break;
    default:
      statusColor = isDark ? '#aaa' : '#666';
  }

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={statusColor} style={styles.icon} />
      ) : (
        <Ionicons name={icon} size={24} color={statusColor} style={styles.icon} />
      )}
      <Text style={[styles.message, { color: textColor }]}>
        {message || getDefaultMessage(status)}
      </Text>
    </View>
  );
}

function getDefaultMessage(status: 'idle' | 'loading' | 'success' | 'error'): string {
  switch (status) {
    case 'idle':
      return 'Ready to extract text';
    case 'loading':
      return 'Extracting text from document...';
    case 'success':
      return 'Text extracted successfully!';
    case 'error':
      return 'Failed to extract text';
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 10,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    flex: 1,
  },
});