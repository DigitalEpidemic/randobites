import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-deck-swiper";
import { RestaurantCard } from "../components/RestaurantCard";
import { Restaurant } from "../types/restaurant";
import { LocationService } from "../services/locationService";
import { RestaurantService } from "../services/restaurantService";
import { SettingsService } from "../services/settingsService";

interface SwipeDeckScreenProps {
  navigation: any; // We'll type this properly when we set up navigation
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const SwipeDeckScreen: React.FC<SwipeDeckScreenProps> = ({
  navigation,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seenRestaurantIds, setSeenRestaurantIds] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [lastFetchLocation, setLastFetchLocation] = useState<any>(null);
  const swiperRef = useRef<Swiper<Restaurant>>(null);

  // Check if user has moved significantly to warrant new API call
  const hasMovedSignificantly = (oldLocation: any, newLocation: any): boolean => {
    if (!oldLocation) return true;
    const distance = LocationService.calculateDistance(oldLocation, newLocation);
    return distance > 0.5; // 500m threshold
  };

  // Fetch nearby restaurants on component mount
  useEffect(() => {
    fetchNearbyRestaurants();
  }, []);

  const fetchNearbyRestaurants = async (isRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's current location
      const location = await LocationService.getCurrentLocation();

      if (!location) {
        throw new Error('Unable to get your location. Please enable location services.');
      }

      // Check if user has moved significantly since last fetch
      if (!isRefresh && !hasMovedSignificantly(lastFetchLocation, location)) {
        console.log('User has not moved significantly, skipping API call');
        setIsLoading(false);
        return;
      }

      // Store current location for later use
      setCurrentLocation(location);
      setLastFetchLocation(location);

      // Get maximum radius from settings
      const maxRadiusKm = await SettingsService.getMaxRadius();
      const maxRadiusMeters = SettingsService.kmToMeters(maxRadiusKm);

      let nearbyRestaurants: Restaurant[];

      if (isRefresh && seenRestaurantIds.length > 0) {
        // Try to fetch fresh restaurants that haven't been seen
        nearbyRestaurants = await RestaurantService.fetchFreshRestaurants(
          location,
          maxRadiusMeters, // Use user's preferred radius
          500,   // max 500 restaurants
          seenRestaurantIds
        );
      } else {
        // Initial fetch or no restaurants seen yet
        nearbyRestaurants = await RestaurantService.fetchNearbyRestaurants(
          location,
          maxRadiusMeters, // Use user's preferred radius
          500    // max 500 restaurants
        );
      }

      if (nearbyRestaurants.length === 0) {
        throw new Error('No restaurants found in your area. Please try again later.');
      }

      setRestaurants(nearbyRestaurants);
      setCardIndex(0); // Reset card index
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load restaurants';
      setError(errorMessage);
      console.error('Error fetching restaurants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const retryFetchRestaurants = () => {
    fetchNearbyRestaurants(true); // Force refresh to get new restaurants
  };

  // Handle when user swipes left (dismiss)
  const onSwipedLeft = (cardIndex: number) => {
    const restaurant = restaurants[cardIndex];
    console.log("Dismissed:", restaurant.name);

    // Track this restaurant as seen
    setSeenRestaurantIds(prev => {
      if (!prev.includes(restaurant.id)) {
        return [...prev, restaurant.id];
      }
      return prev;
    });
  };

  // Handle when user swipes right (match)
  const onSwipedRight = (cardIndex: number) => {
    const restaurant = restaurants[cardIndex];
    console.log("Matched:", restaurant.name);

    // Track this restaurant as seen
    setSeenRestaurantIds(prev => {
      if (!prev.includes(restaurant.id)) {
        return [...prev, restaurant.id];
      }
      return prev;
    });

    // Navigate to detail screen
    navigation.navigate("RestaurantDetail", { restaurant });
  };

  // Handle when all cards are swiped
  const onSwipedAll = () => {
    const hasSeenRestaurants = seenRestaurantIds.length > 0;
    const alertMessage = hasSeenRestaurants
      ? "Looking for new restaurants within your set radius."
      : "Would you like to find more restaurants in your area?";

    Alert.alert(
      "No more restaurants!",
      alertMessage,
      [
        {
          text: "No thanks",
          style: "cancel",
        },
        {
          text: hasSeenRestaurants ? "Find new ones" : "Find more",
          onPress: () => {
            retryFetchRestaurants();
          },
        },
      ]
    );
  };

  // Handle card index change
  const onSwiping = (x: number, y: number) => {
    // You can add haptic feedback here
  };

  const renderCard = (restaurant: Restaurant, index: number) => {
    if (!restaurant) return null;

    return (
      <RestaurantCard
        key={restaurant.id}
        restaurant={restaurant}
        currentLocation={currentLocation}
      />
    );
  };

  const renderNoMoreCards = () => (
    <View style={styles.noMoreCards}>
      <Text style={styles.noMoreCardsText}>No more restaurants!</Text>
      <Text style={styles.noMoreCardsSubtext}>
        Check back later for more delicious options
      </Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4ECDC4" />
      <Text style={styles.loadingText}>Finding restaurants near you...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Oops!</Text>
      <Text style={styles.errorSubtext}>{error}</Text>
      <Text
        style={styles.retryButton}
        onPress={retryFetchRestaurants}
      >
        Tap to retry
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>RandoBites</Text>
            <Text style={styles.headerSubtitle}>
              Swipe right to match • Swipe left to pass
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Container */}
      <View style={styles.swiperContainer}>
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : restaurants.length > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={restaurants}
            renderCard={renderCard}
            onSwiped={(cardIndex) => setCardIndex(cardIndex + 1)}
            onSwipedLeft={onSwipedLeft}
            onSwipedRight={onSwipedRight}
            onSwipedAll={onSwipedAll}
            onSwiping={onSwiping}
            cardIndex={cardIndex}
            backgroundColor="transparent"
            stackSize={5}
            animateOverlayLabelsOpacity
            animateCardOpacity
            swipeBackCard
            disableBottomSwipe
            disableTopSwipe
            verticalSwipe={false}
            cardVerticalMargin={0}
            marginTop={0}
            marginBottom={0}
            // Swipe threshold (how far to swipe before card disappears)
            swipeThreshold={screenWidth * 0.25}
            // Overlay labels for visual feedback
            overlayLabels={{
              left: {
                title: "PASS",
                style: {
                  label: {
                    backgroundColor: "#FF6B6B",
                    borderColor: "#FF6B6B",
                    color: "white",
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: "bold",
                    padding: 10,
                    borderRadius: 10,
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: -30,
                  },
                },
              },
              right: {
                title: "MATCH!",
                style: {
                  label: {
                    backgroundColor: "#4ECDC4",
                    borderColor: "#4ECDC4",
                    color: "white",
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: "bold",
                    padding: 10,
                    borderRadius: 10,
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: 30,
                  },
                },
              },
            }}
          >
            {renderNoMoreCards()}
          </Swiper>
        ) : (
          renderNoMoreCards()
        )}
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  settingsIcon: {
    fontSize: 20,
  },
  swiperContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noMoreCards: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    alignSelf: "center",
  },
  noMoreCardsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  noMoreCardsSubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
  },
  loadingContainer: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    alignSelf: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
  errorContainer: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    alignSelf: "center",
  },
  errorText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    fontSize: 18,
    color: "#4ECDC4",
    textAlign: "center",
    fontWeight: "bold",
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    overflow: "hidden",
  },
});
