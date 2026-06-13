/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

jest.mock('../src/screens/MainScreen', () => 'MainScreen');

test('renders correctly', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(tree).toBeDefined();
});
