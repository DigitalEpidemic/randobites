import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export class LocationService {
  /**
   * Request location permissions from the user
   */
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get the user's current location
   */
  static async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      // Check if permission is granted
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const permissionGranted = await this.requestLocationPermission();
        if (!permissionGranted) {
          throw new Error('Location permission not granted');
        }
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using the Haversine formula
   * Returns distance in kilometers
   */
  static calculateDistance(
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
        Math.cos(this.toRadians(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}