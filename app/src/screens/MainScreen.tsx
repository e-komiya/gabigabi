import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import ErrorModal from '../components/ErrorModal';
import ImageModal from '../components/ImageModal';
import {useAppStore} from '../state/store';
import {ConvertMethod} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressToTargetSize} from '../domain/useDiscordCompress';
import {convertImage, formatBytes, ImageFormat} from '../domain/convertImage';
import {FFmpegKit, FFprobeKit} from 'ffmpeg-kit-react-native';
import {processVideoWithFfmpeg} from '../data/ffmpeg/FfmpegProcessor';
import {cleanupCachedTempFiles, getFileSizeBytes} from '../data/ffmpeg/ffmpegUtils';
import {saveConversionHistoryItem, ConversionAction} from '../data/history/conversionHistory';
import ConversionHistoryModal from './components/ConversionHistoryModal';
import {t} from '../i18n';

// Subcomponents
import PreviewCard from './components/PreviewCard';
import {BeforeInfoBlock, AfterInfoBlock} from './components/ImageInfoBlock';
import SettingsPanel from './components/SettingsPanel';
import TargetSizePanel from './components/TargetSizePanel';
import AboutModal from './components/AboutModal';
import {DARK_BG, CARD_BG, ACCENT, ACCENT2, TEXT_PRIMARY, TEXT_SECONDARY, BORDER} from './components/sharedStyles';

/* ── Constants are now imported from sharedStyles ── */

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

const resolvePickerMediaTypes = (selectedMediaType?: 'image' | 'video' | null) => {
  if (selectedMediaType === 'video') return ['videos'] as const;
  if (selectedMediaType === 'image') return ['images'] as const;
  return ['images', 'videos'] as const;
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
  } = useAppStore();

  const [errorModal, setErrorModal] = useState<{visible: boolean; title: string; message: string}>({
    visible: false,
    title: t('error'),
    message: '',
  });

  const [processingAction, setProcessingAction] = useState<'gabigabi' | 'convert' | 'targetSize' | null>(null);

  // #77: fullscreen modal state
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageOpacity] = useState(new Animated.Value(0));

  const showSaveFeedback = useCallback((message: string) => {
    setSaveMessage(message);
    Animated.sequence([
      Animated.timing(saveMessageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(saveMessageOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setSaveMessage(null));
  }, [saveMessageOpacity]);

  // #97: file info
  const [fileInfo, setFileInfo] = useState<{name: string; size: string; width: number; height: number} | null>(null);
  const outputBytesRef = useRef(0);

  const saveHistory = useCallback(async (
    action: ConversionAction,
    inputPath: string,
    outputPath: string,
    inputBytes: number,
    outputBytes: number,
    targetBytes?: number,
  ) => {
    await saveConversionHistoryItem({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      inputPath,
      outputPath,
      inputBytes,
      outputBytes,
      mediaType: selectedMediaType ?? 'image',
      params: {
        action,
        outputFormat,
        videoOutputFormat,
        gabigabiLevel,
        resizePercent,
        compressionRate,
        targetBytes,
      },
    });
  }, [selectedMediaType, outputFormat, videoOutputFormat, gabigabiLevel, resizePercent, compressionRate]);

  // #214: アプリ起動時に一度だけ一時ファイルをクリーンアップする
  useEffect(() => {
    cleanupCachedTempFiles();
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      setFileInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(selectedImage, {size: true});
        const bytes = getFileSizeBytes(info);
        const sizeStr = bytes >= 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
          : `${(bytes / 1024).toFixed(1)} KB`;
        const name = selectedImage.split('/').pop() ?? '';
        if (selectedMediaType === 'video') {
          // 動画の場合はFFprobeKitでwidthとheightを取得する (#165)
          try {
            const session = await FFprobeKit.execute(`-v quiet -print_format json -show_streams "${selectedImage}"`);
            const output = await session.getOutput();
            let width = 0;
            let height = 0;
            try {
              const streams = JSON.parse(output ?? '{}').streams ?? [];
              const videoStream = streams.find((s: {codec_type: string}) => s.codec_type === 'video');
              if (videoStream) {
                width = videoStream.width ?? 0;
                height = videoStream.height ?? 0;
              }
            } catch {
              // JSON parse失敗時はwidth/height=0のまま
            }
            if (!cancelled) setFileInfo({name, size: sizeStr, width, height});
          } catch {
            if (!cancelled) setFileInfo({name, size: sizeStr, width: 0, height: 0});
          }
        } else {
          Image.getSize(
            selectedImage,
            (width, height) => {
              if (!cancelled) setFileInfo({name, size: sizeStr, width, height});
            },
            () => {
              if (!cancelled) setFileInfo({name, size: sizeStr, width: 0, height: 0});
            },
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedImage, selectedMediaType]);

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
    [setSelectedImage, setProcessedImage],
  );

  const handleOpenPicker = useCallback(async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
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
      handleImageSelect(asset.uri, isVideo ? 'video' : 'image');
    }
  }, [handleImageSelect]);

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

  // #77: open fullscreen
  const handleImagePress = useCallback((uri: string | null) => {
    if (!uri) return;
    setFullscreenUri(uri);
    setFullscreenVisible(true);
  }, []);

  // #34: cancel FFmpeg
  const handleCancel = useCallback(async () => {
    try {
      await FFmpegKit.cancel();
      // #216: キャンセル後に passlog などの一時ファイルを削除する
      await cleanupCachedTempFiles();
    } catch (err) {
      console.warn('Cancel failed:', err);
    }
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('processing-status', {
      name: '処理ステータス',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    }).catch(() => {
      // ignore
    });
  }, []);

  const notifyProcessingStarted = useCallback(async (body: string) => {
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'GabiGabi',
        body,
        sound: false,
        ...(Platform.OS === 'android'
          ? {
              channelId: 'processing-status',
              sticky: true,
              autoDismiss: false,
            }
          : {}),
      },
      trigger: null,
    });
  }, [ensureNotificationPermission]);

  const notifyProcessingUpdate = useCallback(async (body: string, activeNotificationId?: string | null) => {
    const granted = await ensureNotificationPermission();
    if (!granted) return activeNotificationId ?? null;
    if (activeNotificationId) {
      await Notifications.dismissNotificationAsync(activeNotificationId).catch(() => {
        // ignore
      });
    }
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'GabiGabi',
        body,
        sound: false,
        ...(Platform.OS === 'android'
          ? {
              channelId: 'processing-status',
              sticky: true,
              autoDismiss: false,
            }
          : {}),
      },
      trigger: null,
    });
  }, [ensureNotificationPermission]);

  const notifyProcessingResult = useCallback(async (body: string, activeNotificationId?: string | null) => {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    if (activeNotificationId) {
      await Notifications.dismissNotificationAsync(activeNotificationId).catch(() => {
        // ignore
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GabiGabi',
        body,
        sound: false,
        ...(Platform.OS === 'android' ? {channelId: 'processing-status'} : {}),
      },
      trigger: null,
    });
  }, [ensureNotificationPermission]);

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('gabigabi');
    let processingNotificationId = await notifyProcessingStarted(t('notifyStarted'));
    try {
      let resultUri: string;
      let resultBytes: number;
      let historyAction: ConversionAction = 'gabigabi';
      let inputBytes = 0;

      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      inputBytes = getFileSizeBytes(inputInfo);
      processingNotificationId = await notifyProcessingUpdate(t('notifyInputAnalyzed'), processingNotificationId);

      if (selectedMediaType === 'video') {
        processingNotificationId = await notifyProcessingUpdate(t('notifyVideoProcessing'), processingNotificationId);
        // 動画のガビガビ化
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
          // ガビガビなし → フォーマット変換 + リサイズのみ
          if (resizePercent === 100 && outputFormat === 'jpeg') {
            // 何も変更なし
            Alert.alert(t('noConversionNeededTitle'), t('noConversionNeededMessage'));
            return;
          }
          if (resizePercent < 100) {
            // リサイズのみ実行（手動調整）
            const result = await resizeImage(selectedImage, resizePercent, 0);
            resultUri = result.outputUri;
            resultBytes = result.outputBytes;
          } else {
            // フォーマット変換のみ
            const result = await convertImage(selectedImage, {
              outputFormat,
              quality: compressionRate,
            });
            resultUri = result.outputUri;
            resultBytes = result.outputBytes;
          }
        } else {
          // ガビガビ化（リサイズ + 品質劣化）
          const result = await resizeImage(selectedImage, resizePercent, gabigabiLevel!, {
            shrinkExpandEnabled,
            shrinkExpandRate,
            multiCompressEnabled,
            multiCompressCount,
          });
          resultUri = result.outputUri;
          resultBytes = result.outputBytes;
        }
      } // end else (image)

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
    if (!processedImage) {
      return;
    }
    const {status} = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('galleryPermissionMessage'));
      return;
    }
    try {
      // createAssetAsync はギャラリーを開かずにメディアストアに登録する
      const asset = await MediaLibrary.createAssetAsync(processedImage);
      showSaveFeedback(`${t('saveSuccess')}\n${asset.uri}`);
    } catch (err) {
      showError(t('error'), `${t('saveFailed')}: ${String(err)}`);
    }
  };

  // #78: fix share bug — copy to cache before sharing to avoid permission error
  const handleShare = async () => {
    if (!processedImage) {
      return;
    }
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
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : ext === 'gif' ? 'image/gif' : videoMimeMap[ext] ?? 'image/jpeg';
      await Share.open({
        url: `file://${filePath}`,
        type: mimeType,
      });
    } catch (err: unknown) {
      // User cancelled share dialog
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('User did not share') || message.includes('cancel')) {
        return;
      }
      showError(t('error'), `${t('shareFailed')}: ${message}`);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedMediaType(null);
    setProcessedImage(null);
    outputBytesRef.current = 0;
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

      {/* ── Error Modal ── */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={hideError}
      />

      {/* ── Save Feedback Toast (#306) ── */}
      {saveMessage && (
        <Animated.View style={[styles.saveFeedback, {opacity: saveMessageOpacity}]}>
          <Text style={styles.saveFeedbackText}>{saveMessage}</Text>
        </Animated.View>
      )}

      {/* ── Fullscreen Image Modal (#77) ── */}
      <ImageModal
        uri={fullscreenUri}
        visible={fullscreenVisible}
        onClose={() => setFullscreenVisible(false)}
      />

      {/* ── Header ── */}
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
            accessibilityLabel={t('aboutButton')}
          >
            <Text style={styles.aboutButtonIcon}>ℹ️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            style={[styles.aboutButton, {right: 40}]}
            accessibilityRole="button"
            accessibilityLabel={t('conversionHistoryButton')}
          >
            <Text style={styles.aboutButtonIcon}>🕐</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── About Modal ── */}
      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />

      {/* ── Conversion History Modal (#107) ── */}
      <ConversionHistoryModal visible={historyVisible} onClose={() => setHistoryVisible(false)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Before / After Preview with Info (#119) ── */}
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
            {selectedImage && fileInfo && (
              <BeforeInfoBlock fileInfo={fileInfo} />
            )}
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
          </View>
        </View>

        {/* ── Convert Method Tabs (#277) ── */}
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
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* ── Floating Action Area (#112) ── */}
      <View style={[styles.floatingArea, {paddingBottom: Math.max(insets.bottom + 16, 32)}]}>
        {/* Cancel Button during processing */}
        {isProcessing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>⛔ Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Save / Share Buttons after conversion */}
        {processedImage && !isProcessing && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('saveToCameraRoll')}>
              <Text style={styles.buttonText}>{t('saveToCameraRoll')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton]}
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('share')}>
              <Text style={styles.buttonText}>🔗 Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main action buttons */}
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

/* ── Styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
  },

  /* header */
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerTitleBlock: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    flex: 1,
    paddingHorizontal: 30,
  },
  aboutButton: {
    position: 'absolute' as const,
    right: 0,
    padding: 8,
  },
  aboutButtonIcon: {
    fontSize: 20,
    color: '#aaa',
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
    textAlign: 'center',
  },

  /* before/after row */
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  previewColumn: {
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  arrow: {
    fontSize: 28,
    color: ACCENT2,
    fontWeight: '700',
  },

  /* method tabs */
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  methodTabActive: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: BORDER,
  },
  methodTabText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  methodTabTextActive: {
    color: '#fff',
  },

  /* save feedback toast */
  saveFeedback: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    zIndex: 9999,
  },
  saveFeedbackText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* button row */
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  /* process button */
  processButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  targetSizeProcessButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#5865F2',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* cancel button (#34) */
  cancelButton: {
    backgroundColor: '#555',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#777',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* save / share buttons */
  saveButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  /* reset button */
  resetButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  resetButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },

  spacer: {
    height: 20,
  },

  /* floating action area (#112) */
  floatingArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
});

export default MainScreen;
