module.exports = {
  testTimeout: 15000,
  setupFiles: ['./jest.setup.js'],
  projects: [
    {
      displayName: 'unit',
      preset: 'react-native',
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo(-[a-z-]+)?|@expo|expo-modules-core|@testing-library|@react-navigation|ffmpeg-kit-react-native|react-native-svg|react-native-share|react-native-safe-area-context)/)',
      ],
      testMatch: [
        '<rootDir>/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
      ],
      moduleNameMapper: {
        '^expo-notifications$': '<rootDir>/src/__mocks__/expo-notifications.js',
        '^expo-sharing$': '<rootDir>/src/__mocks__/expo-sharing.js',
        '^expo-video-thumbnails$':
          '<rootDir>/src/__mocks__/expo-video-thumbnails.js',
        '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.js',
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/integration.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'babel-jest',
      },
    },
  ],
};
