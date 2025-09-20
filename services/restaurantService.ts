import AsyncStorage from "@react-native-async-storage/async-storage";
import { Restaurant } from "../types/restaurant";
import { LocationCoordinates, LocationService } from "./locationService";
import { SharedCacheService } from "./sharedCacheService";
import { BlacklistService } from "./blacklistService";

// Geoapify API key from environment variables
const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

// Cache configuration
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds (was 30 minutes)
const CACHE_KEY_PREFIX = "restaurants_cache_";

interface GeoapifyResponse {
  type: string;
  features: GeoapifyFeature[];
}

interface GeoapifyFeature {
  type: string;
  properties: {
    feature_type?: string;
    name?: string;
    categories: string[];
    catering?: {
      cuisine?: string;
    };
    datasource: {
      sourcename: string;
      attribution?: string;
      license?: string;
      url?: string;
      raw: {
        name?: string;
        osm_id?: number;
        amenity?: string;
        cuisine?: string;
        osm_type?: string;
        phone?: string;
        website?: string;
        opening_hours?: string;
        [key: string]: any; // Allow additional properties
      };
    };
    housenumber?: string;
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    lat?: number;
    lon?: number;
    distance?: number;
    place_id: string;
    timezone?: {
      name: string;
      offset_STD: string;
      offset_STD_seconds: number;
      offset_DST: string;
      offset_DST_seconds: number;
      abbreviation_STD: string;
      abbreviation_DST: string;
    };
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
    maxResults: number = 20,
    forceRefresh: boolean = false // New parameter to force fresh data
  ): Promise<Restaurant[]> {
    try {
      // If not forcing refresh, check caches first (local, then shared)
      if (!forceRefresh) {
        // Check local cache first (fastest)
        const localCachedRestaurants = await this.getCachedRestaurants(
          location,
          radiusInMeters
        );
        if (localCachedRestaurants) {
          console.log('Using local cache');
          const filteredLocalRestaurants = await BlacklistService.filterBlacklistedRestaurants(localCachedRestaurants);
          return this.shuffleArray(filteredLocalRestaurants);
        }

        // Check shared cache if local cache miss
        const sharedCachedRestaurants = await SharedCacheService.getSharedCache(
          location,
          radiusInMeters
        );
        if (sharedCachedRestaurants && sharedCachedRestaurants.length > 0) {
          console.log('Using shared cache, updating local cache');
          const filteredSharedRestaurants = await BlacklistService.filterBlacklistedRestaurants(sharedCachedRestaurants);
          // Store shared cache data locally for faster future access
          await this.cacheRestaurants(location, radiusInMeters, filteredSharedRestaurants);
          return this.shuffleArray(filteredSharedRestaurants);
        }
      }

      if (!GEOAPIFY_API_KEY) {
        console.warn("Geoapify API key not configured, using mock data");
        return this.getMockRestaurantsWithRandomOrder();
      }

      // Fetch from Geoapify
      const restaurants = await this.fetchFromGeoapify(
        location,
        radiusInMeters,
        maxResults
      );

      if (restaurants.length > 0) {
        // Filter out blacklisted restaurants
        const filteredRestaurants = await BlacklistService.filterBlacklistedRestaurants(restaurants);

        // Cache the results locally and in shared cache
        await Promise.all([
          this.cacheRestaurants(location, radiusInMeters, filteredRestaurants),
          SharedCacheService.setSharedCache(location, radiusInMeters, filteredRestaurants)
        ]);
        return this.shuffleArray(filteredRestaurants);
      }

      // If no fresh restaurants found and we forced refresh, fall back to cached data
      if (forceRefresh) {
        const cachedRestaurants = await this.getCachedRestaurants(
          location,
          radiusInMeters
        );
        if (cachedRestaurants) {
          console.log("No new restaurants found, returning shuffled cached data");
          const filteredCachedRestaurants = await BlacklistService.filterBlacklistedRestaurants(cachedRestaurants);
          return this.shuffleArray(filteredCachedRestaurants);
        }
      }

      // Fallback to mock data
      console.warn("No restaurants found, using mock data");
      const mockData = this.getMockRestaurantsWithRandomOrder();
      return await BlacklistService.filterBlacklistedRestaurants(mockData);
    } catch (error) {
      console.error("Error fetching nearby restaurants:", error);
      const mockData = this.getMockRestaurantsWithRandomOrder();
      return await BlacklistService.filterBlacklistedRestaurants(mockData);
    }
  }

  /**
   * Fetch fresh restaurants, trying to avoid already seen ones
   */
  static async fetchFreshRestaurants(
    location: LocationCoordinates,
    radiusInMeters: number = 5000,
    maxResults: number = 20,
    seenRestaurantIds: string[] = []
  ): Promise<Restaurant[]> {
    try {
      if (!GEOAPIFY_API_KEY) {
        console.warn("Geoapify API key not configured, using mock data");
        const mockRestaurants = this.getMockRestaurantsWithRandomOrder().filter(
          restaurant => !seenRestaurantIds.includes(restaurant.id)
        );
        return await BlacklistService.filterBlacklistedRestaurants(mockRestaurants);
      }

      // Try fetching with a larger radius to find new restaurants
      const expandedRadius = Math.min(radiusInMeters * 1.5, 10000); // Max 10km
      let restaurants = await this.fetchFromGeoapify(
        location,
        expandedRadius,
        maxResults * 2 // Fetch more to filter out seen ones
      );

      // Filter out already seen restaurants and blacklisted ones
      const filteredRestaurants = await BlacklistService.filterBlacklistedRestaurants(restaurants);
      const unseenRestaurants = filteredRestaurants.filter(
        restaurant => !seenRestaurantIds.includes(restaurant.id)
      );

      if (unseenRestaurants.length > 0) {
        // Cache the new results both locally and in shared cache
        await Promise.all([
          this.cacheRestaurants(location, radiusInMeters, filteredRestaurants),
          SharedCacheService.setSharedCache(location, radiusInMeters, filteredRestaurants)
        ]);
        return this.shuffleArray(unseenRestaurants.slice(0, maxResults));
      }

      // If still no new restaurants, try even larger radius
      const maxRadius = 15000; // 15km max
      if (expandedRadius < maxRadius) {
        restaurants = await this.fetchFromGeoapify(
          location,
          maxRadius,
          maxResults * 3
        );

        const newFilteredRestaurants = await BlacklistService.filterBlacklistedRestaurants(restaurants);
        const newUnseenRestaurants = newFilteredRestaurants.filter(
          restaurant => !seenRestaurantIds.includes(restaurant.id)
        );

        if (newUnseenRestaurants.length > 0) {
          // Cache both locally and in shared cache
          await Promise.all([
            this.cacheRestaurants(location, radiusInMeters, newFilteredRestaurants),
            SharedCacheService.setSharedCache(location, radiusInMeters, newFilteredRestaurants)
          ]);
          return this.shuffleArray(newUnseenRestaurants.slice(0, maxResults));
        }
      }

      // If still no luck, return cached data excluding seen ones
      const cachedRestaurants = await this.getCachedRestaurants(location, radiusInMeters);
      if (cachedRestaurants) {
        const filteredCached = await BlacklistService.filterBlacklistedRestaurants(cachedRestaurants);
        const unseenCached = filteredCached.filter(
          restaurant => !seenRestaurantIds.includes(restaurant.id)
        );
        if (unseenCached.length > 0) {
          return this.shuffleArray(unseenCached);
        }
      }

      // Last resort: return shuffled cached data (repeating restaurants)
      if (cachedRestaurants) {
        const filteredFallback = await BlacklistService.filterBlacklistedRestaurants(cachedRestaurants);
        return this.shuffleArray(filteredFallback);
      }

      const mockData = this.getMockRestaurantsWithRandomOrder();
      return await BlacklistService.filterBlacklistedRestaurants(mockData);
    } catch (error) {
      console.error("Error fetching fresh restaurants:", error);
      const mockData = this.getMockRestaurantsWithRandomOrder();
      return await BlacklistService.filterBlacklistedRestaurants(mockData);
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
      const categories =
        "catering.restaurant,catering.fast_food,catering.cafe,catering.bar";
      const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${location.longitude},${location.latitude},${radiusInMeters}&bias=proximity:${location.longitude},${location.latitude}&limit=${maxResults}&apiKey=${GEOAPIFY_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }

      const data: GeoapifyResponse = await response.json();

      // Log raw API response for debugging
      console.log("=== GEOAPIFY API RESPONSE ===");
      console.log("Total features returned:", data.features.length);

      // Convert Geoapify features to restaurants (basic info only)
      const restaurants = data.features
        .filter((feature) => feature.properties.name) // Only include places with names
        .map((feature, index) => {
          console.log(`\n--- Restaurant ${index + 1} RAW DATA ---`);
          console.log("Full feature object:", JSON.stringify(feature, null, 2));

          const restaurant = this.convertGeoapifyFeatureToRestaurant(feature, location);

          console.log(`\n--- Restaurant ${index + 1} CONVERTED DATA ---`);
          console.log("Converted restaurant object:", JSON.stringify(restaurant, null, 2));

          return restaurant;
        });

      return restaurants;
    } catch (error) {
      console.error("Error fetching from Geoapify:", error);
      return [];
    }
  }

  /**
   * Fetch detailed restaurant information when user selects a restaurant
   */
  static async fetchRestaurantDetails(restaurantId: string, userLocation?: LocationCoordinates): Promise<Restaurant | null> {
    try {
      if (!GEOAPIFY_API_KEY) {
        console.warn("Geoapify API key not configured, cannot fetch details");
        return null;
      }

      const detailsUrl = `https://api.geoapify.com/v2/place-details?id=${restaurantId}&apiKey=${GEOAPIFY_API_KEY}`;

      console.log(`\n=== FETCHING RESTAURANT DETAILS ===`);
      console.log(`Place ID: ${restaurantId}`);

      const response = await fetch(detailsUrl);

      if (!response.ok) {
        console.warn(`Place Details API error: ${response.status}`);
        return null;
      }

      const detailsData = await response.json();
      console.log("Place Details API response:", JSON.stringify(detailsData, null, 2));

      if (detailsData.features && detailsData.features.length > 0) {
        // Use provided user location or fallback to dummy location if not available
        const locationForDistance = userLocation || { latitude: 0, longitude: 0 };
        const detailedRestaurant = this.convertDetailedFeatureToRestaurant(detailsData.features[0], locationForDistance);

        console.log("Detailed restaurant data:", JSON.stringify(detailedRestaurant, null, 2));
        return detailedRestaurant;
      }

      return null;
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      return null;
    }
  }

  /**
   * Fetch detailed place information using Geoapify Place Details API (internal method)
   */
  private static async fetchPlaceDetails(
    feature: GeoapifyFeature,
    userLocation: LocationCoordinates
  ): Promise<Restaurant> {
    try {
      const placeId = feature.properties.place_id;
      const detailsUrl = `https://api.geoapify.com/v2/place-details?id=${placeId}&apiKey=${GEOAPIFY_API_KEY}`;

      console.log(`Fetching details for place ID: ${placeId}`);

      const response = await fetch(detailsUrl);

      if (!response.ok) {
        console.warn(`Place Details API error: ${response.status}, falling back to basic data`);
        return this.convertGeoapifyFeatureToRestaurant(feature, userLocation);
      }

      const detailsData = await response.json();
      console.log("Place Details API response:", JSON.stringify(detailsData, null, 2));

      // Use detailed data if available, otherwise fall back to basic conversion
      if (detailsData.features && detailsData.features.length > 0) {
        return this.convertDetailedFeatureToRestaurant(detailsData.features[0], userLocation);
      } else {
        return this.convertGeoapifyFeatureToRestaurant(feature, userLocation);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      // Fall back to basic conversion if details fetch fails
      return this.convertGeoapifyFeatureToRestaurant(feature, userLocation);
    }
  }

  /**
   * Convert detailed Geoapify feature to our Restaurant interface
   */
  private static convertDetailedFeatureToRestaurant(
    feature: GeoapifyFeature,
    userLocation: LocationCoordinates
  ): Restaurant {
    const [longitude, latitude] = feature.geometry.coordinates;

    const props = feature.properties;
    const raw = props.datasource?.raw || {};

    // Extract address from the new API format
    let address: string | undefined;
    if (props.formatted) {
      address = props.formatted;
    } else if (props.address_line1 && props.address_line2) {
      address = `${props.address_line1}, ${props.address_line2}`;
    } else {
      // Build address from individual components
      const addressComponents = [
        props.housenumber,
        props.street,
        props.city,
        props.state,
        props.postcode,
        props.country
      ].filter(Boolean);
      address = addressComponents.length > 0 ? addressComponents.join(", ") : undefined;
    }

    // Extract phone number
    const phoneNumber = raw.phone || undefined;

    // Extract opening hours
    const openingHours = raw.opening_hours || undefined;

    // Generate a realistic rating
    const rating = Math.round((3.5 + Math.random() * 1.3) * 10) / 10;

    return {
      id: props.place_id,
      name: props.name || "Restaurant",
      cuisine: this.extractCuisineFromGeoapify(feature),
      image: this.getCuisineSpecificImage(this.extractCuisineFromGeoapify(feature)),
      rating: rating,
      latitude: latitude,
      longitude: longitude,
      description: this.generateGeoapifyDescription(feature),
      address: address,
      phoneNumber: phoneNumber,
      priceRange: this.generateRandomPriceRange(),
      isOpen: undefined, // Could be determined from opening_hours if needed
      hours: openingHours,
      dataSource: 'api' as const,
    };
  }

  /**
   * Convert Geoapify feature to our Restaurant interface (fallback method)
   */
  private static convertGeoapifyFeatureToRestaurant(
    feature: GeoapifyFeature,
    userLocation: LocationCoordinates
  ): Restaurant {
    const [longitude, latitude] = feature.geometry.coordinates;

    const props = feature.properties;
    const raw = props.datasource?.raw || {};

    // Extract address from the new API format (same logic as detailed method)
    let address: string | undefined;
    if (props.formatted) {
      address = props.formatted;
    } else if (props.address_line1 && props.address_line2) {
      address = `${props.address_line1}, ${props.address_line2}`;
    } else {
      // Build address from individual components
      const addressComponents = [
        props.housenumber,
        props.street,
        props.city,
        props.state,
        props.postcode,
        props.country
      ].filter(Boolean);
      address = addressComponents.length > 0 ? addressComponents.join(", ") : undefined;
    }

    // Generate a realistic rating
    const rating = Math.round((3.5 + Math.random() * 1.3) * 10) / 10; // Between 3.5-4.8

    return {
      id: props.place_id,
      name: props.name || "Restaurant",
      cuisine: this.extractCuisineFromGeoapify(feature),
      image: this.getCuisineSpecificImage(
        this.extractCuisineFromGeoapify(feature)
      ),
      rating: rating,
      latitude: latitude,
      longitude: longitude,
      description: this.generateGeoapifyDescription(feature),
      address: address,
      phoneNumber: raw.phone || undefined,
      priceRange: this.generateRandomPriceRange(),
      isOpen: undefined, // Geoapify opening hours are complex to parse
      hours: raw.opening_hours,
      dataSource: 'api' as const,
    };
  }

  /**
   * Extract cuisine type from Geoapify feature
   */
  private static extractCuisineFromGeoapify(feature: GeoapifyFeature): string {
    // Check if there's a specific cuisine in the catering object (new API format)
    const cateringCuisine = feature.properties.catering?.cuisine;
    if (cateringCuisine) {
      console.log(
        `Found catering cuisine: ${cateringCuisine} for ${feature.properties.name}`
      );
      return this.normalizeCuisine(cateringCuisine);
    }

    // Check if there's a specific cuisine in the raw data (fallback)
    const rawCuisine = feature.properties.datasource.raw.cuisine;
    if (rawCuisine) {
      console.log(
        `Found raw cuisine: ${rawCuisine} for ${feature.properties.name}`
      );
      return this.normalizeCuisine(rawCuisine);
    }

    // Try to infer cuisine from restaurant name
    const restaurantName = feature.properties.name?.toLowerCase() || "";
    const nameBasedCuisine = this.inferCuisineFromName(restaurantName);
    if (nameBasedCuisine) {
      console.log(
        `Inferred cuisine from name: ${nameBasedCuisine} for ${feature.properties.name}`
      );
      return nameBasedCuisine;
    }

    // Extract from categories
    const categories = feature.properties.categories;
    if (categories.includes("catering.fast_food")) return "Fast Food";
    if (categories.includes("catering.cafe")) return "Cafe";
    if (categories.includes("catering.bar")) return "Bar & Grill";
    if (categories.includes("catering.restaurant")) {
      // If it's just a generic restaurant, assign a random cuisine to add variety
      console.log(
        `Generic restaurant detected: ${feature.properties.name}, assigning random cuisine`
      );
      return this.getRandomCuisine();
    }

    return this.getRandomCuisine();
  }

  /**
   * Infer cuisine type from restaurant name
   */
  private static inferCuisineFromName(name: string): string | null {
    const nameIndicators: { [key: string]: string } = {
      // Italian indicators
      pizza: "Italian",
      pizzeria: "Italian",
      pasta: "Italian",
      italiano: "Italian",
      trattoria: "Italian",
      ristorante: "Italian",

      // Chinese indicators
      china: "Chinese",
      chinese: "Chinese",
      dragon: "Chinese",
      panda: "Chinese",
      wok: "Chinese",
      szechuan: "Chinese",
      hunan: "Chinese",

      // Japanese indicators
      sushi: "Japanese",
      ramen: "Japanese",
      hibachi: "Japanese",
      sakura: "Japanese",
      yamato: "Japanese",
      tokyo: "Japanese",

      // Mexican indicators
      taco: "Mexican",
      burrito: "Mexican",
      mexican: "Mexican",
      cantina: "Mexican",
      casa: "Mexican",
      "el ": "Mexican",
      "la ": "Mexican",

      // Indian indicators
      indian: "Indian",
      curry: "Indian",
      tandoor: "Indian",
      masala: "Indian",
      spice: "Indian",

      // Thai indicators
      thai: "Thai",
      pad: "Thai",
      bangkok: "Thai",

      // French indicators
      bistro: "French",
      cafe: "French",
      brasserie: "French",
      "le ": "French",

      // American indicators
      burger: "American",
      bbq: "American",
      grill: "American",
      diner: "American",
      steakhouse: "American",
    };

    for (const [indicator, cuisine] of Object.entries(nameIndicators)) {
      if (name.includes(indicator)) {
        return cuisine;
      }
    }

    return null;
  }

  /**
   * Get a random cuisine for variety when specific cuisine cannot be determined
   */
  private static getRandomCuisine(): string {
    const cuisines = [
      "Italian",
      "Chinese",
      "Japanese",
      "Mexican",
      "Indian",
      "American",
      "Thai",
      "French",
      "Korean",
      "Mediterranean",
    ];
    return cuisines[Math.floor(Math.random() * cuisines.length)];
  }

  /**
   * Normalize cuisine names
   */
  private static normalizeCuisine(cuisine: string): string {
    const cuisineMap: { [key: string]: string } = {
      chinese: "Chinese",
      italian: "Italian",
      japanese: "Japanese",
      mexican: "Mexican",
      indian: "Indian",
      french: "French",
      thai: "Thai",
      korean: "Korean",
      vietnamese: "Vietnamese",
      mediterranean: "Mediterranean",
      american: "American",
      seafood: "Seafood",
      pizza: "Pizza",
      burger: "American",
      sushi: "Japanese",
    };

    const lowercaseCuisine = cuisine.toLowerCase();
    return cuisineMap[lowercaseCuisine] || this.capitalizeFirst(cuisine);
  }

  /**
   * Generate description for Geoapify restaurant
   */
  private static generateGeoapifyDescription(feature: GeoapifyFeature): string {
    const name = feature.properties.name || "Restaurant";
    const cuisine = this.extractCuisineFromGeoapify(feature);

    let description = `Discover ${name}`;

    if (cuisine !== "Restaurant") {
      description += ` serving ${cuisine} cuisine`;
    }

    description +=
      ". A local dining spot in your neighborhood with great food and atmosphere.";

    return description;
  }

  /**
   * Get cuisine-specific food images
   */
  private static getCuisineSpecificImage(cuisine: string): string {
    const cuisineImages: { [key: string]: string[] } = {
      Italian: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop", // Pizza
        "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop", // Pasta
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop", // Italian restaurant
      ],
      Japanese: [
        "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop", // Sushi
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop", // Ramen
        "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop", // Japanese food
      ],
      Mexican: [
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop", // Tacos
        "https://images.unsplash.com/photo-1565299585323-38174c26efe4?w=400&h=300&fit=crop", // Mexican food
        "https://images.unsplash.com/photo-1624300629840-b5d88c8e7b8b?w=400&h=300&fit=crop", // Mexican restaurant
      ],
      Chinese: [
        "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop", // Chinese food
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop", // Chinese noodles
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop", // Chinese dishes
      ],
      Indian: [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop", // Indian curry
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop", // Indian food
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", // Indian restaurant
      ],
      American: [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", // Burger
        "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop", // American diner
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", // American food
      ],
      French: [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop", // French restaurant
        "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop", // French cuisine
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop", // French bistro
      ],
      Thai: [
        "https://images.unsplash.com/photo-1559314809-0f31657faf33?w=400&h=300&fit=crop", // Thai curry
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop", // Thai food
        "https://images.unsplash.com/photo-1604263439201-171fb4d1b13c?w=400&h=300&fit=crop", // Thai restaurant
      ],
      Korean: [
        "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop", // Korean BBQ
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", // Korean food
        "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop", // Korean dishes
      ],
      Mediterranean: [
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop", // Mediterranean
        "https://images.unsplash.com/photo-1554200876-56c2f25224fa?w=400&h=300&fit=crop", // Mediterranean food
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop", // Mediterranean cuisine
      ],
      Vegetarian: [
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop", // Vegetarian salad
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", // Healthy bowl
        "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop", // Plant-based food
      ],
      "Fast Food": [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", // Burger
        "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop", // Fast food restaurant
        "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop", // Fast casual
      ],
      Cafe: [
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop", // Coffee shop
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop", // Cafe interior
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop", // Coffee and pastries
      ],
      "Bar & Grill": [
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400&h=300&fit=crop", // Bar food
        "https://images.unsplash.com/photo-1572952829653-51ee360afe6c?w=400&h=300&fit=crop", // Grill food
        "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&h=300&fit=crop", // Bar & grill
      ],
    };

    const cuisineKey = cuisine as keyof typeof cuisineImages;
    const images = cuisineImages[cuisineKey] || [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop", // Generic restaurant
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop", // Generic dining
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop", // Generic food
    ];

    const selectedImage = images[Math.floor(Math.random() * images.length)];
    console.log(`Selected ${cuisine} image: ${selectedImage}`);
    return selectedImage;
  }

  /**
   * Generate random price range
   */
  private static generateRandomPriceRange(): "$" | "$$" | "$$$" | "$$$$" {
    const priceRanges: ("$" | "$$" | "$$$" | "$$$$")[] = [
      "$",
      "$$",
      "$$",
      "$$$",
    ]; // Weight towards more affordable
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
  private static getCacheKey(
    location: LocationCoordinates,
    radiusInMeters: number
  ): string {
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

      console.log("\n=== USING CACHED RESTAURANT DATA ===");
      console.log("Cached restaurants data:", JSON.stringify(cachedData.restaurants, null, 2));
      return cachedData.restaurants;
    } catch (error) {
      console.error("Error reading cache:", error);
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
      console.log("Cached restaurant data");
    } catch (error) {
      console.error("Error caching data:", error);
    }
  }

  /**
   * Update restaurant with user-provided image URL
   */
  static async updateRestaurantImage(
    restaurantId: string,
    imageUrl: string,
    location: LocationCoordinates,
    radiusInMeters: number = 5000
  ): Promise<boolean> {
    try {
      // Get current cached restaurants to find and update the specific one
      const cachedRestaurants = await this.getCachedRestaurants(location, radiusInMeters);
      if (!cachedRestaurants) {
        console.log('No cached restaurants found to update');
        return false;
      }

      // Find the restaurant to update
      const restaurantIndex = cachedRestaurants.findIndex(r => r.id === restaurantId);
      if (restaurantIndex === -1) {
        console.log(`Restaurant with ID ${restaurantId} not found in cache`);
        return false;
      }

      // Update the restaurant with new image and mark as user-contributed
      const updatedRestaurant: Restaurant = {
        ...cachedRestaurants[restaurantIndex],
        image: imageUrl,
        dataSource: 'user-contributed'
      };

      // Update the local array
      const updatedRestaurants = [...cachedRestaurants];
      updatedRestaurants[restaurantIndex] = updatedRestaurant;

      // Save to both local and shared cache
      await Promise.all([
        this.cacheRestaurants(location, radiusInMeters, updatedRestaurants),
        SharedCacheService.setSharedCache(location, radiusInMeters, updatedRestaurants)
      ]);

      console.log(`Successfully updated restaurant ${restaurantId} with user-provided image`);
      return true;
    } catch (error) {
      console.error('Error updating restaurant image:', error);
      return false;
    }
  }

  /**
   * Clear only API-sourced restaurants from cache
   */
  static async clearAPIRestaurants(
    location: LocationCoordinates,
    radiusInMeters: number = 5000
  ): Promise<void> {
    try {
      // Get current cached restaurants
      const cachedRestaurants = await this.getCachedRestaurants(location, radiusInMeters);
      if (!cachedRestaurants) {
        console.log('No cached restaurants to clear');
        return;
      }

      // Keep only user-contributed restaurants
      const userContributedRestaurants = cachedRestaurants.filter(
        restaurant => restaurant.dataSource === 'user-contributed'
      );

      console.log(`Cleared ${cachedRestaurants.length - userContributedRestaurants.length} API restaurants, kept ${userContributedRestaurants.length} user-contributed ones`);

      // Update cache with only user-contributed data
      if (userContributedRestaurants.length > 0) {
        await this.cacheRestaurants(location, radiusInMeters, userContributedRestaurants);
      } else {
        // Clear cache entirely if no user contributions
        const cacheKey = this.getCacheKey(location, radiusInMeters);
        await AsyncStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('Error clearing API restaurants:', error);
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
    console.log("\n=== USING MOCK RESTAURANT DATA ===");
    const mockRestaurants = [
      {
        id: "1",
        name: "Giuseppe's Italian Kitchen",
        cuisine: "Italian",
        image: this.getCuisineSpecificImage("Italian"),
        rating: 4.5,
        latitude: 37.7849,
        longitude: -122.4094,
        description:
          "Authentic Italian cuisine with fresh pasta made daily. Family-owned restaurant serving traditional recipes passed down through generations.",
        address: "123 Main Street, Downtown",
        phoneNumber: "(555) 123-4567",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:00 AM - 10:00 PM",
        dataSource: "api" as const,
      },
      {
        id: "2",
        name: "Sakura Sushi & Ramen",
        cuisine: "Japanese",
        image: this.getCuisineSpecificImage("Japanese"),
        rating: 4.8,
        latitude: 37.7869,
        longitude: -122.4076,
        description:
          "Fresh sushi and authentic ramen bowls. Our chefs trained in Tokyo bring you the most authentic Japanese dining experience.",
        address: "456 Oak Avenue, Midtown",
        phoneNumber: "(555) 234-5678",
        priceRange: "$$$" as const,
        isOpen: true,
        hours: "12:00 PM - 11:00 PM",
        dataSource: "api" as const,
      },
      {
        id: "3",
        name: "Taco Libre",
        cuisine: "Mexican",
        image: this.getCuisineSpecificImage("Mexican"),
        rating: 4.2,
        latitude: 37.7899,
        longitude: -122.4089,
        description:
          "Street-style tacos with house-made salsas and fresh ingredients. Don't miss our famous fish tacos and craft margaritas!",
        address: "789 Pine Street, Arts District",
        phoneNumber: "(555) 345-6789",
        priceRange: "$" as const,
        isOpen: false,
        hours: "4:00 PM - 12:00 AM",
        dataSource: "api" as const,
      },
      {
        id: "4",
        name: "The Burger Joint",
        cuisine: "American",
        image: this.getCuisineSpecificImage("American"),
        rating: 4.0,
        latitude: 37.7829,
        longitude: -122.4058,
        description:
          "Gourmet burgers made with locally sourced beef and artisanal buns. Try our signature truffle fries!",
        address: "321 Elm Street, University District",
        phoneNumber: "(555) 456-7890",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:00 AM - 2:00 AM",
        dataSource: "api" as const,
      },
      {
        id: "5",
        name: "Green Garden Cafe",
        cuisine: "Vegetarian",
        image: this.getCuisineSpecificImage("Vegetarian"),
        rating: 4.6,
        latitude: 37.7879,
        longitude: -122.4102,
        description:
          "Plant-based cuisine that doesn't compromise on flavor. Organic, locally-sourced ingredients in every dish.",
        address: "654 Maple Drive, Green Valley",
        phoneNumber: "(555) 567-8901",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "8:00 AM - 9:00 PM",
        dataSource: "api" as const,
      },
      {
        id: "6",
        name: "Le Petit Bistro",
        cuisine: "French",
        image: this.getCuisineSpecificImage("French"),
        rating: 4.7,
        latitude: 37.7919,
        longitude: -122.4112,
        description:
          "Classic French bistro fare in an intimate setting. Our wine selection features over 200 bottles from French vineyards.",
        address: "987 Boulevard Street, Historic Quarter",
        phoneNumber: "(555) 678-9012",
        priceRange: "$$$" as const,
        isOpen: true,
        hours: "5:00 PM - 11:00 PM",
        dataSource: "api" as const,
      },
      {
        id: "7",
        name: "Spice Route",
        cuisine: "Indian",
        image: this.getCuisineSpecificImage("Indian"),
        rating: 4.4,
        latitude: 37.7969,
        longitude: -122.4142,
        description:
          "Aromatic Indian cuisine with both traditional and modern interpretations. Our tandoor oven creates the perfect naan and kebabs.",
        address: "147 Curry Lane, Little India",
        phoneNumber: "(555) 789-0123",
        priceRange: "$$" as const,
        isOpen: true,
        hours: "11:30 AM - 10:30 PM",
        dataSource: "api" as const,
      },
      {
        id: "8",
        name: "Dragon Palace",
        cuisine: "Chinese",
        image: this.getCuisineSpecificImage("Chinese"),
        rating: 4.1,
        latitude: 37.7939,
        longitude: -122.4122,
        description:
          "Authentic Szechuan and Cantonese dishes. Family recipes that have been perfected over decades.",
        address: "258 Dynasty Road, Chinatown",
        phoneNumber: "(555) 890-1234",
        priceRange: "$$" as const,
        isOpen: false,
        hours: "12:00 PM - 10:00 PM",
        dataSource: "api" as const,
      },
    ];

    console.log("Mock restaurants data:", JSON.stringify(mockRestaurants, null, 2));
    return this.shuffleArray(mockRestaurants);
  }
}
