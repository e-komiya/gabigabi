// globalThis.expo のモック（expo-modules-core の EventEmitter 等に必要）
if (!globalThis.expo) {
  globalThis.expo = {
    EventEmitter: class EventEmitter {
      addListener() { return {remove: () => {}}; }
      removeListener() {}
      emit() {}
      removeAllListeners() {}
    },
    modules: {},
    NativeModulesProxy: {},
  };
}

// expo-file-system モック
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  getInfoAsync: jest.fn().mockResolvedValue({exists: false, isDirectory: false}),
  downloadAsync: jest.fn().mockResolvedValue({uri: '', status: 200}),
  EncodingType: {UTF8: 'utf8', Base64: 'base64'},
}));

// expo-file-system/legacy モック
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  getInfoAsync: jest.fn().mockResolvedValue({exists: false, isDirectory: false}),
  downloadAsync: jest.fn().mockResolvedValue({uri: '', status: 200}),
  EncodingType: {UTF8: 'utf8', Base64: 'base64'},
}));

// expo-modules-core モック
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  EventEmitter: class EventEmitter {
    addListener() { return {remove: () => {}}; }
    removeListener() {}
    emit() {}
    removeAllListeners() {}
  },
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => null),
}));

// ffmpeg-kit-react-native モック
jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: jest.fn().mockResolvedValue({getReturnCode: jest.fn().mockResolvedValue({isValueSuccess: jest.fn().mockReturnValue(true)})}),
    executeAsync: jest.fn().mockResolvedValue({}),
    cancel: jest.fn(),
  },
  FFmpegKitConfig: {
    enableLogCallback: jest.fn(),
    enableStatisticsCallback: jest.fn(),
    setLogLevel: jest.fn(),
  },
  ReturnCode: {
    isSuccess: jest.fn().mockReturnValue(true),
    isCancel: jest.fn().mockReturnValue(false),
    SUCCESS: 0,
  },
  LogLevel: {INFO: 0, AV_LOG_STDERR: 16},
  Session: {},
}));

// expo-media-library モック
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  MediaType: {video: 'video', photo: 'photo'},
}));

// expo-image-picker モック
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({canceled: true, assets: []}),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  MediaTypeOptions: {All: 'All', Images: 'Images', Videos: 'Videos'},
}));

// expo-clipboard モック
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

// react-native-share モック
jest.mock('react-native-share', () => ({
  default: {
    open: jest.fn().mockResolvedValue({success: true}),
    shareSingle: jest.fn().mockResolvedValue({success: true}),
  },
}));

// react-native-safe-area-context モック
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: ({children}) => children,
}));
