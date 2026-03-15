import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getFileSizeBytes } from '../data/ffmpeg/ffmpegUtils';

interface FileSizeLabelProps {
  label: string;
  uri: string;
}

const TEXT_SECONDARY = '#888';
const ACCENT2 = '#fc913a';

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const FileSizeLabel: React.FC<FileSizeLabelProps> = ({label, uri}) => {
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    if (!uri) {
      setSize(null);
      return;
    }
    // expo-file-system accepts file:// URIs directly
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    FileSystem.getInfoAsync(fileUri, { size: true })
      .then(info => {
        setSize(formatBytes(getFileSizeBytes(info)));
      })
      .catch(() => {
        setSize('—');
      });
  }, [uri]);

  if (!size) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{size}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT2,
    marginTop: 2,
  },
});

export default FileSizeLabel;
