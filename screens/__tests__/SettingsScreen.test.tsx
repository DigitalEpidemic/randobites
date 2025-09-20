import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsScreen } from '../SettingsScreen';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';

// Mock SettingsService
jest.mock('../../services/settingsService', () => ({
  SettingsService: {
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
  DEFAULT_SETTINGS: {
    searchRadius: 5000,
    maxResults: 50,
    enableHapticFeedback: true,
    autoRefreshInterval: 30,
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

  it('calls loadSettings on mount', () => {
    // Use a promise that resolves immediately to avoid async state issues
    mockSettingsService.loadSettings.mockImplementation(() =>
      Promise.resolve(DEFAULT_SETTINGS)
    );

    render(<SettingsScreen navigation={mockNavigation} />);

    expect(mockSettingsService.loadSettings).toHaveBeenCalledTimes(1);
  });
});