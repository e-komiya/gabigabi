import React from 'react';
import {View, Text, TouchableOpacity, Switch} from 'react-native';
import CustomSlider from '../../components/CustomSlider';
import ResizeSlider from '../../components/ResizeSlider';
import {VideoFormat} from '../../state/store';
import {ImageFormat} from '../../domain/convertImage';
import {t} from '../../i18n';
import {
  sharedStyles,
  ACCENT,
  ACCENT2,
  BORDER,
} from './sharedStyles';

const FORMAT_OPTIONS: {label: string; value: ImageFormat}[] = [
  {label: 'JPEG', value: 'jpeg'},
  {label: 'PNG', value: 'png'},
  {label: 'WebP', value: 'webp'},
  {label: 'BMP', value: 'bmp'},
  {label: 'GIF', value: 'gif'},
];

const VIDEO_FORMAT_OPTIONS: {label: string; value: VideoFormat}[] = [
  {label: 'MP4', value: 'mp4'},
  {label: 'MOV', value: 'mov'},
  {label: 'MKV', value: 'mkv'},
  {label: 'WebM', value: 'webm'},
];

const GABIGABI_LEVELS: {label: string; value: number}[] = [
  {label: '1', value: 1},
  {label: '2', value: 2},
  {label: '3', value: 3},
  {label: '4', value: 4},
  {label: '5', value: 5},
];

interface SettingsPanelProps {
  selectedMediaType: 'image' | 'video' | null;
  gabigabiLevel: number | null;
  resizePercent: number;
  compressionRate: number;
  outputFormat: ImageFormat;
  videoOutputFormat: VideoFormat;
  shrinkExpandEnabled: boolean;
  shrinkExpandRate: number;
  multiCompressEnabled: boolean;
  multiCompressCount: number;
  fileInfoWidth?: number;
  fileInfoHeight?: number;
  gifFps: number;
  gifScale: number;
  onTemplateSelect: (level: number) => void;
  onResizeChange: (percent: number) => void;
  onQualityChange: (quality: number) => void;
  onOutputFormatChange: (format: ImageFormat) => void;
  onVideoOutputFormatChange: (format: VideoFormat) => void;
  onShrinkExpandToggle: (val: boolean) => void;
  onShrinkExpandRateChange: (val: number) => void;
  onMultiCompressToggle: (val: boolean) => void;
  onMultiCompressCountChange: (val: number) => void;
  onGifFpsChange: (fps: number) => void;
  onGifScaleChange: (scale: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  selectedMediaType,
  gabigabiLevel,
  resizePercent,
  compressionRate,
  outputFormat,
  videoOutputFormat,
  shrinkExpandEnabled,
  shrinkExpandRate,
  multiCompressEnabled,
  multiCompressCount,
  fileInfoWidth,
  fileInfoHeight,
  gifFps,
  gifScale,
  onTemplateSelect,
  onResizeChange,
  onQualityChange,
  onOutputFormatChange,
  onVideoOutputFormatChange,
  onShrinkExpandToggle,
  onShrinkExpandRateChange,
  onMultiCompressToggle,
  onMultiCompressCountChange,
  onGifFpsChange,
  onGifScaleChange,
}) => (
  <>
    {/* ── Template Section ── */}
    <View style={sharedStyles.sectionContainer}>
      <Text style={sharedStyles.sectionTitle}>{t('template')}</Text>
      <View style={sharedStyles.templateBlock}>
        <Text style={sharedStyles.templateBlockLabel}>{t('gabigabiLevel')}</Text>
        <View style={sharedStyles.formatRow}>
          {GABIGABI_LEVELS.map(item => (
            <TouchableOpacity
              key={item.value}
              style={[
                sharedStyles.formatButton,
                gabigabiLevel === item.value && sharedStyles.gabigabiButtonActive,
              ]}
              onPress={() => onTemplateSelect(item.value)}>
              <Text
                style={[
                  sharedStyles.formatButtonText,
                  gabigabiLevel === item.value && sharedStyles.formatButtonTextActive,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>

    {/* ── Resize Slider ── */}
    <View style={sharedStyles.sliderCard}>
      <ResizeSlider
        value={resizePercent}
        onValueChange={onResizeChange}
        originalWidth={fileInfoWidth}
        originalHeight={fileInfoHeight}
      />
    </View>

    {/* ── Format Conversion Section ── */}
    <View style={sharedStyles.sectionContainer}>
      <Text style={sharedStyles.sectionTitle}>{t('outputFormat')}</Text>
      {selectedMediaType !== 'image' && (
        <>
          {selectedMediaType === null && (
            <Text style={sharedStyles.formatGroupLabel}>🎬 {t('video')}</Text>
          )}
          <View style={[sharedStyles.formatRow, sharedStyles.formatRowWrap]}>
            {VIDEO_FORMAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  sharedStyles.formatButton,
                  videoOutputFormat === opt.value && sharedStyles.formatButtonActive,
                ]}
                onPress={() => onVideoOutputFormatChange(opt.value)}>
                <Text
                  style={[
                    sharedStyles.formatButtonText,
                    videoOutputFormat === opt.value && sharedStyles.formatButtonTextActive,
                  ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {selectedMediaType !== 'video' && (
        <>
          {selectedMediaType === null && (
            <Text style={[sharedStyles.formatGroupLabel, {marginTop: 12}]}>{t('image')}</Text>
          )}
          <View style={sharedStyles.formatRow}>
            {FORMAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  sharedStyles.formatButton,
                  outputFormat === opt.value && sharedStyles.formatButtonActive,
                ]}
                onPress={() => onOutputFormatChange(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`${t('outputFormatAccessibility')} ${opt.label}`}>
                <Text
                  style={[
                    sharedStyles.formatButtonText,
                    outputFormat === opt.value && sharedStyles.formatButtonTextActive,
                  ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {selectedMediaType !== 'video' && outputFormat === 'gif' && (
        <>
          <View style={sharedStyles.qualityRow}>
            <View style={sharedStyles.qualityLabelRow}>
              <Text style={sharedStyles.qualityLabel}>{t('gifFps')}</Text>
              <Text style={sharedStyles.qualityValue}>{gifFps} fps</Text>
            </View>
            <CustomSlider
              style={sharedStyles.qualitySlider}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={gifFps}
              onValueChange={(v: number) => onGifFpsChange(Math.round(v))}
              accessibilityLabel={t('gifFpsSlider')}
              minimumTrackTintColor={ACCENT2}
              maximumTrackTintColor={BORDER}
              thumbTintColor={ACCENT2}
            />
          </View>
          <View style={sharedStyles.qualityRow}>
            <View style={sharedStyles.qualityLabelRow}>
              <Text style={sharedStyles.qualityLabel}>{t('gifScale')}</Text>
              <Text style={sharedStyles.qualityValue}>{gifScale}%</Text>
            </View>
            <CustomSlider
              style={sharedStyles.qualitySlider}
              minimumValue={1}
              maximumValue={100}
              step={1}
              value={gifScale}
              onValueChange={(v: number) => onGifScaleChange(Math.round(v))}
              accessibilityLabel={t('gifScaleSlider')}
              minimumTrackTintColor={ACCENT2}
              maximumTrackTintColor={BORDER}
              thumbTintColor={ACCENT2}
            />
          </View>
        </>
      )}
      {((selectedMediaType !== 'video' && (outputFormat === 'jpeg' || outputFormat === 'webp')) || selectedMediaType === 'video') && (
        <View style={sharedStyles.qualityRow}>
          <View style={sharedStyles.qualityLabelRow}>
            <Text style={sharedStyles.qualityLabel}>{t('compressionRate')}</Text>
            <Text style={sharedStyles.qualityValue}>{compressionRate}%</Text>
          </View>
          <CustomSlider
            style={sharedStyles.qualitySlider}
            minimumValue={0}
            maximumValue={99}
            step={1}
            value={compressionRate}
            onValueChange={(v: number) => onQualityChange(Math.round(v))}
            accessibilityLabel={selectedMediaType === 'video' ? t('videoCompressionSlider') : t('imageCompressionSlider')}
            accessibilityHint={selectedMediaType === 'video' ? t('videoCompressionSliderHint') : t('imageCompressionSliderHint')}
            minimumTrackTintColor={ACCENT2}
            maximumTrackTintColor={BORDER}
            thumbTintColor={ACCENT2}
          />
        </View>
      )}
    </View>

    {/* ── Shrink→Expand Section ── */}
    <View style={sharedStyles.sectionContainer}>
      <View style={sharedStyles.sectionHeader}>
        <Text style={sharedStyles.sectionTitle}>{t('shrinkExpand')}</Text>
        <Text style={sharedStyles.sectionHint}>{t('shrinkExpandHint')}</Text>
      </View>
      <View style={sharedStyles.switchRow}>
        <Text style={sharedStyles.switchLabel}>ON/OFF</Text>
        <Switch
          value={shrinkExpandEnabled}
          onValueChange={onShrinkExpandToggle}
          trackColor={{false: BORDER, true: ACCENT}}
          thumbColor={shrinkExpandEnabled ? '#fff' : '#888'}
        />
      </View>
      {shrinkExpandEnabled && (
        <View style={sharedStyles.qualityRow}>
          <View style={sharedStyles.qualityLabelRow}>
            <Text style={sharedStyles.qualityLabel}>{t('shrinkRate')}</Text>
            <Text style={sharedStyles.qualityValue}>{shrinkExpandRate}%</Text>
          </View>
          <CustomSlider
            style={sharedStyles.qualitySlider}
            minimumValue={10}
            maximumValue={90}
            step={1}
            value={shrinkExpandRate}
            onValueChange={onShrinkExpandRateChange}
            accessibilityLabel={t('shrinkRateSlider')}
            accessibilityHint={t('shrinkRateSliderHint')}
            minimumTrackTintColor={ACCENT}
            maximumTrackTintColor={BORDER}
            thumbTintColor={ACCENT}
          />
        </View>
      )}
    </View>

    {/* ── Multi-Compress Section ── */}
    <View style={sharedStyles.sectionContainer}>
      <View style={sharedStyles.sectionHeader}>
        <Text style={sharedStyles.sectionTitle}>{t('multiCompress')}</Text>
        <Text style={sharedStyles.sectionHint}>{t('multiCompressHint')}</Text>
      </View>
      <View style={sharedStyles.switchRow}>
        <Text style={sharedStyles.switchLabel}>ON/OFF</Text>
        <Switch
          value={multiCompressEnabled}
          onValueChange={onMultiCompressToggle}
          trackColor={{false: BORDER, true: ACCENT}}
          thumbColor={multiCompressEnabled ? '#fff' : '#888'}
        />
      </View>
      {multiCompressEnabled && (
        <View style={sharedStyles.qualityRow}>
          <View style={sharedStyles.qualityLabelRow}>
            <Text style={sharedStyles.qualityLabel}>{t('compressCount')}</Text>
            <Text style={sharedStyles.qualityValue}>{multiCompressCount}{t('timesSuffix')}</Text>
          </View>
          <CustomSlider
            style={sharedStyles.qualitySlider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={multiCompressCount}
            onValueChange={onMultiCompressCountChange}
            accessibilityLabel={t('multiCompressSlider')}
            accessibilityHint={t('multiCompressSliderHint')}
            minimumTrackTintColor={ACCENT}
            maximumTrackTintColor={BORDER}
            thumbTintColor={ACCENT}
          />
        </View>
      )}
    </View>
  </>
);

export default SettingsPanel;
