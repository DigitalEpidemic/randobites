import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const BLACKLIST_KEY = "restaurant_blacklist"; // Keep for local fallback

export interface BlacklistedRestaurant {
  id: string;
  name: string;
  reportedAt: number;
  reason: string;
}

interface SharedBlacklistRecord {
  restaurant_id: string;
  restaurant_name: string;
  reason: string;
  reported_at: string;
  reports_count: number;
}

export class BlacklistService {
  /**
   * Report a restaurant as non-existent or problematic
   * Uses shared database so all users benefit from reports
   */
  static async reportRestaurant(
    restaurantId: string,
    restaurantName: string,
    reason: string = "Restaurant does not exist"
  ): Promise<void> {
    try {
      // Try to report to shared database first
      if (supabase) {
        await this.reportToSharedDatabase(restaurantId, restaurantName, reason);
      } else {
        // Fallback to local storage if Supabase is not available
        await this.reportToLocalStorage(restaurantId, restaurantName, reason);
      }

      console.log(`Restaurant ${restaurantName} (${restaurantId}) has been reported`);
    } catch (error) {
      console.error("Error reporting restaurant:", error);
      throw error;
    }
  }

  /**
   * Report to shared Supabase database
   */
  private static async reportToSharedDatabase(
    restaurantId: string,
    restaurantName: string,
    reason: string
  ): Promise<void> {
    try {
      // First check if restaurant is already blacklisted
      const { data: existing, error: fetchError } = await supabase!
        .from('restaurant_blacklist')
        .select('restaurant_id, reports_count')
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw fetchError;
      }

      if (existing) {
        // Restaurant already blacklisted, increment report count
        const { error: updateError } = await supabase!
          .from('restaurant_blacklist')
          .update({
            reports_count: existing.reports_count + 1,
            reported_at: new Date().toISOString()
          })
          .eq('restaurant_id', restaurantId);

        if (updateError) throw updateError;
        console.log(`Updated existing blacklist entry for ${restaurantName}, now has ${existing.reports_count + 1} reports`);
      } else {
        // New blacklist entry
        const { error: insertError } = await supabase!
          .from('restaurant_blacklist')
          .insert({
            restaurant_id: restaurantId,
            restaurant_name: restaurantName,
            reason: reason,
            reported_at: new Date().toISOString(),
            reports_count: 1
          });

        if (insertError) throw insertError;
        console.log(`Added ${restaurantName} to shared blacklist`);
      }
    } catch (error) {
      console.error('Error reporting to shared database:', error);
      // Fallback to local storage
      await this.reportToLocalStorage(restaurantId, restaurantName, reason);
    }
  }

  /**
   * Fallback to local storage reporting
   */
  private static async reportToLocalStorage(
    restaurantId: string,
    restaurantName: string,
    reason: string
  ): Promise<void> {
    const blacklist = await this.getLocalBlacklist();

    // Check if restaurant is already blacklisted locally
    if (blacklist.some(item => item.id === restaurantId)) {
      console.log(`Restaurant ${restaurantId} is already blacklisted locally`);
      return;
    }

    const blacklistedRestaurant: BlacklistedRestaurant = {
      id: restaurantId,
      name: restaurantName,
      reportedAt: Date.now(),
      reason: reason,
    };

    const updatedBlacklist = [...blacklist, blacklistedRestaurant];
    await AsyncStorage.setItem(BLACKLIST_KEY, JSON.stringify(updatedBlacklist));
    console.log(`Added ${restaurantName} to local blacklist`);
  }

  /**
   * Get all blacklisted restaurants from shared database and local storage
   */
  static async getBlacklist(): Promise<BlacklistedRestaurant[]> {
    try {
      let blacklistedRestaurants: BlacklistedRestaurant[] = [];

      // Get from shared database first
      if (supabase) {
        const sharedBlacklist = await this.getSharedBlacklist();
        blacklistedRestaurants = sharedBlacklist;
      }

      // Also get local blacklist and merge
      const localBlacklist = await this.getLocalBlacklist();

      // Merge, prioritizing shared database entries
      const sharedIds = new Set(blacklistedRestaurants.map(item => item.id));
      const uniqueLocal = localBlacklist.filter(item => !sharedIds.has(item.id));

      return [...blacklistedRestaurants, ...uniqueLocal];
    } catch (error) {
      console.error("Error reading blacklist:", error);
      // Fallback to local only
      return await this.getLocalBlacklist();
    }
  }

  /**
   * Get blacklisted restaurants from shared database
   */
  private static async getSharedBlacklist(): Promise<BlacklistedRestaurant[]> {
    try {
      const { data, error } = await supabase!
        .from('restaurant_blacklist')
        .select('restaurant_id, restaurant_name, reason, reported_at, reports_count');

      if (error) {
        console.error('Error fetching shared blacklist:', error);
        return [];
      }

      return (data || []).map((record: SharedBlacklistRecord) => ({
        id: record.restaurant_id,
        name: record.restaurant_name,
        reason: record.reason,
        reportedAt: new Date(record.reported_at).getTime(),
      }));
    } catch (error) {
      console.error('Error fetching shared blacklist:', error);
      return [];
    }
  }

  /**
   * Get local blacklist as fallback
   */
  private static async getLocalBlacklist(): Promise<BlacklistedRestaurant[]> {
    try {
      const blacklistStr = await AsyncStorage.getItem(BLACKLIST_KEY);
      if (!blacklistStr) {
        return [];
      }
      return JSON.parse(blacklistStr);
    } catch (error) {
      console.error("Error reading local blacklist:", error);
      return [];
    }
  }

  /**
   * Check if a restaurant is blacklisted
   */
  static async isRestaurantBlacklisted(restaurantId: string): Promise<boolean> {
    try {
      const blacklist = await this.getBlacklist();
      return blacklist.some(item => item.id === restaurantId);
    } catch (error) {
      console.error("Error checking blacklist:", error);
      return false;
    }
  }

  /**
   * Remove a restaurant from blacklist (admin function - not for regular users)
   */
  static async removeFromBlacklist(restaurantId: string): Promise<void> {
    try {
      // Remove from shared database
      if (supabase) {
        const { error } = await supabase
          .from('restaurant_blacklist')
          .delete()
          .eq('restaurant_id', restaurantId);

        if (error) {
          console.error('Error removing from shared blacklist:', error);
        } else {
          console.log(`Restaurant ${restaurantId} removed from shared blacklist`);
        }
      }

      // Also remove from local storage
      const localBlacklist = await this.getLocalBlacklist();
      const updatedBlacklist = localBlacklist.filter(item => item.id !== restaurantId);
      await AsyncStorage.setItem(BLACKLIST_KEY, JSON.stringify(updatedBlacklist));
      console.log(`Restaurant ${restaurantId} removed from local blacklist`);
    } catch (error) {
      console.error("Error removing from blacklist:", error);
      throw error;
    }
  }

  /**
   * Filter out blacklisted restaurants from a list
   */
  static async filterBlacklistedRestaurants<T extends { id: string }>(
    restaurants: T[]
  ): Promise<T[]> {
    try {
      const blacklist = await this.getBlacklist();
      const blacklistedIds = new Set(blacklist.map(item => item.id));

      const filteredRestaurants = restaurants.filter(
        restaurant => !blacklistedIds.has(restaurant.id)
      );

      const filteredCount = restaurants.length - filteredRestaurants.length;
      if (filteredCount > 0) {
        console.log(`Filtered out ${filteredCount} blacklisted restaurants`);
      }

      return filteredRestaurants;
    } catch (error) {
      console.error("Error filtering blacklisted restaurants:", error);
      // Return original list if filtering fails
      return restaurants;
    }
  }

  /**
   * Clear only local blacklist (for resync with shared database)
   */
  static async clearLocalBlacklist(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BLACKLIST_KEY);
      console.log("Local blacklist cleared - will resync from shared database");
    } catch (error) {
      console.error("Error clearing local blacklist:", error);
      throw error;
    }
  }

  /**
   * Clear all blacklisted restaurants (admin function)
   */
  static async clearBlacklist(): Promise<void> {
    try {
      // Clear shared database
      if (supabase) {
        const { error } = await supabase
          .from('restaurant_blacklist')
          .delete()
          .neq('restaurant_id', ''); // Delete all records

        if (error) {
          console.error('Error clearing shared blacklist:', error);
        } else {
          console.log("Shared blacklist cleared");
        }
      }

      // Clear local storage
      await this.clearLocalBlacklist();
    } catch (error) {
      console.error("Error clearing blacklist:", error);
      throw error;
    }
  }

  /**
   * Get blacklist statistics
   */
  static async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    recentlyBlacklisted: number; // last 30 days
    sharedBlacklisted: number;
    localBlacklisted: number;
  }> {
    try {
      const blacklist = await this.getBlacklist();
      const sharedBlacklist = supabase ? await this.getSharedBlacklist() : [];
      const localBlacklist = await this.getLocalBlacklist();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      return {
        totalBlacklisted: blacklist.length,
        recentlyBlacklisted: blacklist.filter(item => item.reportedAt > thirtyDaysAgo).length,
        sharedBlacklisted: sharedBlacklist.length,
        localBlacklisted: localBlacklist.length,
      };
    } catch (error) {
      console.error("Error getting blacklist stats:", error);
      return {
        totalBlacklisted: 0,
        recentlyBlacklisted: 0,
        sharedBlacklisted: 0,
        localBlacklisted: 0,
      };
    }
  }
}