import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '../SettingsScreen';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';

// Mock SettingsService
jest.mock('../../services/settingsService', () => ({
  SettingsService: {
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
  DEFAULT_SETTINGS: {
    maxRadius: 5,
  },
}));

// Mock Slider component
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return ({ value, onValueChange, testID }: any) => {
    const mockReact = require('react');
    return mockReact.createElement(View, {
      testID: testID || 'slider',
      onTouchEnd: () => onValueChange && onValueChange(value + 1)
    });
  };
});

// Mock Alert separately to avoid React Native module conflicts
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock SafeAreaView from react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.fn(({ children, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  }),
}));

const mockSettingsService = SettingsService as jest.Mocked<typeof SettingsService>;

describe('SettingsScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock loadSettings to never resolve so component stays in loading state
    mockSettingsService.loadSettings.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(<SettingsScreen navigation={mockNavigation} />);

    expect(getByText('Loading settings...')).toBeTruthy();
  });

  it('calls loadSettings on mount', async () => {
    // Use a promise that resolves immediately to avoid async state issues
    mockSettingsService.loadSettings.mockImplementation(() =>
      Promise.resolve(DEFAULT_SETTINGS)
    );

    render(<SettingsScreen navigation={mockNavigation} />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(mockSettingsService.loadSettings).toHaveBeenCalledTimes(1);
    });

    // Add a small delay to let any async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});