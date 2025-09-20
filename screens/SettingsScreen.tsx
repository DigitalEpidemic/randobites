import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { SettingsService, AppSettings, DEFAULT_SETTINGS } from '../services/settingsService';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await SettingsService.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleRadiusChange = (value: number) => {
    const newSettings = { ...settings, maxRadius: value };
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: () => saveSettings(DEFAULT_SETTINGS),
          style: 'destructive',
        },
      ]
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Maximum Radius Setting */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Search Radius</Text>
          <Text style={styles.sectionDescription}>
            Maximum distance to search for restaurants
          </Text>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <Text style={styles.currentValue}>{settings.maxRadius.toFixed(1)} km</Text>
              <Text style={styles.sliderLabel}>30 km</Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={30}
              value={settings.maxRadius}
              onValueChange={handleRadiusChange}
              minimumTrackTintColor="#4ECDC4"
              maximumTrackTintColor="#666"
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
              step={0.5}
            />

            <Text style={styles.sliderHelp}>
              Larger radius = more restaurants but potentially further away
            </Text>
          </View>
        </View>

        {/* Future Settings Placeholder */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>More Filters</Text>
          <Text style={styles.comingSoon}>
            Price range, cuisine type, and rating filters coming soon! 🚀
          </Text>
        </View>

        {/* Reset Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40, // Same as back button for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  settingSection: {
    marginBottom: 30,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    lineHeight: 20,
  },
  sliderContainer: {
    marginTop: 10,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#999',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4ECDC4',
    width: 20,
    height: 20,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderHelp: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionSection: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  resetButton: {
    backgroundColor: '#666',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});