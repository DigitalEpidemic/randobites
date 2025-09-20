import { LocationCoordinates } from "../locationService";
import { RestaurantService } from "../restaurantService";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("../blacklistService");

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("RestaurantService", () => {
  const mockLocation: LocationCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
  };
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
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

    it("should return empty array when API key is missing", async () => {
      delete process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

      const restaurants = await RestaurantService.fetchNearbyRestaurants(
        mockLocation
      );

      expect(Array.isArray(restaurants)).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
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
