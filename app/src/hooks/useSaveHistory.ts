import {useCallback} from 'react';
import {saveConversionHistoryItem, ConversionAction} from '../data/history/conversionHistory';
import {ImageFormat} from '../domain/convertImage';

interface UseSaveHistoryOptions {
  selectedMediaType: 'image' | 'video' | null;
  outputFormat: ImageFormat | string;
  videoOutputFormat: string;
  gabigabiLevel: number | null;
  resizePercent: number;
  compressionRate: number;
}

export const useSaveHistory = ({
  selectedMediaType,
  outputFormat,
  videoOutputFormat,
  gabigabiLevel,
  resizePercent,
  compressionRate,
}: UseSaveHistoryOptions) => {
  const saveHistory = useCallback(
    async (
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
    },
    [
      selectedMediaType,
      outputFormat,
      videoOutputFormat,
      gabigabiLevel,
      resizePercent,
      compressionRate,
    ],
  );

  return {saveHistory};
};
