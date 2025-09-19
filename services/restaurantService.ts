import { Restaurant } from '../types/restaurant';
import { LocationCoordinates, LocationService } from './locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Geoapify API key from environment variables
const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_KEY_PREFIX = 'restaurants_cache_';

interface GeoapifyResponse {
  type: string;
  features: GeoapifyFeature[];
}

interface GeoapifyFeature {
  type: string;
  properties: {
    name?: string;
    categories: string[];
    details?: string[];
    datasource: {
      sourcename: string;
      raw: {
        cuisine?: string;
        phone?: string;
        website?: string;
        opening_hours?: string;
        'addr:street'?: string;
        'addr:housenumber'?: string;
        'addr:city'?: string;
        'addr:postcode'?: string;
      };
    };
    distance?: number;
    place_id: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface CachedData {
  timestamp: number;
  restaurants: Restaurant[];
}

export class RestaurantService {
  /**
   * Fetch nearby restaurants using Geoapify Places API
   */
  static async fetchNearbyRestaurants(
    location: LocationCoordinates,
    radiusInMeters: number = 5000, // Default 5km radius
    maxResults: number = 20
  ): Promise<Restaurant[]> {
    try {
      // Check cache first
      const cachedRestaurants = await this.getCachedRestaurants(location, radiusInMeters);
      if (cachedRestaurants) {
        return this.shuffleArray(cachedRestaurants);
      }

      if (!GEOAPIFY_API_KEY) {
        console.warn('Geoapify API key not configured, using mock data');
        return this.getMockRestaurantsWithRandomOrder();
      }

      // Fetch from Geoapify
      const restaurants = await this.fetchFromGeoapify(location, radiusInMeters, maxResults);

      if (restaurants.length > 0) {
        // Cache the results
        await this.cacheRestaurants(location, radiusInMeters, restaurants);
        return this.shuffleArray(restaurants);
      }

      // Fallback to mock data
      console.warn('No restaurants found, using mock data');
      return this.getMockRestaurantsWithRandomOrder();
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
      return this.getMockRestaurantsWithRandomOrder();
    }
  }

  /**
   * Fetch restaurants from Geoapify Places API
   */
  private static async fetchFromGeoapify(
    location: LocationCoordinates,
    radiusInMeters: number,
    maxResults: number
  ): Promise<Restaurant[]> {
    try {
      // Geoapify Places API endpoint
      const categories = 'catering.restaurant,catering.fast_food,catering.cafe,catering.bar';
      const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${location.longitude},${location.latitude},${radiusInMeters}&bias=proximity:${location.longitude},${location.latitude}&limit=${maxResults}&apiKey=${GEOAPIFY_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }

      const data: GeoapifyResponse = await response.json();

      // Convert Geoapify features to restaurants
      const restaurants = data.features
        .filter(feature => feature.properties.name) // Only include places with names
        .map(feature => this.convertGeoapifyFeatureToRestaurant(feature, location));

      return restaurants;
    } catch (error) {
      console.error('Error fetching from Geoapify:', error);
      return [];
    }
  }

  /**
   * Convert Geoapify feature to our Restaurant interface
   */
  private static convertGeoapifyFeatureToRestaurant(
    feature: GeoapifyFeature,
    userLocation: LocationCoordinates
  ): Restaurant {
    const [longitude, latitude] = feature.geometry.coordinates;
    const featureLocation: LocationCoordinates = { latitude, longitude };

    const distance = LocationService.calculateDistance(userLocation, featureLocation);

    // Extract address components
    const raw = feature.properties.datasource.raw;
    const addressParts = [
      raw['addr:housenumber'],
      raw['addr:street'],
      raw['addr:city'],
      raw['addr:postcode']
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(' ') : 'Address not available';

    // Generate a realistic rating
    const rating = Math.round((3.5 + Math.random() * 1.3) * 10) / 10; // Between 3.5-4.8

    return {
      id: feature.properties.place_id,
      name: feature.properties.name || 'Restaurant',
      cuisine: this.extractCuisineFromGeoapify(feature),
      image: this.getRandomFoodImage(),
      rating: rating,
      distance: distance,
      description: this.generateGeoapifyDescription(feature),
      address: address,
      phoneNumber: raw.phone,
      priceRange: this.generateRandomPriceRange(),
      isOpen: undefined, // Geoapify opening hours are complex to parse
      hours: raw.opening_hours,
    };
  }

  /**
   * Extract cuisine type from Geoapify feature
   */
  private static extractCuisineFromGeoapify(feature: GeoapifyFeature): string {
    // Check if there's a specific cuisine in the raw data
    const rawCuisine = feature.properties.datasource.raw.cuisine;
    if (rawCuisine) {
      return this.normalizeCuisine(rawCuisine);
    }

    // Extract from categories
    const categories = feature.properties.categories;
    if (categories.includes('catering.fast_food')) return 'Fast Food';
    if (categories.includes('catering.cafe')) return 'Cafe';
    if (categories.includes('catering.bar')) return 'Bar & Grill';
    if (categories.includes('catering.restaurant')) return 'Restaurant';

    return 'Restaurant';
  }

  /**
   * Normalize cuisine names
   */
  private static normalizeCuisine(cuisine: string): string {
    const cuisineMap: { [key: string]: string } = {
      'chinese': 'Chinese',
      'italian': 'Italian',
      'japanese': 'Japanese',
      'mexican': 'Mexican',
      'indian': 'Indian',
      'french': 'French',
      'thai': 'Thai',
      'korean': 'Korean',
      'vietnamese': 'Vietnamese',
      'mediterranean': 'Mediterranean',
      'american': 'American',
      'seafood': 'Seafood',
      'pizza': 'Pizza',
      'burger': 'American',
      'sushi': 'Japanese',
    };

    const lowercaseCuisine = cuisine.toLowerCase();
    return cuisineMap[lowercaseCuisine] || this.capitalizeFirst(cuisine);
  }

  /**
   * Generate description for Geoapify restaurant
   */
  private static generateGeoapifyDescription(feature: GeoapifyFeature): string {
    const name = feature.properties.name || 'Restaurant';
    const cuisine = this.extractCuisineFromGeoapify(feature);

    let description = `Discover ${name}`;

    if (cuisine !== 'Restaurant') {
      description += ` serving ${cuisine} cuisine`;
    }

    description += '. A local dining spot in your neighborhood with great food and atmosphere.';

    return description;
  }

  /**
   * Get random food image
   */
  private static getRandomFoodImage(): string {
    const foodImages = [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop',
      'https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?w=400&h=300&fit=crop',
    ];

    return foodImages[Math.floor(Math.random() * foodImages.length)];
  }

  /**
   * Generate random price range
   */
  private static generateRandomPriceRange(): '$' | '$$' | '$$$' | '$$$$' {
    const priceRanges: ('$' | '$$' | '$$$' | '$$$$')[] = ['$', '$$', '$$', '$$$']; // Weight towards more affordable
    return priceRanges[Math.floor(Math.random() * priceRanges.length)];
  }

  /**
   * Capitalize first letter of a string
   */
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate cache key for location and radius
   */
  private static getCacheKey(location: LocationCoordinates, radiusInMeters: number): string {
    const roundedLat = Math.round(location.latitude * 1000) / 1000; // Round to ~100m precision
    const roundedLng = Math.round(location.longitude * 1000) / 1000;
    return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLng}_${radiusInMeters}`;
  }

  /**
   * Get cached restaurants if available and not expired
   */
  private static async getCachedRestaurants(
    location: LocationCoordinates,
    radiusInMeters: number
  ): Promise<Restaurant[] | null> {
    try {
      const cacheKey = this.getCacheKey(location, radiusInMeters);
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);

      if (!cachedDataStr) {
        return null;
      }

      const cachedData: CachedData = JSON.parse(cachedDataStr);
      const now = Date.now();

      // Check if cache is expired
      if (now - cachedData.timestamp > CACHE_DURATION) {
        // Remove expired cache
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log('Using cached restaurant data');
      return cachedData.restaurants;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache restaurants data
   */
  private static async cacheRestaurants(
    location: LocationCoordinates,
    radiusInMeters: number,
    restaurants: Restaurant[]
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(location, radiusInMeters);
      const cacheData: CachedData = {
        timestamp: Date.now(),
        restaurants: restaurants,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('Cached restaurant data');
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm for randomization
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Fallback method to return mock restaurants in random order
   */
  private static getMockRestaurantsWithRandomOrder(): Restaurant[] {
    const mockRestaurants = [
      {
        id: "1",
        name: "Giuseppe's Italian Kitchen",
        cuisine: "Italian",
        image: "https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?w=400&h=300&fit=crop",
        rating: 4.5,
        distance: 0.3,
        description: "Authentic Italian cuisine with fresh pasta made daily. Family-owned restaurant serving traditional recipes passed down through generations.",
        address: "123 Main Street, Downtown",
        phoneNumber: "(555) 123-4567",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:00 AM - 10:00 PM",
      },
      {
        id: "2",
        name: "Sakura Sushi & Ramen",
        cuisine: "Japanese",
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
        rating: 4.8,
        distance: 0.7,
        description: "Fresh sushi and authentic ramen bowls. Our chefs trained in Tokyo bring you the most authentic Japanese dining experience.",
        address: "456 Oak Avenue, Midtown",
        phoneNumber: "(555) 234-5678",
        priceRange: "$$$" as const,
        isOpen: true,
        hours: "12:00 PM - 11:00 PM",
      },
      {
        id: "3",
        name: "Taco Libre",
        cuisine: "Mexican",
        image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
        rating: 4.2,
        distance: 1.2,
        description: "Street-style tacos with house-made salsas and fresh ingredients. Don't miss our famous fish tacos and craft margaritas!",
        address: "789 Pine Street, Arts District",
        phoneNumber: "(555) 345-6789",
        priceRange: "$" as const,
        isOpen: false,
        hours: "4:00 PM - 12:00 AM",
      },
      {
        id: "4",
        name: "The Burger Joint",
        cuisine: "American",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        rating: 4.0,
        distance: 0.5,
        description: "Gourmet burgers made with locally sourced beef and artisanal buns. Try our signature truffle fries!",
        address: "321 Elm Street, University District",
        phoneNumber: "(555) 456-7890",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:00 AM - 2:00 AM",
      },
      {
        id: "5",
        name: "Green Garden Cafe",
        cuisine: "Vegetarian",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
        rating: 4.6,
        distance: 0.9,
        description: "Plant-based cuisine that doesn't compromise on flavor. Organic, locally-sourced ingredients in every dish.",
        address: "654 Maple Drive, Green Valley",
        phoneNumber: "(555) 567-8901",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "8:00 AM - 9:00 PM",
      },
      {
        id: "6",
        name: "Le Petit Bistro",
        cuisine: "French",
        image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
        rating: 4.7,
        distance: 1.5,
        description: "Classic French bistro fare in an intimate setting. Our wine selection features over 200 bottles from French vineyards.",
        address: "987 Boulevard Street, Historic Quarter",
        phoneNumber: "(555) 678-9012",
        priceRange: "$$$" as const,
        isOpen: true,
        hours: "5:00 PM - 11:00 PM",
      },
      {
        id: "7",
        name: "Spice Route",
        cuisine: "Indian",
        image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
        rating: 4.4,
        distance: 2.1,
        description: "Aromatic Indian cuisine with both traditional and modern interpretations. Our tandoor oven creates the perfect naan and kebabs.",
        address: "147 Curry Lane, Little India",
        phoneNumber: "(555) 789-0123",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:30 AM - 10:30 PM",
      },
      {
        id: "8",
        name: "Dragon Palace",
        cuisine: "Chinese",
        image: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop",
        rating: 4.1,
        distance: 1.8,
        description: "Authentic Szechuan and Cantonese dishes. Family recipes that have been perfected over decades.",
        address: "258 Dynasty Road, Chinatown",
        phoneNumber: "(555) 890-1234",
        priceRange: "$$" as const,
        isOpen: false,
        hours: "12:00 PM - 10:00 PM",
      },
    ];

    return this.shuffleArray(mockRestaurants);
  }
}