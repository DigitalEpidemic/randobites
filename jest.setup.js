/* eslint-disable no-undef */

// Mock console methods to suppress specific log messages during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const suppressedLogs = [
  "Added",
  "to shared blacklist",
  "to local blacklist",
  "Restaurant",
  "has been reported",
  "removed from",
  "blacklist",
  "Local blacklist cleared",
];

console.log = (...args) => {
  const message = args.join(" ");
  const shouldSuppress = suppressedLogs.some((pattern) =>
    message.includes(pattern)
  );
  if (!shouldSuppress) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  const message = args.join(" ");
  const shouldSuppress = suppressedLogs.some((pattern) =>
    message.includes(pattern)
  );
  if (!shouldSuppress) {
    originalConsoleError(...args);
  }
};

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock Expo modules
jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: "test-url",
        supabaseAnonKey: "test-key",
      },
    },
  },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 37.7749, longitude: -122.4194 },
    })
  ),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

// Mock react-native-deck-swiper
jest.mock("react-native-deck-swiper", () => "DeckSwiper");

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));
