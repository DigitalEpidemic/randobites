import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../types/restaurant';
import { RestaurantService } from '../services/restaurantService';
import { LocationService, LocationCoordinates } from '../services/locationService';
import { SharedCacheService } from '../services/sharedCacheService';

interface BulkImageManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface CachedData {
  timestamp: number;
  restaurants: Restaurant[];
}

interface CacheEntry {
  cacheKey: string;
  location: LocationCoordinates;
  radius: number;
  restaurants: Restaurant[];
  timestamp: number;
}

export const BulkImageManager: React.FC<BulkImageManagerProps> = ({
  visible,
  onClose,
}) => {
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadAllCachedRestaurants();
    }
  }, [visible]);

  const loadAllCachedRestaurants = async () => {
    setIsLoading(true);
    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();

      // Filter for restaurant cache keys
      const cacheKeys = allKeys.filter(key => key.startsWith('restaurants_cache_'));

      const entries: CacheEntry[] = [];
      const restaurantMap = new Map<string, Restaurant>();

      for (const cacheKey of cacheKeys) {
        try {
          const cachedDataStr = await AsyncStorage.getItem(cacheKey);
          if (cachedDataStr) {
            const cachedData: CachedData = JSON.parse(cachedDataStr);

            // Parse location and radius from cache key
            // Format: restaurants_cache_${lat}_${lng}_${radius}
            const keyParts = cacheKey.replace('restaurants_cache_', '').split('_');
            if (keyParts.length >= 3) {
              const latitude = parseFloat(keyParts[0]);
              const longitude = parseFloat(keyParts[1]);
              const radius = parseInt(keyParts[2]);

              if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
                entries.push({
                  cacheKey,
                  location: { latitude, longitude },
                  radius,
                  restaurants: cachedData.restaurants,
                  timestamp: cachedData.timestamp,
                });

                // Add restaurants to the map to dedupe
                cachedData.restaurants.forEach(restaurant => {
                  restaurantMap.set(restaurant.id, restaurant);
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing cache entry ${cacheKey}:`, error);
        }
      }

      setCacheEntries(entries);
      setAllRestaurants(Array.from(restaurantMap.values()));
    } catch (error) {
      console.error('Error loading cached restaurants:', error);
      Alert.alert('Error', 'Failed to load cached restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setNewImageUrl(restaurant.image);
  };

  const cancelEditing = () => {
    setEditingRestaurant(null);
    setNewImageUrl('');
  };

  const updateRestaurantImage = async () => {
    if (!editingRestaurant || !newImageUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(newImageUrl);
      if (url.protocol !== 'https:') {
        Alert.alert('Error', 'Please use an HTTPS URL for better compatibility');
        return;
      }
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsUpdating(true);
    try {
      let updateCount = 0;
      const sharedCacheUpdates: Promise<void>[] = [];

      // Update the restaurant in all cache entries that contain it
      for (const entry of cacheEntries) {
        const restaurantIndex = entry.restaurants.findIndex(r => r.id === editingRestaurant.id);
        if (restaurantIndex !== -1) {
          // Update the restaurant with new image
          const updatedRestaurant: Restaurant = {
            ...entry.restaurants[restaurantIndex],
            image: newImageUrl.trim(),
            dataSource: 'user-contributed'
          };

          // Update the restaurants array
          const updatedRestaurants = [...entry.restaurants];
          updatedRestaurants[restaurantIndex] = updatedRestaurant;

          // Save back to AsyncStorage
          const cacheData: CachedData = {
            timestamp: entry.timestamp,
            restaurants: updatedRestaurants,
          };

          await AsyncStorage.setItem(entry.cacheKey, JSON.stringify(cacheData));

          // Also update shared cache (Supabase)
          sharedCacheUpdates.push(
            SharedCacheService.setSharedCache(entry.location, entry.radius, updatedRestaurants)
          );

          updateCount++;
        }
      }

      // Wait for all shared cache updates to complete
      if (sharedCacheUpdates.length > 0) {
        await Promise.all(sharedCacheUpdates);
        console.log(`Synced ${updateCount} cache entries to shared cache`);
      }

      if (updateCount > 0) {
        Alert.alert(
          'Success',
          `Updated ${editingRestaurant.name} in ${updateCount} cache ${updateCount === 1 ? 'entry' : 'entries'} and synced to shared cache`
        );

        // Reload the data to reflect changes
        await loadAllCachedRestaurants();
        cancelEditing();
      } else {
        Alert.alert('Warning', 'Restaurant not found in any cache entries');
      }
    } catch (error) {
      console.error('Error updating restaurant image:', error);
      Alert.alert('Error', 'Failed to update restaurant image');
    } finally {
      setIsUpdating(false);
    }
  };

  const clearAllImages = () => {
    Alert.alert(
      'Clear All Images',
      'This will reset ALL restaurant images to default cuisine-based images. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: performClearAllImages
        }
      ]
    );
  };

  const performClearAllImages = async () => {
    setIsUpdating(true);
    try {
      let updateCount = 0;
      const sharedCacheUpdates: Promise<void>[] = [];

      for (const entry of cacheEntries) {
        const updatedRestaurants = entry.restaurants.map(restaurant => ({
          ...restaurant,
          image: getCuisineSpecificImage(restaurant.cuisine),
          dataSource: 'api' as const
        }));

        const cacheData: CachedData = {
          timestamp: entry.timestamp,
          restaurants: updatedRestaurants,
        };

        await AsyncStorage.setItem(entry.cacheKey, JSON.stringify(cacheData));

        // Also update shared cache (Supabase)
        sharedCacheUpdates.push(
          SharedCacheService.setSharedCache(entry.location, entry.radius, updatedRestaurants)
        );

        updateCount++;
      }

      // Wait for all shared cache updates to complete
      if (sharedCacheUpdates.length > 0) {
        await Promise.all(sharedCacheUpdates);
        console.log(`Synced ${updateCount} cache entries to shared cache after reset`);
      }

      Alert.alert('Success', `Reset images for all restaurants in ${updateCount} cache entries and synced to shared cache`);
      await loadAllCachedRestaurants();
    } catch (error) {
      console.error('Error clearing all images:', error);
      Alert.alert('Error', 'Failed to clear all images');
    } finally {
      setIsUpdating(false);
    }
  };

  // Copy the cuisine image logic from RestaurantService
  const getCuisineSpecificImage = (cuisine: string): string => {
    const cuisineImages: { [key: string]: string[] } = {
      Italian: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop",
      ],
      Japanese: [
        "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop",
      ],
      Mexican: [
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1565299585323-38174c26efe4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1624300629840-b5d88c8e7b8b?w=400&h=300&fit=crop",
      ],
      Chinese: [
        "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop",
      ],
      Indian: [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
      ],
      American: [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
      ],
      French: [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop",
      ],
      Thai: [
        "https://images.unsplash.com/photo-1559314809-0f31657faf33?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1604263439201-171fb4d1b13c?w=400&h=300&fit=crop",
      ],
    };

    const cuisineKey = cuisine as keyof typeof cuisineImages;
    const images = cuisineImages[cuisineKey] || [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
    ];

    return images[Math.floor(Math.random() * images.length)];
  };

  const filteredRestaurants = allRestaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bulk Image Manager</Text>
          <TouchableOpacity
            onPress={clearAllImages}
            style={styles.clearAllButton}
            disabled={isUpdating || isLoading}
          >
            <Text style={[styles.clearAllText, (isUpdating || isLoading) && styles.disabledText]}>
              Reset All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search restaurants..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {allRestaurants.length} restaurants across {cacheEntries.length} cache regions
          </Text>
          <Text style={styles.statsText}>
            Showing {filteredRestaurants.length} restaurants
          </Text>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading cached restaurants...</Text>
          </View>
        )}

        {/* Restaurant List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredRestaurants.map((restaurant) => (
            <View key={restaurant.id} style={styles.restaurantCard}>
              <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
                <Text style={styles.restaurantSource}>
                  Source: {restaurant.dataSource === 'user-contributed' ? 'Custom' : 'Default'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => startEditingRestaurant(restaurant)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      {editingRestaurant && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={cancelEditing}
        >
          <KeyboardAvoidingView
            style={styles.editContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={styles.editScrollView}>
              <View style={styles.editHeader}>
                <TouchableOpacity onPress={cancelEditing}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.editTitle}>Edit Image</Text>
                <TouchableOpacity
                  onPress={updateRestaurantImage}
                  disabled={isUpdating}
                >
                  <Text style={[styles.saveText, isUpdating && styles.disabledText]}>
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editContent}>
                <Text style={styles.editRestaurantName}>{editingRestaurant.name}</Text>
                <Text style={styles.editRestaurantCuisine}>{editingRestaurant.cuisine}</Text>

                <Text style={styles.label}>Current Image:</Text>
                <Image source={{ uri: editingRestaurant.image }} style={styles.currentImage} />

                <Text style={styles.label}>New Image URL:</Text>
                <TextInput
                  style={styles.urlInput}
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                {newImageUrl.trim() && newImageUrl !== editingRestaurant.image && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.label}>Preview:</Text>
                    <Image source={{ uri: newImageUrl }} style={styles.previewImage} />
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  clearAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearAllText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  restaurantCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  restaurantSource: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editScrollView: {
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editContent: {
    padding: 20,
  },
  editRestaurantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  editRestaurantCuisine: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  currentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
});