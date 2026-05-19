/**
 * @format
 * @jest-environment node
 */

import React from 'react';

// ネイティブモジュールのモック（jest.mock はホイスティングが必要なため test ファイルに記述）
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  EventEmitter: class EventEmitter {
    addListener() { return {remove: () => {}}; }
    removeListener() {}
    emit() {}
    removeAllListeners() {}
    listenerCount() { return 0; }
  },
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => null),
  SharedObject: class SharedObject {},
}));

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

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: jest.fn().mockResolvedValue({
      getReturnCode: jest.fn().mockResolvedValue({
        isValueSuccess: jest.fn().mockReturnValue(true),
      }),
    }),
    executeAsync: jest.fn().mockResolvedValue({}),
    cancel: jest.fn(),
    cancelSession: jest.fn(),
    listSessions: jest.fn().mockResolvedValue([]),
  },
  FFmpegKitConfig: {
    enableLogCallback: jest.fn(),
    enableStatisticsCallback: jest.fn(),
    setLogLevel: jest.fn(),
    resetStatistics: jest.fn(),
  },
  ReturnCode: {
    isSuccess: jest.fn().mockReturnValue(true),
    isCancel: jest.fn().mockReturnValue(false),
    SUCCESS: 0,
  },
  LogLevel: {INFO: 0, AV_LOG_STDERR: 16},
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  MediaType: {video: 'video', photo: 'photo'},
  createAlbumAsync: jest.fn().mockResolvedValue({}),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({canceled: true, assets: []}),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  MediaTypeOptions: {All: 'All', Images: 'Images', Videos: 'Videos'},
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue({success: true}),
    shareSingle: jest.fn().mockResolvedValue({success: true}),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = {top: 0, bottom: 0, left: 0, right: 0};
  const frame = {x: 0, y: 0, width: 375, height: 812};
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    useSafeAreaInsets: jest.fn().mockReturnValue(insets),
    useSafeAreaFrame: jest.fn().mockReturnValue(frame),
    SafeAreaProvider: ({children, initialMetrics}: any) => {
      return React.createElement(
        SafeAreaInsetsContext.Provider,
        {value: insets},
        React.createElement(SafeAreaFrameContext.Provider, {value: frame}, children),
      );
    },
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    SafeAreaView: ({children}: any) => children,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    initialWindowMetrics: {frame, insets},
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
}));

import {render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import App from '../App';

describe('App', () => {
  it('renders correctly', () => {
    const {toJSON} = render(
      <SafeAreaProvider>
        <App />
      </SafeAreaProvider>
    );
    expect(toJSON()).not.toBeNull();
  });
});
