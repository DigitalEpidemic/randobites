import { SettingsService, DEFAULT_SETTINGS, AppSettings } from "../settingsService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("SettingsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for test clarity
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("loadSettings", () => {
    it("returns default settings when no saved settings exist", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("app_settings");
    });

    it("returns saved settings when they exist", async () => {
      const savedSettings = { maxRadius: 10 };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedSettings));

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(savedSettings);
    });

    it("merges saved settings with defaults", async () => {
      const partialSettings = {}; // Missing maxRadius
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(partialSettings));

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("returns default settings when JSON parsing fails", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid-json");

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(console.error).toHaveBeenCalledWith(
        "Error loading settings:",
        expect.any(SyntaxError)
      );
    });

    it("returns default settings when AsyncStorage throws error", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(console.error).toHaveBeenCalledWith(
        "Error loading settings:",
        expect.any(Error)
      );
    });
  });

  describe("saveSettings", () => {
    it("saves settings to AsyncStorage", async () => {
      const settings: AppSettings = { maxRadius: 15 };

      await SettingsService.saveSettings(settings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "app_settings",
        JSON.stringify(settings)
      );
    });

    it("throws error when AsyncStorage fails", async () => {
      const settings: AppSettings = { maxRadius: 15 };
      const storageError = new Error("Storage error");
      mockAsyncStorage.setItem.mockRejectedValue(storageError);

      await expect(SettingsService.saveSettings(settings)).rejects.toThrow("Storage error");
      expect(console.error).toHaveBeenCalledWith("Error saving settings:", storageError);
    });
  });

  describe("getMaxRadius", () => {
    it("returns maxRadius from loaded settings", async () => {
      const savedSettings = { maxRadius: 20 };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedSettings));

      const maxRadius = await SettingsService.getMaxRadius();

      expect(maxRadius).toBe(20);
    });

    it("returns default maxRadius when no settings exist", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const maxRadius = await SettingsService.getMaxRadius();

      expect(maxRadius).toBe(DEFAULT_SETTINGS.maxRadius);
    });
  });

  describe("kmToMeters", () => {
    it("converts kilometers to meters correctly", () => {
      expect(SettingsService.kmToMeters(1)).toBe(1000);
      expect(SettingsService.kmToMeters(5)).toBe(5000);
      expect(SettingsService.kmToMeters(0.5)).toBe(500);
      expect(SettingsService.kmToMeters(0)).toBe(0);
    });
  });
});