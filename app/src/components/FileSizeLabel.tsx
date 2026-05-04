import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getFileSizeBytes } from '../data/ffmpeg/ffmpegUtils';
import { formatBytes } from '../utils/formatBytes';
import { TEXT_SECONDARY, ACCENT2 } from '../screens/components/sharedStyles';

interface FileSizeLabelProps {
  label: string;
  uri: string;
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
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`${label} ${size}`}>
      <Text style={styles.label} accessibilityElementsHidden={true}>{label}</Text>
      <Text style={styles.value} accessibilityElementsHidden={true}>{size}</Text>
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
