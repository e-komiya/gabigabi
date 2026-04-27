/**
 * useAppStore (Zustand store) のユニットテスト
 * Issue #85
 */

// AsyncStorage をモック
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// zustand/middleware の persist をモック（テスト時は永続化なし）
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (fn: unknown) => fn,
    createJSONStorage: actual.createJSONStorage,
  };
});

import {useAppStore} from '../state/store';

describe('useAppStore', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useAppStore.setState({
      selectedImage: null,
      selectedMediaType: null,
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
    });
  });

  describe('デフォルト値', () => {
    it('selectedImage のデフォルト値は null', () => {
      expect(useAppStore.getState().selectedImage).toBeNull();
    });

    it('selectedMediaType のデフォルト値は null', () => {
      expect(useAppStore.getState().selectedMediaType).toBeNull();
    });

    it('resizePercent のデフォルト値は 100', () => {
      expect(useAppStore.getState().resizePercent).toBe(100);
    });

    it('processedImage のデフォルト値は null', () => {
      expect(useAppStore.getState().processedImage).toBeNull();
    });

    it('isProcessing のデフォルト値は false', () => {
      expect(useAppStore.getState().isProcessing).toBe(false);
    });

    it('outputFormat のデフォルト値は "jpeg"', () => {
      expect(useAppStore.getState().outputFormat).toBe('jpeg');
    });

    it('compressionRate のデフォルト値は 0', () => {
      expect(useAppStore.getState().compressionRate).toBe(0);
    });

    it('gabigabiLevel のデフォルト値は null', () => {
      expect(useAppStore.getState().gabigabiLevel).toBeNull();
    });

    it('videoOutputFormat のデフォルト値は "mp4"', () => {
      expect(useAppStore.getState().videoOutputFormat).toBe('mp4');
    });

    it('shrinkExpandEnabled のデフォルト値は false', () => {
      expect(useAppStore.getState().shrinkExpandEnabled).toBe(false);
    });

    it('shrinkExpandRate のデフォルト値は 50', () => {
      expect(useAppStore.getState().shrinkExpandRate).toBe(50);
    });

    it('multiCompressEnabled のデフォルト値は false', () => {
      expect(useAppStore.getState().multiCompressEnabled).toBe(false);
    });

    it('multiCompressCount のデフォルト値は 3', () => {
      expect(useAppStore.getState().multiCompressCount).toBe(3);
    });

    it('convertMethod のデフォルト値は "parameters"', () => {
      expect(useAppStore.getState().convertMethod).toBe('parameters');
    });

    it('targetSizeValue のデフォルト値は "10"', () => {
      expect(useAppStore.getState().targetSizeValue).toBe('10');
    });

    it('targetSizeUnit のデフォルト値は "MB"', () => {
      expect(useAppStore.getState().targetSizeUnit).toBe('MB');
    });
  });

  describe('setSelectedImage', () => {
    it('selectedImage を正しく更新する', () => {
      useAppStore.getState().setSelectedImage('file:///image.jpg');
      expect(useAppStore.getState().selectedImage).toBe('file:///image.jpg');
    });

    it('null をセットできる', () => {
      useAppStore.getState().setSelectedImage('file:///image.jpg');
      useAppStore.getState().setSelectedImage(null);
      expect(useAppStore.getState().selectedImage).toBeNull();
    });
  });

  describe('setSelectedMediaType', () => {
    it('"image" をセットできる', () => {
      useAppStore.getState().setSelectedMediaType('image');
      expect(useAppStore.getState().selectedMediaType).toBe('image');
    });

    it('"video" をセットできる', () => {
      useAppStore.getState().setSelectedMediaType('video');
      expect(useAppStore.getState().selectedMediaType).toBe('video');
    });

    it('null をセットできる', () => {
      useAppStore.getState().setSelectedMediaType('image');
      useAppStore.getState().setSelectedMediaType(null);
      expect(useAppStore.getState().selectedMediaType).toBeNull();
    });
  });

  describe('setResizePercent', () => {
    it('resizePercent を正しく更新する', () => {
      useAppStore.getState().setResizePercent(75);
      expect(useAppStore.getState().resizePercent).toBe(75);
    });
  });

  describe('setProcessedImage', () => {
    it('processedImage を正しく更新する', () => {
      useAppStore.getState().setProcessedImage('file:///output.jpg');
      expect(useAppStore.getState().processedImage).toBe('file:///output.jpg');
    });

    it('null をセットできる', () => {
      useAppStore.getState().setProcessedImage('file:///output.jpg');
      useAppStore.getState().setProcessedImage(null);
      expect(useAppStore.getState().processedImage).toBeNull();
    });
  });

  describe('setIsProcessing', () => {
    it('isProcessing を true に更新する', () => {
      useAppStore.getState().setIsProcessing(true);
      expect(useAppStore.getState().isProcessing).toBe(true);
    });

    it('isProcessing を false に更新する', () => {
      useAppStore.getState().setIsProcessing(true);
      useAppStore.getState().setIsProcessing(false);
      expect(useAppStore.getState().isProcessing).toBe(false);
    });
  });

  describe('setOutputFormat', () => {
    it('"png" をセットできる', () => {
      useAppStore.getState().setOutputFormat('png');
      expect(useAppStore.getState().outputFormat).toBe('png');
    });

    it('"jpeg" をセットできる', () => {
      useAppStore.getState().setOutputFormat('png');
      useAppStore.getState().setOutputFormat('jpeg');
      expect(useAppStore.getState().outputFormat).toBe('jpeg');
    });
  });

  describe('setCompressionRate', () => {
    it('compressionRate を正しく更新する', () => {
      useAppStore.getState().setCompressionRate(80);
      expect(useAppStore.getState().compressionRate).toBe(80);
    });
  });

  describe('setGabigabiLevel', () => {
    it('gabigabiLevel を正しく更新する', () => {
      useAppStore.getState().setGabigabiLevel(3);
      expect(useAppStore.getState().gabigabiLevel).toBe(3);
    });

    it('null をセットできる', () => {
      useAppStore.getState().setGabigabiLevel(3);
      useAppStore.getState().setGabigabiLevel(null);
      expect(useAppStore.getState().gabigabiLevel).toBeNull();
    });
  });

  describe('setVideoOutputFormat', () => {
    it('"mov" をセットできる', () => {
      useAppStore.getState().setVideoOutputFormat('mov');
      expect(useAppStore.getState().videoOutputFormat).toBe('mov');
    });

    it('"mkv" をセットできる', () => {
      useAppStore.getState().setVideoOutputFormat('mkv');
      expect(useAppStore.getState().videoOutputFormat).toBe('mkv');
    });
  });

  describe('setShrinkExpandEnabled', () => {
    it('shrinkExpandEnabled を true に更新する', () => {
      useAppStore.getState().setShrinkExpandEnabled(true);
      expect(useAppStore.getState().shrinkExpandEnabled).toBe(true);
    });
  });

  describe('setShrinkExpandRate', () => {
    it('shrinkExpandRate を正しく更新する', () => {
      useAppStore.getState().setShrinkExpandRate(25);
      expect(useAppStore.getState().shrinkExpandRate).toBe(25);
    });
  });

  describe('setMultiCompressEnabled', () => {
    it('multiCompressEnabled を true に更新する', () => {
      useAppStore.getState().setMultiCompressEnabled(true);
      expect(useAppStore.getState().multiCompressEnabled).toBe(true);
    });
  });

  describe('setMultiCompressCount', () => {
    it('multiCompressCount を正しく更新する', () => {
      useAppStore.getState().setMultiCompressCount(5);
      expect(useAppStore.getState().multiCompressCount).toBe(5);
    });
  });

  describe('setConvertMethod', () => {
    it('"targetSize" をセットできる', () => {
      useAppStore.getState().setConvertMethod('targetSize');
      expect(useAppStore.getState().convertMethod).toBe('targetSize');
    });

    it('"parameters" をセットできる', () => {
      useAppStore.getState().setConvertMethod('targetSize');
      useAppStore.getState().setConvertMethod('parameters');
      expect(useAppStore.getState().convertMethod).toBe('parameters');
    });
  });

  describe('setTargetSizeValue', () => {
    it('targetSizeValue を正しく更新する', () => {
      useAppStore.getState().setTargetSizeValue('25');
      expect(useAppStore.getState().targetSizeValue).toBe('25');
    });
  });

  describe('setTargetSizeUnit', () => {
    it('"KB" をセットできる', () => {
      useAppStore.getState().setTargetSizeUnit('KB');
      expect(useAppStore.getState().targetSizeUnit).toBe('KB');
    });

    it('"GB" をセットできる', () => {
      useAppStore.getState().setTargetSizeUnit('GB');
      expect(useAppStore.getState().targetSizeUnit).toBe('GB');
    });
  });

  describe('他のstateへの影響なし', () => {
    it('setSelectedImage は他の state を変更しない', () => {
      const before = {...useAppStore.getState()};
      useAppStore.getState().setSelectedImage('file:///new.jpg');
      const after = useAppStore.getState();
      expect(after.resizePercent).toBe(before.resizePercent);
      expect(after.outputFormat).toBe(before.outputFormat);
      expect(after.isProcessing).toBe(before.isProcessing);
    });
  });
});
