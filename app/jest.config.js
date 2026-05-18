module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'react-native',
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|expo-notifications|expo-modules-core|expo-image-picker|expo-media-library|expo-file-system|expo-clipboard|react-native-svg|react-native-share|react-native-safe-area-context|@testing-library|@react-navigation)/)',
      ],
      testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}', '<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
      testTimeout: 15000,
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
