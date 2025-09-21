import * as Location from "expo-location";
import { LocationCoordinates, LocationService } from "../locationService";

const mockLocation = Location as jest.Mocked<typeof Location>;

describe("LocationService", () => {
  const originalConsoleError = console.error;

  const suppressedMessages = [
    "Error requesting location permission:",
    "Error getting current location:",
    "Location permission not granted",
    "Location error",
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress specific console messages for this test suite
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
    console.error = originalConsoleError;
  });

  describe("requestLocationPermission", () => {
    it("should return true when permission is granted", async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: "granted" as any,
        granted: true,
        canAskAgain: true,
        expires: "never",
      });

      const result = await LocationService.requestLocationPermission();
      expect(result).toBe(true);
      expect(
        mockLocation.requestForegroundPermissionsAsync
      ).toHaveBeenCalledTimes(1);
    });

    it("should return false when permission is denied", async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: "denied" as any,
        granted: false,
        canAskAgain: true,
        expires: "never",
      });

      const result = await LocationService.requestLocationPermission();
      expect(result).toBe(false);
    });

    it("should return false when an error occurs", async () => {
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValue(
        new Error("Permission error")
      );

      const result = await LocationService.requestLocationPermission();
      expect(result).toBe(false);
    });
  });

  describe("getCurrentLocation", () => {
    it("should return location when permission is granted", async () => {
      const mockCoordinates = { latitude: 37.7749, longitude: -122.4194 };

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: "granted" as any,
        granted: true,
        canAskAgain: true,
        expires: "never",
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: mockCoordinates,
        timestamp: Date.now(),
      } as any);

      const result = await LocationService.getCurrentLocation();
      expect(result).toEqual(mockCoordinates);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: expect.any(Number),
      });
    });

    it("should return null when permission is not granted and cannot be requested", async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: "denied" as any,
        granted: false,
        canAskAgain: false,
        expires: "never",
      });

      const result = await LocationService.getCurrentLocation();
      expect(result).toBeNull();
    });

    it("should request permission and return location if granted", async () => {
      const mockCoordinates = { latitude: 37.7749, longitude: -122.4194 };

      // First call - permission not granted
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: "undetermined" as any,
        granted: false,
        canAskAgain: true,
        expires: "never",
      });

      // Permission request succeeds
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: "granted" as any,
        granted: true,
        canAskAgain: true,
        expires: "never",
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: mockCoordinates,
        timestamp: Date.now(),
      } as any);

      const result = await LocationService.getCurrentLocation();
      expect(result).toEqual(mockCoordinates);
    });

    it("should return null when an error occurs", async () => {
      mockLocation.getForegroundPermissionsAsync.mockRejectedValue(
        new Error("Location error")
      );

      const result = await LocationService.getCurrentLocation();
      expect(result).toBeNull();
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points correctly", () => {
      const point1: LocationCoordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const point2: LocationCoordinates = {
        latitude: 37.7849,
        longitude: -122.4094,
      };

      const distance = LocationService.calculateDistance(point1, point2);

      // Distance should be approximately 1.4 km
      expect(distance).toBeCloseTo(1.4, 1);
    });

    it("should return 0 for identical points", () => {
      const point: LocationCoordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const distance = LocationService.calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it("should handle antipodal points", () => {
      const point1: LocationCoordinates = { latitude: 0, longitude: 0 };
      const point2: LocationCoordinates = { latitude: 0, longitude: 180 };

      const distance = LocationService.calculateDistance(point1, point2);

      // Should be approximately half the earth's circumference
      expect(distance).toBeGreaterThan(20000);
    });
  });
});
