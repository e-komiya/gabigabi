import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {CARD_BG} from './sharedStyles';

interface FileInfo {
  name: string;
  size: string;
  width: number;
  height: number;
}

interface BeforeInfoBlockProps {
  fileInfo: FileInfo;
}

interface AfterInfoBlockProps {
  fileInfo: FileInfo;
  processedImage: string | null;
  outputBytesFormatted: string;
  resizePercent: number;
  outputFormat: string;
  showAfterConversion: string;
}

const TEXT_SECONDARY = '#aaa';
const styles = StyleSheet.create({
  infoBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    gap: 2,
  },
  infoText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
});

export const BeforeInfoBlock: React.FC<BeforeInfoBlockProps> = ({fileInfo}) => (
  <View style={styles.infoBlock}>
    <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">📄 {fileInfo.name}</Text>
    <Text style={styles.infoText}>{fileInfo.size}</Text>
    {fileInfo.width > 0 && (
      <Text style={styles.infoText}>{fileInfo.width} × {fileInfo.height} px</Text>
    )}
    <Text style={styles.infoText}>🏷 {(fileInfo.name.split('.').pop() ?? '').toUpperCase()}</Text>
  </View>
);

export const AfterInfoBlock: React.FC<AfterInfoBlockProps> = ({
  fileInfo,
  processedImage,
  outputBytesFormatted,
  resizePercent,
  outputFormat,
  showAfterConversion,
}) => (
  <View style={styles.infoBlock}>
    <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">
      📄 {processedImage ? processedImage.split('/').pop() : '—'}
    </Text>
    <Text style={styles.infoText}>
      {processedImage ? outputBytesFormatted : showAfterConversion}
    </Text>
    <Text style={styles.infoText}>
      {Math.round(fileInfo.width * resizePercent / 100)} × {Math.round(fileInfo.height * resizePercent / 100)} px
    </Text>
    <Text style={styles.infoText}>
      🏷 {processedImage ? (processedImage.split('.').pop()?.toUpperCase() ?? outputFormat.toUpperCase()) : outputFormat.toUpperCase()}
    </Text>
  </View>
);
