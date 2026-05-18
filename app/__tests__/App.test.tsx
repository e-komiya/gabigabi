/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
  usePermissions: jest.fn().mockReturnValue([{granted: true}, jest.fn()]),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {All: 'All'},
}));

jest.mock('expo-file-system/legacy', () => ({
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({exists: false}),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  documentDirectory: '/mock/',
  cacheDirectory: '/mock/cache/',
}));

jest.mock('react-native-share', () => ({
  default: {open: jest.fn()},
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn(),
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
}));

jest.mock('@react-navigation/native', () => {
  const mockReact = require('react');
  return {
    NavigationContainer: ({children}: {children: mockReact.ReactNode}) =>
      children,
    useNavigation: jest.fn(),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}: {children: any}) => children,
    Screen: () => null,
  }),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
