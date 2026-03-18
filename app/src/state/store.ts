import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {ImageFormat} from '../domain/convertImage';

export type VideoFormat = 'mp4' | 'mov' | 'mkv' | 'webm';
export type ConvertMethod = 'parameters' | 'targetSize';
export type SizeUnit = 'KB' | 'MB' | 'GB';

interface AppState {
  selectedImage: string | null;
  resizePercent: number;
  processedImage: string | null;
  isProcessing: boolean;
  outputFormat: ImageFormat;
  compressionRate: number;
  gabigabiLevel: number | null;
  videoOutputFormat: VideoFormat;
  shrinkExpandEnabled: boolean;
  shrinkExpandRate: number;
  multiCompressEnabled: boolean;
  multiCompressCount: number;
  // #277 additions
  convertMethod: ConvertMethod;
  targetSizeValue: string;
  targetSizeUnit: SizeUnit;

  setSelectedImage: (image: string | null) => void;
  setResizePercent: (percent: number) => void;
  setProcessedImage: (image: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setOutputFormat: (format: ImageFormat) => void;
  setCompressionRate: (rate: number) => void;
  setGabigabiLevel: (level: number | null) => void;
  setVideoOutputFormat: (format: VideoFormat) => void;
  setShrinkExpandEnabled: (enabled: boolean) => void;
  setShrinkExpandRate: (rate: number) => void;
  setMultiCompressEnabled: (enabled: boolean) => void;
  setMultiCompressCount: (count: number) => void;
  // #277 setters
  setConvertMethod: (method: ConvertMethod) => void;
  setTargetSizeValue: (value: string) => void;
  setTargetSizeUnit: (unit: SizeUnit) => void;
}

const initialState = {
  selectedImage: null,
  resizePercent: 100,
  processedImage: null,
  isProcessing: false,
  outputFormat: 'jpeg' as ImageFormat,
  compressionRate: 0,
  gabigabiLevel: null,
  videoOutputFormat: 'mp4' as VideoFormat,
  shrinkExpandEnabled: false,
  shrinkExpandRate: 50,
  multiCompressEnabled: false,
  multiCompressCount: 3,
  convertMethod: 'parameters' as ConvertMethod,
  targetSizeValue: '10',
  targetSizeUnit: 'MB' as SizeUnit,
};

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      ...initialState,

      setSelectedImage: image => set({selectedImage: image}),
      setResizePercent: percent => set({resizePercent: percent}),
      setProcessedImage: image => set({processedImage: image}),
      setIsProcessing: processing => set({isProcessing: processing}),
      setOutputFormat: format => set({outputFormat: format}),
      setCompressionRate: rate => set({compressionRate: rate}),
      setGabigabiLevel: level => set({gabigabiLevel: level}),
      setVideoOutputFormat: format => set({videoOutputFormat: format}),
      setShrinkExpandEnabled: enabled => set({shrinkExpandEnabled: enabled}),
      setShrinkExpandRate: rate => set({shrinkExpandRate: rate}),
      setMultiCompressEnabled: enabled => set({multiCompressEnabled: enabled}),
      setMultiCompressCount: count => set({multiCompressCount: count}),
      setConvertMethod: method => set({convertMethod: method}),
      setTargetSizeValue: value => set({targetSizeValue: value}),
      setTargetSizeUnit: unit => set({targetSizeUnit: unit}),
    }),
    {
      name: 'gabigabi-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        outputFormat: state.outputFormat,
        compressionRate: state.compressionRate,
        gabigabiLevel: state.gabigabiLevel,
        videoOutputFormat: state.videoOutputFormat,
        shrinkExpandEnabled: state.shrinkExpandEnabled,
        shrinkExpandRate: state.shrinkExpandRate,
        multiCompressEnabled: state.multiCompressEnabled,
        multiCompressCount: state.multiCompressCount,
        convertMethod: state.convertMethod,
        targetSizeValue: state.targetSizeValue,
        targetSizeUnit: state.targetSizeUnit,
      }),
    },
  ),
);
