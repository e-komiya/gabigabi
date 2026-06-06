import * as ExpoImagePicker from 'expo-image-picker';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

import { t } from '../i18n';
import {
  ACCENT,
  CARD_BG,
  BORDER,
  TEXT_SECONDARY,
} from '../screens/components/sharedStyles';

interface ImagePickerProps {
  onImageSelect: (imageUri: string, mediaType: 'image' | 'video') => void;
  selectedImage?: string;
  selectedMediaType?: 'image' | 'video';
}

const resolvePickerMediaTypes = (selectedMediaType?: 'image' | 'video') => {
  if (selectedMediaType === 'video') return ['videos'] as const;
  if (selectedMediaType === 'image') return ['images'] as const;
  return ['images', 'videos'] as const;
};

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelect,
  selectedImage,
  selectedMediaType,
}) => {
  const handlePress = async () => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('galleryPermissionMessage'));
      return;
    }
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: resolvePickerMediaTypes(selectedMediaType),
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
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        selectedImage
          ? isVideo
            ? t('changeVideo')
            : t('changeImage')
          : t('pickImageOrVideo')
      }
    >
      <Text style={styles.icon}>{isVideo ? '🎬' : '🖼️'}</Text>
      <Text style={styles.buttonText}>
        {selectedImage
          ? isVideo
            ? t('changeVideo')
            : t('changeImage')
          : t('pickImageOrVideo')}
      </Text>
      {!selectedImage && (
        <Text style={styles.hint}>{t('tapToOpenGallery')}</Text>
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
