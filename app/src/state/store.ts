import {create} from 'zustand';
import { ImageFormat } from '../domain/convertImage';

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

export const useAppStore = create<AppState>(set => ({
  selectedImage: null,
  resizePercent: 100,
  processedImage: null,
  isProcessing: false,
  outputFormat: 'jpeg',
  compressionRate: 0,
  gabigabiLevel: null,
  videoOutputFormat: 'mp4',
  shrinkExpandEnabled: false,
  shrinkExpandRate: 50,
  multiCompressEnabled: false,
  multiCompressCount: 3,
  convertMethod: 'parameters',
  targetSizeValue: '10',
  targetSizeUnit: 'MB',
  
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
}));
