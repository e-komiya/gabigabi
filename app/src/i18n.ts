const locale = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? 'ja';
const isJapanese = locale.startsWith('ja');

type Dict = Record<string, {ja: string; en: string}>;

const DICT: Dict = {
  error: {ja: 'エラー', en: 'Error'},
  copy: {ja: 'コピー', en: 'Copy'},
  copied: {ja: 'コピー済み ✓', en: 'Copied ✓'},
  close: {ja: '閉じる', en: 'Close'},
  permissionRequired: {ja: '権限が必要', en: 'Permission required'},
  galleryPermissionMessage: {ja: 'ギャラリーへのアクセスを許可してください', en: 'Please allow gallery access.'},
  pickImageOrVideo: {ja: '画像 / 動画を選択する', en: 'Select image / video'},
  changeImage: {ja: '画像を変更する', en: 'Change image'},
  changeVideo: {ja: '動画を変更する', en: 'Change video'},
  tapToOpenGallery: {ja: 'タップしてギャラリーを開く', en: 'Tap to open gallery'},
  resizePercentTab: {ja: '% 指定', en: '%'},
  resizeResolutionTab: {ja: '解像度指定', en: 'Resolution'},
  resizeScale: {ja: 'リサイズ倍率', en: 'Resize scale'},
  resizeScaleSliderLabel: {ja: 'リサイズ倍率スライダー', en: 'Resize scale slider'},
  resizeScaleSliderHint: {ja: '1%から100%の範囲で画像サイズを変更します', en: 'Adjust image size from 1% to 100%.'},
  width: {ja: '幅', en: 'Width'},
  height: {ja: '高さ', en: 'Height'},
};

export const t = (key: keyof typeof DICT): string => {
  const item = DICT[key];
  return isJapanese ? item.ja : item.en;
};
