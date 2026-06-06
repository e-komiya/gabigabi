import { FFprobeKit } from 'ffmpeg-kit-react-native';
import { useEffect, useState } from 'react';
import { Image } from 'react-native';

import { getFileSizeBytes } from '../data/ffmpeg/ffmpegUtils';

export interface FileInfo {
  name: string;
  size: string;
  width: number;
  height: number;
}

export const useFileInfo = (
  selectedImage: string | null,
  selectedMediaType: 'image' | 'video' | null,
) => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setFileInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bytes = getFileSizeBytes(selectedImage);
        const sizeStr =
          bytes >= 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
            : `${(bytes / 1024).toFixed(1)} KB`;
        const name = selectedImage.split('/').pop() ?? '';

        if (selectedMediaType === 'video') {
          try {
            const session = await FFprobeKit.execute(
              `-v quiet -print_format json -show_streams "${selectedImage}"`,
            );
            const output = await session.getOutput();
            let width = 0;
            let height = 0;
            try {
              const streams = JSON.parse(output ?? '{}').streams ?? [];
              const videoStream = streams.find(
                (s: { codec_type: string }) => s.codec_type === 'video',
              );
              if (videoStream) {
                width = videoStream.width ?? 0;
                height = videoStream.height ?? 0;
              }
            } catch {
              // JSON parse失敗時はwidth/height=0のまま
            }
            if (!cancelled) setFileInfo({ name, size: sizeStr, width, height });
          } catch {
            if (!cancelled)
              setFileInfo({ name, size: sizeStr, width: 0, height: 0 });
          }
        } else {
          Image.getSize(
            selectedImage,
            (width, height) => {
              if (!cancelled)
                setFileInfo({ name, size: sizeStr, width, height });
            },
            () => {
              if (!cancelled)
                setFileInfo({ name, size: sizeStr, width: 0, height: 0 });
            },
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedImage, selectedMediaType]);

  return { fileInfo };
};
