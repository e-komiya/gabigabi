import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import ErrorModal from '../components/ErrorModal';
import ImageModal from '../components/ImageModal';
import {useAppStore} from '../state/store';
import {ConvertMethod} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressToTargetSize} from '../domain/useDiscordCompress';
import {convertImage, formatBytes, ImageFormat} from '../domain/convertImage';
import {FFmpegKit} from 'ffmpeg-kit-react-native';
import {processVideoWithFfmpeg} from '../data/ffmpeg/FfmpegProcessor';
import {cleanupCachedTempFiles, getFileSizeBytes} from '../data/ffmpeg/ffmpegUtils';
import ConversionHistoryModal from './components/ConversionHistoryModal';
import {t} from '../i18n';

// Custom hooks
import {useSaveFeedback} from '../hooks/useSaveFeedback';
import {useProcessingNotification} from '../hooks/useProcessingNotification';
import {useFileInfo} from '../hooks/useFileInfo';
import {useImagePicker} from '../hooks/useImagePicker';
import {useSaveHistory} from '../hooks/useSaveHistory';

// Subcomponents
import PreviewCard from './components/PreviewCard';
import {BeforeInfoBlock, AfterInfoBlock} from './components/ImageInfoBlock';
import SettingsPanel from './components/SettingsPanel';
import TargetSizePanel from './components/TargetSizePanel';
import AboutModal from './components/AboutModal';
import {mainScreenStyles as styles} from './components/mainScreenStyles';

// テンプレートレベルに対応する設定値
const TEMPLATE_SETTINGS: Record<number, {
  resizePercent: number;
  compressionRate: number;
  shrinkExpandEnabled: boolean;
  shrinkExpandRate: number;
  multiCompressEnabled: boolean;
  multiCompressCount: number;
}> = {
  1: {resizePercent: 90, compressionRate: 72, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  2: {resizePercent: 70, compressionRate: 84, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  3: {resizePercent: 45, compressionRate: 94, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: true,  multiCompressCount: 2},
  4: {resizePercent: 30, compressionRate: 98, shrinkExpandEnabled: true,  shrinkExpandRate: 45, multiCompressEnabled: true,  multiCompressCount: 3},
  5: {resizePercent: 15, compressionRate: 99, shrinkExpandEnabled: true,  shrinkExpandRate: 35, multiCompressEnabled: true,  multiCompressCount: 4},
};

const MainScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    selectedImage,
    selectedMediaType,
    resizePercent,
    isProcessing,
    processedImage,
    outputFormat,
    compressionRate,
    gabigabiLevel,
    videoOutputFormat,
    shrinkExpandEnabled,
    shrinkExpandRate,
    multiCompressEnabled,
    multiCompressCount,
    convertMethod,
    targetSizeValue,
    targetSizeUnit,
    gifFps,
    gifScale,
    setSelectedImage,
    setSelectedMediaType,
    setResizePercent,
    setProcessedImage,
    setIsProcessing,
    setOutputFormat,
    setCompressionRate,
    setGabigabiLevel,
    setVideoOutputFormat,
    setShrinkExpandEnabled,
    setShrinkExpandRate,
    setMultiCompressEnabled,
    setMultiCompressCount,
    setConvertMethod,
    setTargetSizeValue,
    setTargetSizeUnit,
    setGifFps,
    setGifScale,
  } = useAppStore();

  const [errorModal, setErrorModal] = useState<{visible: boolean; title: string; message: string}>({
    visible: false,
    title: t('error'),
    message: '',
  });

  const [processingAction, setProcessingAction] = useState<'gabigabi' | 'convert' | 'targetSize' | null>(null);
  const [targetSizeNotReached, setTargetSizeNotReached] = useState<{target: number; actual: number} | null>(null);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const outputBytesRef = useRef(0);

  // Custom hooks
  const {saveMessage, saveMessageOpacity, showSaveFeedback} = useSaveFeedback();
  const {notifyProcessingStarted, notifyProcessingUpdate, notifyProcessingResult} = useProcessingNotification();
  const {fileInfo} = useFileInfo(selectedImage, selectedMediaType);
  const {saveHistory} = useSaveHistory({
    selectedMediaType,
    outputFormat,
    videoOutputFormat,
    gabigabiLevel,
    resizePercent,
    compressionRate,
  });

  const showError = useCallback((title: string, message: string) => {
    setErrorModal({visible: true, title, message});
  }, []);

  const hideError = useCallback(() => {
    setErrorModal(prev => ({...prev, visible: false}));
  }, []);

  const handleImageSelect = useCallback(
    (imageUri: string, mediaType: 'image' | 'video' = 'image') => {
      setSelectedImage(imageUri);
      setSelectedMediaType(mediaType);
      setProcessedImage(null);
    },
    [setSelectedImage, setSelectedMediaType, setProcessedImage],
  );

  const {handleOpenPicker} = useImagePicker({
    isProcessing,
    selectedMediaType,
    onSelect: handleImageSelect,
  });

  // #214: アプリ起動時に一度だけ一時ファイルをクリーンアップする
  useEffect(() => {
    cleanupCachedTempFiles();
  }, []);

  const handleResizeChange = useCallback(
    (percent: number) => {
      setResizePercent(percent);
      setGabigabiLevel(null);
    },
    [setResizePercent, setGabigabiLevel],
  );

  const handleQualityChange = useCallback(
    (quality: number) => {
      setCompressionRate(quality);
      setGabigabiLevel(null);
    },
    [setCompressionRate, setGabigabiLevel],
  );

  const handleShrinkExpandToggle = useCallback(
    (val: boolean) => {
      setShrinkExpandEnabled(val);
      setGabigabiLevel(null);
    },
    [setShrinkExpandEnabled, setGabigabiLevel],
  );

  const handleShrinkExpandRateChange = useCallback(
    (val: number) => {
      setShrinkExpandRate(Math.round(val));
      setGabigabiLevel(null);
    },
    [setShrinkExpandRate, setGabigabiLevel],
  );

  const handleMultiCompressToggle = useCallback(
    (val: boolean) => {
      setMultiCompressEnabled(val);
      setGabigabiLevel(null);
    },
    [setMultiCompressEnabled, setGabigabiLevel],
  );

  const handleMultiCompressCountChange = useCallback(
    (val: number) => {
      setMultiCompressCount(Math.round(val));
      setGabigabiLevel(null);
    },
    [setMultiCompressCount, setGabigabiLevel],
  );

  const handleTemplateSelect = useCallback(
    (level: number) => {
      const settings = TEMPLATE_SETTINGS[level] ?? TEMPLATE_SETTINGS[1];
      setGabigabiLevel(level);
      setResizePercent(settings.resizePercent);
      setCompressionRate(settings.compressionRate);
      setShrinkExpandEnabled(settings.shrinkExpandEnabled);
      setShrinkExpandRate(settings.shrinkExpandRate);
      setMultiCompressEnabled(settings.multiCompressEnabled);
      setMultiCompressCount(settings.multiCompressCount);
    },
    [setGabigabiLevel, setResizePercent, setCompressionRate, setShrinkExpandEnabled, setShrinkExpandRate, setMultiCompressEnabled, setMultiCompressCount],
  );

  const handleImagePress = useCallback((uri: string | null) => {
    if (!uri) return;
    setFullscreenUri(uri);
    setFullscreenVisible(true);
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      await FFmpegKit.cancel();
      await cleanupCachedTempFiles();
    } catch (err) {
      console.warn('Cancel failed:', err);
    }
  }, []);

  const handleProcess = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setProcessingAction('gabigabi');
    let processingNotificationId = await notifyProcessingStarted(t('notifyStarted'));
    try {
      let resultUri: string;
      let resultBytes: number;
      let historyAction: 'gabigabi' | 'convert' = 'gabigabi';
      let inputBytes = 0;

      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      inputBytes = getFileSizeBytes(inputInfo);
      processingNotificationId = await notifyProcessingUpdate(t('notifyInputAnalyzed'), processingNotificationId);

      if (selectedMediaType === 'video') {
        processingNotificationId = await notifyProcessingUpdate(t('notifyVideoProcessing'), processingNotificationId);
        const result = await processVideoWithFfmpeg(
          selectedImage,
          resizePercent,
          gabigabiLevel ?? 1,
          videoOutputFormat,
          compressionRate,
        );
        resultUri = result.outputUri;
        resultBytes = result.outputBytes;
      } else {
        processingNotificationId = await notifyProcessingUpdate(t('notifyImageProcessing'), processingNotificationId);

        if (gabigabiLevel === null) {
          historyAction = 'convert';
          if (resizePercent === 100 && outputFormat === 'jpeg') {
            Alert.alert(t('noConversionNeededTitle'), t('noConversionNeededMessage'));
            return;
          }
          if (resizePercent < 100) {
            const result = await resizeImage(selectedImage, resizePercent, 0);
            resultUri = result.outputUri;
            resultBytes = result.outputBytes;
          } else {
            const result = await convertImage(selectedImage, {
              outputFormat,
              quality: compressionRate,
              ...(outputFormat === 'gif' ? {gifFps, gifScale} : {}),
            });
            resultUri = result.outputUri;
            resultBytes = result.outputBytes;
          }
        } else {
          const result = await resizeImage(selectedImage, resizePercent, gabigabiLevel!, {
            shrinkExpandEnabled,
            shrinkExpandRate,
            multiCompressEnabled,
            multiCompressCount,
          });
          resultUri = result.outputUri;
          resultBytes = result.outputBytes;
        }
      }

      setProcessedImage(resultUri);
      outputBytesRef.current = resultBytes;
      await saveHistory(historyAction, selectedImage, resultUri, inputBytes, resultBytes);
      await notifyProcessingResult(t('notifyCompleted'), processingNotificationId);
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        showError(t('error'), `${t('convertFailed')}: ${msg}`);
        await notifyProcessingResult(t('notifyFailed'), processingNotificationId);
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleSave = async () => {
    if (!processedImage) return;
    const {status} = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('galleryPermissionMessage'));
      return;
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(processedImage);
      showSaveFeedback(`${t('saveSuccess')}\n${asset.uri}`);
    } catch (err) {
      showError(t('error'), `${t('saveFailed')}: ${String(err)}`);
    }
  };

  const handleShare = async () => {
    if (!processedImage) return;
    try {
      const filePath = processedImage.replace('file://', '');
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const videoMimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        wmv: 'video/x-ms-wmv',
        mkv: 'video/x-matroska',
        webm: 'video/webm',
        mpg: 'video/mpeg',
        mpeg: 'video/mpeg',
        m4v: 'video/x-m4v',
        '3gp': 'video/3gpp',
      };
      const mimeType =
        ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'bmp' ? 'image/bmp'
        : ext === 'gif' ? 'image/gif'
        : videoMimeMap[ext] ?? 'image/jpeg';
      await Share.open({url: `file://${filePath}`, type: mimeType});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('User did not share') || message.includes('cancel')) return;
      showError(t('error'), `${t('shareFailed')}: ${message}`);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedMediaType(null);
    setProcessedImage(null);
    outputBytesRef.current = 0;
    setTargetSizeNotReached(null);
  };

  const handleTargetSizeProcess = async () => {
    if (!selectedImage) return;

    const val = parseFloat(targetSizeValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert(t('error'), t('invalidTargetSize'));
      return;
    }

    let targetBytes = val;
    if (targetSizeUnit === 'KB') targetBytes *= 1024;
    else if (targetSizeUnit === 'MB') targetBytes *= 1024 * 1024;
    else if (targetSizeUnit === 'GB') targetBytes *= 1024 * 1024 * 1024;

    setIsProcessing(true);
    setProcessingAction('targetSize');
    let processingNotificationId = await notifyProcessingStarted(t('notifyCompressStarted'));
    try {
      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      const inputBytes = getFileSizeBytes(inputInfo);
      processingNotificationId = await notifyProcessingUpdate(t('notifyCompressProcessing'), processingNotificationId);
      const result = await compressToTargetSize(selectedImage, targetBytes, videoOutputFormat);
      setProcessedImage(result.outputUri);
      outputBytesRef.current = result.outputBytes;
      setTargetSizeNotReached(
        result.outputBytes > targetBytes ? {target: targetBytes, actual: result.outputBytes} : null,
      );
      await saveHistory('targetSize', selectedImage, result.outputUri, inputBytes, result.outputBytes, targetBytes);
      await notifyProcessingResult(t('notifyCompressCompleted'), processingNotificationId);
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        showError(t('error'), `${t('targetCompressionFailed')}: ${msg}`);
        await notifyProcessingResult(t('notifyCompressFailed'), processingNotificationId);
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={hideError}
      />

      {saveMessage && (
        <Animated.View style={[styles.saveFeedback, {opacity: saveMessageOpacity}]}>
          <Text style={styles.saveFeedbackText}>{saveMessage}</Text>
        </Animated.View>
      )}

      <ImageModal
        uri={fullscreenUri}
        visible={fullscreenVisible}
        onClose={() => setFullscreenVisible(false)}
      />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.appName} numberOfLines={1} adjustsFontSizeToFit>GabiGabi</Text>
            <Text style={styles.appSubtitle} numberOfLines={1} adjustsFontSizeToFit>{t('appSubtitle')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setAboutVisible(true)}
            style={styles.aboutButton}
            accessibilityRole="button"
            accessibilityLabel={t('aboutButton')}>
            <Text style={styles.aboutButtonIcon}>ℹ️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            style={[styles.aboutButton, {right: 40}]}
            accessibilityRole="button"
            accessibilityLabel={t('conversionHistoryButton')}>
            <Text style={styles.aboutButtonIcon}>🕐</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
      <ConversionHistoryModal visible={historyVisible} onClose={() => setHistoryVisible(false)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.previewRow}>
          <View style={styles.previewColumn}>
            <PreviewCard
              label={t('before')}
              uri={selectedImage}
              mediaType={selectedMediaType ?? 'image'}
              placeholder={''}
              onPickerPress={handleOpenPicker}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && <BeforeInfoBlock fileInfo={fileInfo} />}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
          <View style={styles.previewColumn}>
            <PreviewCard
              label={t('after')}
              uri={processedImage}
              mediaType={selectedMediaType === 'video' ? 'video' : 'image'}
              placeholder={selectedImage ? t('converted') : '—'}
              onPickerPress={undefined}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && (
              <AfterInfoBlock
                fileInfo={fileInfo}
                processedImage={processedImage}
                outputBytesFormatted={formatBytes(outputBytesRef.current)}
                resizePercent={resizePercent}
                outputFormat={outputFormat}
                showAfterConversion={t('showAfterConversion')}
              />
            )}
            {targetSizeNotReached && (
              <View style={styles.targetSizeWarning} accessibilityRole="alert">
                <Text style={styles.targetSizeWarningText}>
                  ⚠️ {t('targetSizeNotReachedPrefix')}{formatBytes(targetSizeNotReached.target)}{t('targetSizeNotReachedMiddle')}{formatBytes(targetSizeNotReached.actual)}{t('targetSizeNotReachedSuffix')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.methodTabs}>
          <TouchableOpacity
            style={[styles.methodTab, convertMethod === 'parameters' && styles.methodTabActive]}
            onPress={() => setConvertMethod('parameters')}
            accessibilityRole="tab"
            accessibilityLabel={t('setParameters')}
            accessibilityState={{selected: convertMethod === 'parameters'}}>
            <Text style={[styles.methodTabText, convertMethod === 'parameters' && styles.methodTabTextActive]}>{t('setParameters')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodTab, convertMethod === 'targetSize' && styles.methodTabActive]}
            onPress={() => setConvertMethod('targetSize')}
            accessibilityRole="tab"
            accessibilityLabel={t('setTargetSize')}
            accessibilityState={{selected: convertMethod === 'targetSize'}}>
            <Text style={[styles.methodTabText, convertMethod === 'targetSize' && styles.methodTabTextActive]}>{t('setTargetSize')}</Text>
          </TouchableOpacity>
        </View>

        {convertMethod === 'parameters' ? (
          <SettingsPanel
            selectedMediaType={selectedMediaType}
            gabigabiLevel={gabigabiLevel}
            resizePercent={resizePercent}
            compressionRate={compressionRate}
            outputFormat={outputFormat as ImageFormat}
            videoOutputFormat={videoOutputFormat}
            shrinkExpandEnabled={shrinkExpandEnabled}
            shrinkExpandRate={shrinkExpandRate}
            multiCompressEnabled={multiCompressEnabled}
            multiCompressCount={multiCompressCount}
            fileInfoWidth={fileInfo?.width}
            fileInfoHeight={fileInfo?.height}
            onTemplateSelect={handleTemplateSelect}
            onResizeChange={handleResizeChange}
            onQualityChange={handleQualityChange}
            onOutputFormatChange={setOutputFormat}
            onVideoOutputFormatChange={setVideoOutputFormat}
            onShrinkExpandToggle={handleShrinkExpandToggle}
            onShrinkExpandRateChange={handleShrinkExpandRateChange}
            onMultiCompressToggle={handleMultiCompressToggle}
            onMultiCompressCountChange={handleMultiCompressCountChange}
            gifFps={gifFps}
            gifScale={gifScale}
            onGifFpsChange={setGifFps}
            onGifScaleChange={setGifScale}
          />
        ) : (
          <TargetSizePanel
            targetSizeValue={targetSizeValue}
            targetSizeUnit={targetSizeUnit}
            onValueChange={setTargetSizeValue}
            onUnitChange={setTargetSizeUnit}
          />
        )}

        {(selectedImage || processedImage) && (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <View style={[styles.floatingArea, {paddingBottom: Math.max(insets.bottom + 16, 32)}]}>
        {isProcessing && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>⛔ Cancel</Text>
          </TouchableOpacity>
        )}

        {processedImage && !isProcessing && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('saveToCameraRoll')}>
              <Text style={styles.buttonText}>{t('saveToCameraRoll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('share')}>
              <Text style={styles.buttonText}>🔗 Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {convertMethod === 'parameters' ? (
          <TouchableOpacity
            style={[styles.processButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleProcess}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('runGabigabi')}>
            {isProcessing && processingAction === 'gabigabi' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> {t('processing')}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Convert</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.targetSizeProcessButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleTargetSizeProcess}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('compressUnderTargetSize')}>
            {isProcessing && processingAction === 'targetSize' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> {t('processing')}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>{t('compressUnderTargetSize')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default MainScreen;