import { t } from '../i18n';

// We need to test the module. Since `isJapanese` is determined at module load time
// based on Intl.DateTimeFormat locale, we test the t() function behavior.

describe('i18n', () => {
  describe('t() function', () => {
    it('全104キーに対してt()が空文字列を返さないこと', () => {
      const keys: Parameters<typeof t>[0][] = [
        'error',
        'copy',
        'copied',
        'close',
        'permissionRequired',
        'galleryPermissionMessage',
        'pickImageOrVideo',
        'changeImage',
        'changeVideo',
        'tapToOpenGallery',
        'resizePercentTab',
        'resizeResolutionTab',
        'resizeScale',
        'resizeScaleSliderLabel',
        'resizeScaleSliderHint',
        'width',
        'height',
        'reset',
        'previewImage',
        'noConversionNeededTitle',
        'noConversionNeededMessage',
        'convertFailed',
        'saveSuccess',
        'saveFailed',
        'shareFailed',
        'invalidTargetSize',
        'targetCompressionFailed',
        'appSubtitle',
        'appDescription',
        'license',
        'ffmpegUsage',
        'viewSourceOnGitHub',
        'converted',
        'before',
        'after',
        'notifyStarted',
        'notifyInputAnalyzed',
        'notifyVideoProcessing',
        'notifyImageProcessing',
        'notifyCompleted',
        'notifyFailed',
        'notifyCompressStarted',
        'notifyCompressProcessing',
        'notifyCompressCompleted',
        'notifyCompressFailed',
        'showAfterConversion',
        'setParameters',
        'setTargetSize',
        'aboutButton',
        'template',
        'gabigabiLevel',
        'outputFormat',
        'video',
        'image',
        'outputFormatAccessibility',
        'compressionRate',
        'videoCompressionSlider',
        'imageCompressionSlider',
        'videoCompressionSliderHint',
        'imageCompressionSliderHint',
        'shrinkExpand',
        'shrinkExpandHint',
        'shrinkRate',
        'shrinkRateSlider',
        'shrinkRateSliderHint',
        'multiCompress',
        'multiCompressHint',
        'compressCount',
        'timesSuffix',
        'multiCompressSlider',
        'multiCompressSliderHint',
        'targetSizeSettings',
        'targetSizeNote',
        'saveToCameraRoll',
        'share',
        'runGabigabi',
        'processing',
        'compressUnderTargetSize',
        'tapToZoom',
        'selectImageOrVideo',
        'conversionHistoryTitle',
        'conversionHistoryButton',
        'noHistory',
        'clearHistoryTitle',
        'clearHistoryMessage',
        'clearHistoryConfirm',
        'fileNotFound',
        'deleteHistoryItemTitle',
        'deleteHistoryItemMessage',
        'deleteHistoryItemConfirm',
        'cancel',
        'actionGabigabi',
        'actionConvert',
        'actionTargetSize',
        'shareHistoryItem',
        'filterAll',
        'gifFps',
        'gifFpsSlider',
        'gifScale',
        'gifScaleSlider',
        'targetSizeNotReachedPrefix',
        'targetSizeNotReachedMiddle',
        'targetSizeNotReachedSuffix',
      ];

      expect(keys).toHaveLength(103);

      for (const key of keys) {
        const result = t(key);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('t()が文字列を返すこと', () => {
      const result = t('error');
      expect(typeof result).toBe('string');
    });

    it('ロケールに応じてja/enのいずれかを返すこと', () => {
      const result = t('error');
      // Either Japanese or English value
      expect(['エラー', 'Error']).toContain(result);
    });

    it('copy キーが正しい値を持つこと', () => {
      const result = t('copy');
      expect(['コピー', 'Copy']).toContain(result);
    });

    it('cancel キーが正しい値を持つこと', () => {
      const result = t('cancel');
      expect(['キャンセル', 'Cancel']).toContain(result);
    });

    it('saveSuccess キーが正しい値を持つこと', () => {
      const result = t('saveSuccess');
      expect(['保存完了', 'Saved']).toContain(result);
    });

    it('processing キーが正しい値を持つこと', () => {
      const result = t('processing');
      expect(['処理中...', 'Processing...']).toContain(result);
    });
  });

  describe('TypeScript型安全性', () => {
    it('t()の引数がkeyof typeof DICTの型に制約されていること（コンパイルで保証）', () => {
      // TypeScriptのコンパイルが通ることで型安全性を確認する
      // 存在するキーを渡してエラーが出ないことを確認
      expect(() => t('error')).not.toThrow();
      expect(() => t('cancel')).not.toThrow();
      expect(() => t('copy')).not.toThrow();
    });
  });
});
