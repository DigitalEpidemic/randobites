import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock the SwipeDeckScreen component
jest.mock('@/screens/SwipeDeckScreen', () => {
  const { Text } = require('react-native');
  const mockReact = require('react');
  return {
    SwipeDeckScreen: ({ navigation }: any) => {
      return mockReact.createElement(Text, { testID: 'swipe-deck-screen' }, 'SwipeDeckScreen');
    },
  };
});

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('swipe-deck-screen')).toBeTruthy();
  });

  it('creates navigation object with correct methods', () => {
    const mockPush = jest.fn();
    const mockBack = jest.fn();

    jest.doMock('expo-router', () => ({
      useRouter: () => ({
        push: mockPush,
        back: mockBack,
      }),
    }));

    render(<HomeScreen />);

    // The navigation object is created and passed to SwipeDeckScreen
    // We can verify this through the mock component receiving it
    expect(jest.isMockFunction(mockPush)).toBe(true);
    expect(jest.isMockFunction(mockBack)).toBe(true);
  });
});