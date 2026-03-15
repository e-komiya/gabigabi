module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'react-native',
      testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}', '<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
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
