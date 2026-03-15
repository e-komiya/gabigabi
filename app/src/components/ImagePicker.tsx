import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Alert} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

interface ImagePickerProps {
  onImageSelect: (imageUri: string, mediaType: 'image' | 'video') => void;
  selectedImage?: string;
  selectedMediaType?: 'image' | 'video';
}

const ACCENT = '#ff4e50';
const CARD_BG = '#1a1a1a';
const BORDER = '#2a2a2a';
const TEXT_SECONDARY = '#888';

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelect,
  selectedImage,
  selectedMediaType,
}) => {
  const handlePress = async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', 'ギャラリーへのアクセスを許可してください');
      return;
    }
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo =
        asset.type === 'video' ||
        /\.(mp4|mov|avi|mkv|webm|m4v|3gp|flv|wmv|mpg|mpeg)$/i.test(asset.uri);
      onImageSelect(asset.uri, isVideo ? 'video' : 'image');
    }
  };

  const isVideo = selectedMediaType === 'video';

  return (
    <TouchableOpacity
      style={[styles.button, selectedImage && styles.buttonSelected]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Text style={styles.icon}>{isVideo ? '🎬' : '🖼️'}</Text>
      <Text style={styles.buttonText}>
        {selectedImage
          ? isVideo
            ? '動画を変更する'
            : '画像を変更する'
          : '画像 / 動画を選択する'}
      </Text>
      {!selectedImage && (
        <Text style={styles.hint}>タップしてギャラリーを開く</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSelected: {
    borderColor: ACCENT,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  buttonText: {
    color: '#f0f0f0',
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginTop: 4,
  },
});

export default ImagePicker;
