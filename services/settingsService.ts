import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = 'app_settings';

export interface AppSettings {
  maxRadius: number; // in kilometers
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxRadius: 5, // 5km default
};

export class SettingsService {
  /**
   * Load app settings from storage
   */
  static async loadSettings(): Promise<AppSettings> {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        return { ...DEFAULT_SETTINGS, ...parsedSettings };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save app settings to storage
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Get maximum radius setting
   */
  static async getMaxRadius(): Promise<number> {
    const settings = await this.loadSettings();
    return settings.maxRadius;
  }

  /**
   * Convert kilometers to meters for API calls
   */
  static kmToMeters(km: number): number {
    return km * 1000;
  }
}