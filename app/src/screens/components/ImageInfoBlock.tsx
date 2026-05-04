import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {CARD_BG, TEXT_SECONDARY} from './sharedStyles';

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
  <View
    style={styles.infoBlock}
    accessible
    accessibilityRole="summary"
    accessibilityLabel={`変換前: ${fileInfo.name}, サイズ ${fileInfo.size}${fileInfo.width > 0 ? `, 解像度 ${fileInfo.width} × ${fileInfo.height} ピクセル` : ''}`}>
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
}) => {
  const filename = processedImage ? processedImage.split('/').pop() : '—';
  const sizeLabel = processedImage ? outputBytesFormatted : showAfterConversion;
  const resizedW = Math.round(fileInfo.width * resizePercent / 100);
  const resizedH = Math.round(fileInfo.height * resizePercent / 100);
  const fmtLabel = processedImage ? (processedImage.split('.').pop()?.toUpperCase() ?? outputFormat.toUpperCase()) : outputFormat.toUpperCase();
  return (
    <View
      style={styles.infoBlock}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={processedImage
        ? `変換後: ${filename}, サイズ ${sizeLabel}, 解像度 ${resizedW} × ${resizedH} ピクセル, フォーマット ${fmtLabel}`
        : showAfterConversion}>
      <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">
        📄 {filename}
      </Text>
      <Text style={styles.infoText}>
        {sizeLabel}
      </Text>
      <Text style={styles.infoText}>
        {resizedW} × {resizedH} px
      </Text>
      <Text style={styles.infoText}>
        🏷 {fmtLabel}
      </Text>
    </View>
  );
};
