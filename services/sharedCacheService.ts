import { Restaurant } from "../types/restaurant";
import { LocationCoordinates } from "./locationService";
import { supabase } from "./supabaseClient";

// Cache configuration
const SHARED_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for shared cache

interface SharedCacheRecord {
  id: string;
  grid_lat: number;
  grid_lng: number;
  radius_meters: number;
  restaurants: Restaurant[];
  location: LocationCoordinates;
  contributors: number;
  created_at: string;
  updated_at: string;
}

export class SharedCacheService {
  /**
   * Generate cache grid coordinates for efficient querying
   * This creates broader cache areas so multiple users can share the same cache
   */
  private static getCacheGrid(
    location: LocationCoordinates,
    radiusInMeters: number
  ): { gridLat: number; gridLng: number; normalizedRadius: number } {
    // Round to larger grid (about 1km precision) so nearby users share cache
    const gridSize = 0.01; // ~1km at most latitudes
    const gridLat = Math.round(location.latitude / gridSize) * gridSize;
    const gridLng = Math.round(location.longitude / gridSize) * gridSize;

    // Normalize radius to common values to increase cache hits
    const normalizedRadius = radiusInMeters <= 3000 ? 3000 :
                           radiusInMeters <= 5000 ? 5000 :
                           radiusInMeters <= 8000 ? 8000 : 10000;

    return { gridLat, gridLng, normalizedRadius };
  }

  /**
   * Get cached restaurants from Supabase
   */
  static async getSharedCache(
    location: LocationCoordinates,
    radiusInMeters: number
  ): Promise<Restaurant[] | null> {
    if (!supabase) {
      console.warn('Supabase not configured, skipping shared cache');
      return null;
    }

    try {
      const { gridLat, gridLng, normalizedRadius } = this.getCacheGrid(location, radiusInMeters);

      const { data, error } = await supabase
        .from('restaurant_cache')
        .select('*')
        .eq('grid_lat', gridLat)
        .eq('grid_lng', gridLng)
        .eq('radius_meters', normalizedRadius)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching shared cache:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log('No shared cache found for this location');
        return null;
      }

      const cacheRecord = data[0] as SharedCacheRecord;
      const now = Date.now();
      const cacheAge = now - new Date(cacheRecord.updated_at).getTime();

      // Check if shared cache is expired
      if (cacheAge > SHARED_CACHE_DURATION) {
        console.log('Shared cache expired, cleaning up');
        // Optionally clean up expired cache
        await this.cleanupExpiredCache(cacheRecord.id);
        return null;
      }

      console.log(`Using shared cache with ${cacheRecord.restaurants.length} restaurants from ${cacheRecord.contributors} contributors`);
      return cacheRecord.restaurants;
    } catch (error) {
      console.error('Error fetching shared cache:', error);
      return null;
    }
  }

  /**
   * Store restaurants in Supabase shared cache
   */
  static async setSharedCache(
    location: LocationCoordinates,
    radiusInMeters: number,
    restaurants: Restaurant[]
  ): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not configured, skipping shared cache update');
      return;
    }

    try {
      const { gridLat, gridLng, normalizedRadius } = this.getCacheGrid(location, radiusInMeters);

      // Try to get existing cache to merge data
      const existingData = await this.getSharedCache(location, radiusInMeters);
      let contributors = 1;
      let mergedRestaurants = restaurants;

      if (existingData && existingData.length > 0) {
        // Merge with existing data to create a richer cache
        const existingIds = new Set(existingData.map(r => r.id));
        const newRestaurants = restaurants.filter(r => !existingIds.has(r.id));
        mergedRestaurants = [...existingData, ...newRestaurants];
        contributors += 1; // Increment contributor count

        console.log(`Merging ${newRestaurants.length} new restaurants with ${existingData.length} existing ones`);
      }

      // Upsert the cache record
      const { error } = await supabase
        .from('restaurant_cache')
        .upsert(
          {
            id: `${gridLat}_${gridLng}_${normalizedRadius}`,
            grid_lat: gridLat,
            grid_lng: gridLng,
            radius_meters: normalizedRadius,
            restaurants: mergedRestaurants,
            location: location,
            contributors: contributors,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id'
          }
        );

      if (error) {
        console.error('Error updating shared cache:', error);
      } else {
        console.log(`Shared cache updated with ${mergedRestaurants.length} restaurants`);
      }
    } catch (error) {
      console.error('Error updating shared cache:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private static async cleanupExpiredCache(cacheId: string): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from('restaurant_cache')
        .delete()
        .eq('id', cacheId);
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(): Promise<{
    totalCaches: number;
    totalRestaurants: number;
    averageContributors: number;
  } | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('restaurant_cache')
        .select('restaurants, contributors');

      if (error || !data) return null;

      const totalCaches = data.length;
      const totalRestaurants = data.reduce((sum, cache) => sum + cache.restaurants.length, 0);
      const averageContributors = data.reduce((sum, cache) => sum + cache.contributors, 0) / totalCaches;

      return {
        totalCaches,
        totalRestaurants,
        averageContributors: Math.round(averageContributors * 10) / 10
      };
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      return null;
    }
  }
}