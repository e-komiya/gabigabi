import React, {useCallback, useEffect, useRef, useState} from 'react';
import CustomSlider from '../components/CustomSlider';
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
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Linking,
  Switch,
  TextInput,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoImagePicker from 'expo-image-picker';
import { Svg, Rect, Path, G } from 'react-native-svg';
import ImagePickerComponent from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import ErrorModal from '../components/ErrorModal';
import {useAppStore} from '../state/store';
import {VideoFormat, ConvertMethod, SizeUnit} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressForDiscord, compressToTargetSize} from '../domain/useDiscordCompress';
import {convertImage, formatBytes, ImageFormat} from '../domain/convertImage';
import {FFmpegKit, FFprobeKit} from 'ffmpeg-kit-react-native';
import {processVideoWithFfmpeg} from '../data/ffmpeg/FfmpegProcessor';
import {cleanupCachedTempFiles} from '../data/ffmpeg/ffmpegUtils';

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
  {label: '0', value: 0},
  {label: '1', value: 1},
  {label: '2', value: 2},
  {label: '3', value: 3},
  {label: '4', value: 4},
  {label: '5', value: 5},
];

// テンプレートレベルに対応する設定値
const TEMPLATE_SETTINGS: Record<number, {
  resizePercent: number;
  compressionRate: number;
  shrinkExpandEnabled: boolean;
  shrinkExpandRate: number;
  multiCompressEnabled: boolean;
  multiCompressCount: number;
}> = {
  0: {resizePercent: 100, compressionRate: 0,  shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  1: {resizePercent: 100, compressionRate: 55, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  2: {resizePercent: 75,  compressionRate: 70, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  3: {resizePercent: 25,  compressionRate: 99, shrinkExpandEnabled: false, shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  4: {resizePercent: 25,  compressionRate: 99, shrinkExpandEnabled: true,  shrinkExpandRate: 50, multiCompressEnabled: false, multiCompressCount: 3},
  5: {resizePercent: 5,   compressionRate: 99, shrinkExpandEnabled: true,  shrinkExpandRate: 50, multiCompressEnabled: true,  multiCompressCount: 3},
};

const TARGET_SIZE_TEMPLATES: {label: string; value: string; unit: SizeUnit}[] = [
  {label: 'Discord 10MB', value: '10', unit: 'MB'},
];

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

/* ── Fullscreen image modal with pinch-to-zoom ── */
interface ImageModalProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({uri, visible, onClose}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  // #207: track animated values via refs instead of `any` cast
  const scaleValueRef = useRef(1);
  const translateXValueRef = useRef(0);
  const translateYValueRef = useRef(0);
  const initialDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const scaleId = scale.addListener(({value}) => { scaleValueRef.current = value; });
    const txId = translateX.addListener(({value}) => { translateXValueRef.current = value; });
    const tyId = translateY.addListener(({value}) => { translateYValueRef.current = value; });
    return () => {
      scale.removeListener(scaleId);
      translateX.removeListener(txId);
      translateY.removeListener(tyId);
    };
  }, [scale, translateX, translateY]);

  const reset = useCallback(() => {
    scale.setValue(1);
    lastScale.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  }, [scale, translateX, translateY]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch-to-zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (initialDistanceRef.current == null) {
            initialDistanceRef.current = distance;
          }
          const newScale = Math.max(
            0.5,
            Math.min(5, lastScale.current * (distance / initialDistanceRef.current)),
          );
          scale.setValue(newScale);
        } else {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        initialDistanceRef.current = null;
        lastScale.current = scaleValueRef.current;
        translateX.flattenOffset();
        translateY.flattenOffset();
        lastTranslateX.current = translateXValueRef.current;
        lastTranslateY.current = translateYValueRef.current;
      },
    }),
  ).current;

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.closeBtn} onPress={handleClose}>
          <Text style={modalStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Animated.Image
          source={{uri}}
          style={[
            modalStyles.image,
            {
              transform: [
                {scale},
                {translateX},
                {translateY},
              ],
            },
          ]}
          resizeMode="contain"
          {...panResponder.panHandlers}
        />
        <TouchableOpacity style={modalStyles.resetBtn} onPress={reset}>
          <Text style={modalStyles.resetBtnText}>リセット</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  resetBtn: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
  },
});

const MainScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    selectedImage,
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
    title: 'エラー',
    message: '',
  });

  const [processingAction, setProcessingAction] = useState<'gabigabi' | 'convert' | 'targetSize' | null>(null);

  // #80: selected media type
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);

  // #77: fullscreen modal state
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
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

  // #214: アプリ起動時に一度だけ一時ファイルをクリーンアップする（変換開始時からの移動）
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
        const bytes = info.exists ? (info as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;
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
      const settings = TEMPLATE_SETTINGS[level];
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

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('gabigabi');
    try {
      let resultUri: string;
      let resultBytes: number;

      if (selectedMediaType === 'video') {
        // 動画のガビガビ化
        const result = await processVideoWithFfmpeg(selectedImage, resizePercent, gabigabiLevel ?? 0, videoOutputFormat);
        resultUri = result.outputUri;
        resultBytes = result.outputBytes;
      } else {
      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      const inputBytes = inputInfo.exists ? (inputInfo as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;

      // ガビガビレベル0 かつ フォーマット変換が必要な場合はフォーマット変換のみ
      // ガビガビレベル1以上の場合はガビガビ化（リサイズ+品質劣化）
      // 両方の設定を1回の「変換」で適用する

      if (gabigabiLevel === null || gabigabiLevel === 0) {
        // ガビガビなし → フォーマット変換 + リサイズのみ
        if (resizePercent === 100 && outputFormat === 'jpeg') {
          // 何も変更なし
          Alert.alert('変換不要', '現在の設定では変換の必要がありません。\nガビガビレベルを上げるか、フォーマットやリサイズを変更してください。');
          return;
        }
        if (resizePercent < 100) {
          // リサイズだけ実行（ガビガビレベル0 = 高品質）
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
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        showError('エラー', `変換に失敗しました: ${msg}`);
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
      Alert.alert('権限が必要', 'カメラロールへのアクセスを許可してください');
      return;
    }
    try {
      // createAssetAsync はギャラリーを開かずにメディアストアに登録する
      const asset = await MediaLibrary.createAssetAsync(processedImage);
      showSaveFeedback(`保存完了\n${asset.uri}`);
    } catch (err) {
      showError('エラー', `保存に失敗しました: ${String(err)}`);
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
      showError('エラー', `共有に失敗しました: ${message}`);
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
      Alert.alert('エラー', '有効な目標サイズを入力してください');
      return;
    }
    
    let targetBytes = val;
    if (targetSizeUnit === 'KB') targetBytes *= 1024;
    else if (targetSizeUnit === 'MB') targetBytes *= 1024 * 1024;
    else if (targetSizeUnit === 'GB') targetBytes *= 1024 * 1024 * 1024;
    
    setIsProcessing(true);
    setProcessingAction('targetSize');
    try {
      const result = await compressToTargetSize(selectedImage, targetBytes, videoOutputFormat);
      setProcessedImage(result.outputUri);
      outputBytesRef.current = result.outputBytes;
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        showError('エラー', `指定サイズ圧縮に失敗しました: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleTargetSizeTemplateSelect = (tmpl: typeof TARGET_SIZE_TEMPLATES[0]) => {
    setTargetSizeValue(tmpl.value);
    setTargetSizeUnit(tmpl.unit);
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
          <View style={{flexDirection: 'column', alignItems: 'center', flex: 1, paddingHorizontal: 30}}>
            <Text style={styles.appName} numberOfLines={1} adjustsFontSizeToFit>GabiGabi</Text>
            <Text style={styles.appSubtitle} numberOfLines={1} adjustsFontSizeToFit>画像・動画ガビガビ化&指定サイズ圧縮</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setAboutVisible(true)} 
            style={{position: 'absolute', right: 0, padding: 8}}
          >
            <Text style={{fontSize: 20, color: '#aaa'}}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── About Modal ── */}
      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24}}>
          <View style={{backgroundColor: '#1e1e1e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360}}>
            <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center'}}>GabiGabi</Text>
            <Text style={{color: '#ccc', fontSize: 14, marginBottom: 16, textAlign: 'center'}}>画像・動画ガビガビ化&指定サイズ圧縮</Text>
            <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>画像・動画の変換・圧縮・ガビガビ化ツール</Text>
            <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>ライセンス: GPL v3</Text>
            <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>FFmpeg / FFmpegKit を使用しています</Text>
            <TouchableOpacity onPress={() => { Linking.openURL('https://github.com/eisei-komiya/convert2gabigabi'); }}>
              <Text style={{color: '#4da6ff', fontSize: 14, marginBottom: 16}}>GitHub でソースコードを見る</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAboutVisible(false)} style={{backgroundColor: '#333', borderRadius: 8, padding: 12, alignItems: 'center'}}>
              <Text style={{color: '#fff', fontSize: 16}}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Before / After Preview with Info (#119) ── */}
        <View style={styles.previewRow}>
          <View style={styles.previewColumn}>
            <PreviewCard
              label="BEFORE"
              uri={selectedImage}
              mediaType={selectedMediaType ?? 'image'}
              placeholder={''}
              onPickerPress={handleOpenPicker}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">📄 {fileInfo.name}</Text>
                <Text style={styles.infoText}>{fileInfo.size}</Text>
                {fileInfo.width > 0 && (
                  <Text style={styles.infoText}>{fileInfo.width} × {fileInfo.height} px</Text>
                )}
                <Text style={styles.infoText}>🏷 {(fileInfo.name.split('.').pop() ?? '').toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
          <View style={styles.previewColumn}>
            <PreviewCard
              label="AFTER"
              uri={processedImage}
              mediaType={selectedMediaType === 'video' ? 'video' : 'image'}
              placeholder={selectedImage ? '変換後' : '—'}
              onPickerPress={undefined}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">📄 {processedImage ? processedImage.split('/').pop() : '—'}</Text>
                <Text style={styles.infoText}>{processedImage ? formatBytes(outputBytesRef.current) : '変換後に表示'}</Text>
                <Text style={styles.infoText}>{Math.round(fileInfo.width * resizePercent / 100)} × {Math.round(fileInfo.height * resizePercent / 100)} px</Text>
                <Text style={styles.infoText}>🏷 {processedImage ? (processedImage.split('.').pop()?.toUpperCase() ?? outputFormat.toUpperCase()) : outputFormat.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Convert Method Tabs (#277) ── */}
        <View style={styles.methodTabs}>
          <TouchableOpacity 
            style={[styles.methodTab, convertMethod === 'parameters' && styles.methodTabActive]}
            onPress={() => setConvertMethod('parameters')}>
            <Text style={[styles.methodTabText, convertMethod === 'parameters' && styles.methodTabTextActive]}>パラメータを設定する</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.methodTab, convertMethod === 'targetSize' && styles.methodTabActive]}
            onPress={() => setConvertMethod('targetSize')}>
            <Text style={[styles.methodTabText, convertMethod === 'targetSize' && styles.methodTabTextActive]}>目標サイズを指定する</Text>
          </TouchableOpacity>
        </View>

        {convertMethod === 'parameters' ? (
          <>
            {/* ── Template Section (旧ガビガビレベル) ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>テンプレート</Text>
              <View style={styles.templateBlock}>
                <Text style={styles.templateBlockLabel}>ガビガビレベル</Text>
                <View style={styles.formatRow}>
                  {GABIGABI_LEVELS.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.formatButton,
                        gabigabiLevel === item.value && styles.gabigabiButtonActive,
                      ]}
                      onPress={() => handleTemplateSelect(item.value)}>
                      <Text
                        style={[
                          styles.formatButtonText,
                          gabigabiLevel === item.value && styles.formatButtonTextActive,
                        ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Resize Slider ── */}
            <View style={styles.sliderCard}>
              <ResizeSlider
                value={resizePercent}
                onValueChange={handleResizeChange}
                originalWidth={fileInfo?.width}
                originalHeight={fileInfo?.height}
              />
            </View>

            {/* ── Format Conversion Section ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>出力フォーマット</Text>
              {selectedMediaType !== 'image' && (
                <>
                  {selectedMediaType === null && (
                    <Text style={styles.formatGroupLabel}>🎬 動画</Text>
                  )}
                  <View style={[styles.formatRow, styles.formatRowWrap]}>
                    {VIDEO_FORMAT_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.formatButton,
                          videoOutputFormat === opt.value && styles.formatButtonActive,
                        ]}
                        onPress={() => setVideoOutputFormat(opt.value)}>
                        <Text
                          style={[
                            styles.formatButtonText,
                            videoOutputFormat === opt.value && styles.formatButtonTextActive,
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
                    <Text style={[styles.formatGroupLabel, {marginTop: 12}]}>画像</Text>
                  )}
                  <View style={styles.formatRow}>
                    {FORMAT_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.formatButton,
                          outputFormat === opt.value && styles.formatButtonActive,
                        ]}
                        onPress={() => setOutputFormat(opt.value)}>
                        <Text
                          style={[
                            styles.formatButtonText,
                            outputFormat === opt.value && styles.formatButtonTextActive,
                          ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {selectedMediaType !== 'video' && (outputFormat === 'jpeg' || outputFormat === 'webp') && (
                <View style={styles.qualityRow}>
                  <View style={styles.qualityLabelRow}>
                    <Text style={styles.qualityLabel}>圧縮率</Text>
                    <Text style={styles.qualityValue}>{compressionRate}%</Text>
                  </View>
                  <CustomSlider
                    style={styles.qualitySlider}
                    minimumValue={0}
                    maximumValue={99}
                    step={1}
                    value={compressionRate}
                    onValueChange={(v: number) => handleQualityChange(Math.round(v))}
                    minimumTrackTintColor={ACCENT2}
                    maximumTrackTintColor={BORDER}
                    thumbTintColor={ACCENT2}
                  />
                </View>
              )}
            </View>

            {/* ── Shrink→Expand Section ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>縮小→再拡大</Text>
                <Text style={styles.sectionHint}>画像を一度縮小して元サイズに戻す。{'\n'}引き伸ばしでブロックノイズが増幅されガビガビに</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>ON/OFF</Text>
                <Switch
                  value={shrinkExpandEnabled}
                  onValueChange={handleShrinkExpandToggle}
                  trackColor={{false: BORDER, true: ACCENT}}
                  thumbColor={shrinkExpandEnabled ? '#fff' : '#888'}
                />
              </View>
              {shrinkExpandEnabled && (
                <View style={styles.qualityRow}>
                  <View style={styles.qualityLabelRow}>
                    <Text style={styles.qualityLabel}>縮小率</Text>
                    <Text style={styles.qualityValue}>{shrinkExpandRate}%</Text>
                  </View>
                  <CustomSlider
                    style={styles.qualitySlider}
                    minimumValue={10}
                    maximumValue={90}
                    step={1}
                    value={shrinkExpandRate}
                    onValueChange={handleShrinkExpandRateChange}
                    minimumTrackTintColor={ACCENT}
                    maximumTrackTintColor={BORDER}
                    thumbTintColor={ACCENT}
                  />
                </View>
              )}
            </View>

            {/* ── Multi-Compress Section ── */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>多重圧縮</Text>
                <Text style={styles.sectionHint}>JPEG圧縮を繰り返すほど劣化が蓄積。{'\n'}回数が多いほどガビガビに</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>ON/OFF</Text>
                <Switch
                  value={multiCompressEnabled}
                  onValueChange={handleMultiCompressToggle}
                  trackColor={{false: BORDER, true: ACCENT}}
                  thumbColor={multiCompressEnabled ? '#fff' : '#888'}
                />
              </View>
              {multiCompressEnabled && (
                <View style={styles.qualityRow}>
                  <View style={styles.qualityLabelRow}>
                    <Text style={styles.qualityLabel}>圧縮回数</Text>
                    <Text style={styles.qualityValue}>{multiCompressCount}回</Text>
                  </View>
                  <CustomSlider
                    style={styles.qualitySlider}
                    minimumValue={1}
                    maximumValue={10}
                    step={1}
                    value={multiCompressCount}
                    onValueChange={handleMultiCompressCountChange}
                    minimumTrackTintColor={ACCENT}
                    maximumTrackTintColor={BORDER}
                    thumbTintColor={ACCENT}
                  />
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* ── Target Size Settings (#277) ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>目標サイズ設定</Text>
              <View style={styles.targetSizeInputRow}>
                <TextInput
                  style={styles.targetSizeInput}
                  value={targetSizeValue}
                  onChangeText={setTargetSizeValue}
                  keyboardType="numeric"
                  placeholder="0.0"
                  placeholderTextColor="#666"
                />
                <View style={styles.unitButtons}>
                  {(['KB', 'MB', 'GB'] as SizeUnit[]).map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitButton, targetSizeUnit === u && styles.unitButtonActive]}
                      onPress={() => setTargetSizeUnit(u)}>
                      <Text style={[styles.unitButtonText, targetSizeUnit === u && styles.unitButtonTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>テンプレート</Text>
              <View style={styles.targetSizeTemplates}>
                {TARGET_SIZE_TEMPLATES.map(tmpl => (
                  <TouchableOpacity
                    key={tmpl.label}
                    style={styles.targetSizeTemplate}
                    onPress={() => handleTargetSizeTemplateSelect(tmpl)}>
                    <Text style={styles.targetSizeTemplateText}>{tmpl.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={{color: '#666', fontSize: 12, marginTop: 16, lineHeight: 18}}>
                ※目標サイズに収まるように品質・ビットレートを自動調整します。画像の場合はJPEGに変換されます。
              </Text>
            </View>
          </>
        )}


        {(selectedImage || processedImage) && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}>
            <Text style={styles.resetButtonText}>リセット</Text>
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
            <Text style={styles.cancelButtonText}>⛔ キャンセル</Text>
          </TouchableOpacity>
        )}

        {/* Save / Share Buttons after conversion */}
        {processedImage && !isProcessing && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>カメラロールに保存</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton]}
              onPress={handleShare}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>🔗 共有</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main action buttons */}
        {convertMethod === 'parameters' ? (
          <TouchableOpacity
            style={[styles.processButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleProcess}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}>
            {isProcessing && processingAction === 'gabigabi' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> 処理中...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>変換</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.targetSizeProcessButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleTargetSizeProcess}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}>
            {isProcessing && processingAction === 'targetSize' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> 処理中...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>指定サイズ以下に圧縮</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

/* ── Inline sub-component: preview card ── */
interface PreviewCardProps {
  label: string;
  uri: string | null;
  mediaType?: 'image' | 'video';
  placeholder: string;
  onPickerPress?: () => void;
  onImagePress?: (uri: string | null) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({label, uri, mediaType = 'image', placeholder, onImagePress, onPickerPress}) => (
  <View style={styles.previewCard}>
    <View style={styles.previewLabelRow}>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
    {uri ? (
      mediaType === 'video' ? (
        <View style={[styles.previewEmpty, styles.videoPreview]}>
          <Text style={styles.videoPreviewIcon}>🎬</Text>
          <Text style={styles.videoPreviewText}>動画</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => onPickerPress ? onPickerPress() : onImagePress?.(uri)} activeOpacity={0.85}>
          <Image source={{uri}} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.svgOverlay}>
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
          <View style={styles.previewTapHint}>
            <Text style={styles.previewTapHintText}>🔍 タップで拡大</Text>
          </View>
        </TouchableOpacity>
      )
    ) : (
      <TouchableOpacity onPress={onPickerPress} activeOpacity={0.7} style={styles.previewEmptyTouchable}>
        <Text style={styles.previewEmptyIcon}>＋</Text>
        <Text style={styles.previewEmptyText}>{placeholder || '画像 / 動画を選択'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* ── Styles ── */
const DARK_BG = '#0d0d0d';
const CARD_BG = '#1a1a1a';
const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';

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
  infoBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    gap: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#aaa',
  },
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
  changeButtonContainer: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  changeButtonText: {
    color: '#eee',
    fontSize: 12,
    fontWeight: 'bold',
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
  previewEmptyText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
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

  /* size row */
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sizeSeparator: {
    color: ACCENT2,
    fontSize: 18,
    fontWeight: '700',
  },

  /* slider card */
  sliderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },

  /* format section */
  sectionContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
    lineHeight: 14,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatRowWrap: {
    flexWrap: 'wrap',
  },
  templateBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  templateBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  formatGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#222',
  },
  formatButtonActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  gabigabiButtonActive: {
    borderColor: '#ff9800',
    backgroundColor: '#ff9800',
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  formatButtonTextActive: {
    color: '#fff',
  },
  qualityRow: {
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  qualityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  qualityLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qualityValue: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT2,
  },
  qualitySlider: {
    width: '100%',
    height: 40,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityPreset: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#222',
  },
  qualityPresetActive: {
    borderColor: ACCENT2,
    backgroundColor: ACCENT2,
  },
  qualityPresetText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  qualityPresetTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  /* target size settings */
  targetSizeInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  targetSizeInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unitButtons: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  unitButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitButtonActive: {
    backgroundColor: '#444',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  targetSizeTemplates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetSizeTemplate: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  targetSizeTemplateText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
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
  convertButton: {
    flex: 1,
    backgroundColor: ACCENT2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT2,
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

  /* file info (#97) */
  fileInfoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  fileInfoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  fileInfoText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },

  /* video preview (#80) */
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

export default MainScreen;
