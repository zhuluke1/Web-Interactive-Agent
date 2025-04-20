import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatFileSize } from '../utils/documentUtils';

interface DocumentInfoProps {
  name: string;
  size: number;
  type: string;
  theme: 'light' | 'dark';
}

export default function DocumentInfo({ name, size, type, theme }: DocumentInfoProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#fff' : '#333';
  const secondaryTextColor = isDark ? '#aaa' : '#666';
  const borderColor = isDark ? '#3d3d5c' : '#ddd';
  const accentColor = isDark ? '#6a6aff' : '#4040ff';
  
  // Determine the icon based on file type
  let icon = 'document-outline';
  if (type.includes('pdf')) {
    icon = 'document-text-outline';
  } else if (type.includes('word')) {
    icon = 'document-outline';
  } else if (type.includes('text')) {
    icon = 'document-text-outline';
  }

  return (
    <View style={[styles.container, { borderColor }]}>
      <Ionicons name={icon} size={24} color={accentColor} />
      <View style={styles.infoContainer}>
        <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={[styles.fileDetail, { color: secondaryTextColor }]}>
            {formatFileSize(size)}
          </Text>
          <Text style={[styles.fileDetail, { color: secondaryTextColor }]}>
            {type.split('/')[1]?.toUpperCase() || type}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 10,
    borderStyle: 'dashed',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  fileDetail: {
    fontSize: 12,
    marginRight: 12,
  },
});