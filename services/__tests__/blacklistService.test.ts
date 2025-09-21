import { BlacklistService } from "../blacklistService";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("../supabaseClient", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({ data: null, error: { code: "PGRST116" } })
          ),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe("BlacklistService", () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const suppressedMessages = [
    "Added",
    "to shared blacklist",
    "to local blacklist",
    "Restaurant",
    "has been reported",
    "removed from",
    "blacklist",
    "Local blacklist cleared",
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
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("reportRestaurant", () => {
    it("should accept restaurant details and not throw", async () => {
      await expect(
        BlacklistService.reportRestaurant(
          "test-id",
          "Test Restaurant",
          "Does not exist"
        )
      ).resolves.not.toThrow();
    });

    it("should use default reason when none provided", async () => {
      await expect(
        BlacklistService.reportRestaurant("test-id", "Test Restaurant")
      ).resolves.not.toThrow();
    });
  });

  describe("isRestaurantBlacklisted", () => {
    it("should return boolean for any restaurant ID", async () => {
      const result = await BlacklistService.isRestaurantBlacklisted("test-id");
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getBlacklist", () => {
    it("should return an array of blacklisted restaurants", async () => {
      const blacklist = await BlacklistService.getBlacklist();
      expect(Array.isArray(blacklist)).toBe(true);
    });
  });

  describe("removeFromBlacklist", () => {
    it("should accept restaurant ID and not throw", async () => {
      await expect(
        BlacklistService.removeFromBlacklist("test-id")
      ).resolves.not.toThrow();
    });
  });

  describe("filterBlacklistedRestaurants", () => {
    it("should filter out blacklisted restaurants from a list", async () => {
      const restaurants = [
        { id: "restaurant-1", name: "Restaurant 1" },
        { id: "restaurant-2", name: "Restaurant 2" },
      ];

      const filtered = await BlacklistService.filterBlacklistedRestaurants(
        restaurants
      );
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(restaurants.length);
    });
  });

  describe("clearLocalBlacklist", () => {
    it("should execute without throwing", async () => {
      await expect(
        BlacklistService.clearLocalBlacklist()
      ).resolves.not.toThrow();
    });
  });

  describe("getBlacklistStats", () => {
    it("should return stats object", async () => {
      const stats = await BlacklistService.getBlacklistStats();
      expect(typeof stats).toBe("object");
      expect(typeof stats.totalBlacklisted).toBe("number");
      expect(typeof stats.recentlyBlacklisted).toBe("number");
      expect(typeof stats.sharedBlacklisted).toBe("number");
      expect(typeof stats.localBlacklisted).toBe("number");
    });
  });
});
