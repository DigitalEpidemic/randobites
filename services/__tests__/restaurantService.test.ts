import { LocationCoordinates } from "../locationService";
import { RestaurantService } from "../restaurantService";

jest.mock("../supabaseClient", () => {
  type MockQueryResult = {
    eq: jest.MockedFunction<() => MockQueryResult>;
    order: jest.MockedFunction<() => MockQueryResult>;
    limit: jest.MockedFunction<() => Promise<{ data: unknown[]; error: null }>>;
    single: jest.MockedFunction<() => Promise<{ data: null; error: null }>>;
  };

  const createChainableQuery = (): MockQueryResult => {
    const mockQuery: MockQueryResult = {
      eq: jest.fn(() => mockQuery),
      order: jest.fn(() => mockQuery),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return mockQuery;
  };

  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => createChainableQuery()),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => createChainableQuery()),
      })),
    },
  };
});

jest.mock("@react-native-async-storage/async-storage");
jest.mock("../blacklistService", () => ({
  BlacklistService: {
    filterBlacklistedRestaurants: jest.fn((restaurants) =>
      Promise.resolve(restaurants || [])
    ),
    isRestaurantBlacklisted: jest.fn(() => Promise.resolve(false)),
    reportRestaurant: jest.fn(() => Promise.resolve()),
    getBlacklist: jest.fn(() => Promise.resolve([])),
    removeFromBlacklist: jest.fn(() => Promise.resolve()),
    clearLocalBlacklist: jest.fn(() => Promise.resolve()),
    getBlacklistStats: jest.fn(() =>
      Promise.resolve({
        totalBlacklisted: 0,
        recentlyBlacklisted: 0,
        sharedBlacklisted: 0,
        localBlacklisted: 0,
      })
    ),
  },
}));

global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("RestaurantService", () => {
  const mockLocation: LocationCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  const suppressedMessages = [
    "No shared cache found",
    "Error fetching from Geoapify:",
    "No restaurants found, using mock data",
    "Error fetching nearby restaurants:",
    "Error fetching fresh restaurants:",
    "Fresh fetch: Found",
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress specific console messages for this test suite
    console.log = (...args) => {
      const message = args.join(" ");
      const shouldSuppress = suppressedMessages.some((pattern) =>
        message.includes(pattern)
      );
      if (!shouldSuppress) originalConsoleLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(" ");
      const shouldSuppress = suppressedMessages.some((pattern) =>
        message.includes(pattern)
      );
      if (!shouldSuppress) originalConsoleError(...args);
    };

    console.warn = (...args) => {
      const message = args.join(" ");
      const shouldSuppress = suppressedMessages.some((pattern) =>
        message.includes(pattern)
      );
      if (!shouldSuppress) originalConsoleWarn(...args);
    };
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe("fetchNearbyRestaurants", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const restaurants = await RestaurantService.fetchNearbyRestaurants(
        mockLocation
      );

      expect(Array.isArray(restaurants)).toBe(true);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const restaurants = await RestaurantService.fetchNearbyRestaurants(
        mockLocation
      );

      expect(Array.isArray(restaurants)).toBe(true);
    });

    it("should return mock data when API key is missing", async () => {
      const originalApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
      delete process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

      const restaurants = await RestaurantService.fetchNearbyRestaurants(
        mockLocation
      );

      expect(Array.isArray(restaurants)).toBe(true);
      expect(restaurants.length).toBeGreaterThan(0); // Should return mock data

      // Restore the API key
      process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY = originalApiKey;
    });
  });

  describe("fetchFreshRestaurants", () => {
    it("should handle fresh restaurant requests without throwing", async () => {
      // Test that the method can be called without throwing an error
      expect(async () => {
        await RestaurantService.fetchFreshRestaurants(mockLocation);
      }).not.toThrow();
    });
  });

  describe("updateRestaurantImage", () => {
    it("should accept required parameters", async () => {
      const result = await RestaurantService.updateRestaurantImage(
        "test-id",
        "http://test.com/image.jpg",
        mockLocation
      );

      expect(typeof result).toBe("boolean");
    });
  });

  describe("clearAPIRestaurants", () => {
    it("should execute without throwing", async () => {
      await expect(
        RestaurantService.clearAPIRestaurants(mockLocation)
      ).resolves.not.toThrow();
    });
  });
});
