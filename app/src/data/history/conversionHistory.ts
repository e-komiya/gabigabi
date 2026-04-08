import AsyncStorage from '@react-native-async-storage/async-storage';
import {ImageFormat} from '../../domain/convertImage';
import {VideoFormat} from '../../state/store';

const STORAGE_KEY = 'conversion-history-v1';
const MAX_ITEMS = 50;

export type ConversionAction = 'gabigabi' | 'convert' | 'targetSize';

export interface ConversionHistoryItem {
  id: string;
  createdAt: string;
  inputPath: string;
  outputPath: string;
  inputBytes: number;
  outputBytes: number;
  mediaType: 'image' | 'video';
  params: {
    action: ConversionAction;
    outputFormat?: ImageFormat;
    videoOutputFormat?: VideoFormat;
    gabigabiLevel?: number | null;
    resizePercent?: number;
    compressionRate?: number;
    targetBytes?: number;
  };
}

export async function getConversionHistory(): Promise<ConversionHistoryItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ConversionHistoryItem[];
  } catch {
    return [];
  }
}

export async function saveConversionHistoryItem(item: ConversionHistoryItem): Promise<void> {
  const current = await getConversionHistory();
  const next = [item, ...current].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
