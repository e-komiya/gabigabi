import * as ExpoImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { t } from '../i18n';

const resolvePickerMediaTypes = (
  selectedMediaType?: 'image' | 'video' | null,
) => {
  if (selectedMediaType === 'video') return ['videos'] as const;
  if (selectedMediaType === 'image') return ['images'] as const;
  return ['images', 'videos'] as const;
};

interface UseImagePickerOptions {
  isProcessing: boolean;
  selectedMediaType: 'image' | 'video' | null;
  onSelect: (uri: string, mediaType: 'image' | 'video') => void;
}

export const useImagePicker = ({
  isProcessing,
  selectedMediaType,
  onSelect,
}: UseImagePickerOptions) => {
  const handleOpenPicker = useCallback(async () => {
    if (isProcessing) return;
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
        /\.(mp4|mov|mkv|webm|m4v|3gp|flv)$/i.test(asset.uri);
      onSelect(asset.uri, isVideo ? 'video' : 'image');
    }
  }, [isProcessing, selectedMediaType, onSelect]);

  return { handleOpenPicker };
};
