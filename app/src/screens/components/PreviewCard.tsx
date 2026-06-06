import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';

import { CARD_BG, ACCENT, TEXT_SECONDARY, BORDER } from './sharedStyles';
import { t } from '../../i18n';

export interface PreviewCardProps {
  label: string;
  uri: string | null;
  mediaType?: 'image' | 'video';
  placeholder: string;
  onPickerPress?: () => void;
  onImagePress?: (uri: string | null) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({
  label,
  uri,
  mediaType = 'image',
  placeholder,
  onImagePress,
  onPickerPress,
}) => (
  <View style={styles.previewCard} accessible={false}>
    <View style={styles.previewLabelRow}>
      <Text style={styles.previewLabel} accessibilityRole="header">
        {label}
      </Text>
    </View>
    {uri ? (
      mediaType === 'video' ? (
        <View
          style={[styles.previewEmpty, styles.videoPreview]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${label}: ${t('video')}`}
        >
          <Text style={styles.videoPreviewIcon}>🎬</Text>
          <Text style={styles.videoPreviewText}>{t('video')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() =>
            onPickerPress ? onPickerPress() : onImagePress?.(uri)
          }
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            onPickerPress ? t('changeImage') : `${label} ${t('tapToZoom')}`
          }
          accessibilityHint={
            onPickerPress ? t('tapToOpenGallery') : t('tapToZoom')
          }
        >
          <Image
            source={{ uri }}
            style={styles.previewImage}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${label} ${t('tapToZoom')}`}
          />
          <View
            style={styles.svgOverlay}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            {onPickerPress && (
              <Svg width="100%" height="100%" viewBox="0 0 640 640">
                <Path
                  d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"
                  fill={ACCENT}
                  opacity="0.6"
                />
              </Svg>
            )}
          </View>
          <View
            style={styles.previewTapHint}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.previewTapHintText}>🔍 {t('tapToZoom')}</Text>
          </View>
        </TouchableOpacity>
      )
    ) : (
      <TouchableOpacity
        onPress={onPickerPress}
        activeOpacity={0.7}
        style={styles.previewEmptyTouchable}
        accessibilityRole="button"
        accessibilityLabel={t('pickImageOrVideo')}
        accessibilityHint={t('tapToOpenGallery')}
      >
        <Text style={styles.previewEmptyIcon} accessible={false}>
          ＋
        </Text>
        <Text style={styles.previewEmptyText}>
          {placeholder || t('selectImageOrVideo')}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  previewCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  previewLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewImage: {
    width: '100%',
    height: 150,
  },
  svgOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 32,
    height: 32,
    pointerEvents: 'none',
  },
  previewTapHint: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  previewTapHintText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  previewEmpty: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmptyTouchable: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewEmptyIcon: {
    fontSize: 28,
    color: TEXT_SECONDARY,
  },
  previewEmptyText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  videoPreview: {
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  videoPreviewIcon: {
    fontSize: 40,
  },
  videoPreviewText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
});

export default PreviewCard;
