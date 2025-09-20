import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Restaurant } from '../types/restaurant';
import { LocationCoordinates, LocationService } from '../services/locationService';

interface RestaurantCardProps {
  restaurant: Restaurant;
  currentLocation?: LocationCoordinates;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  currentLocation,
}) => {
  const calculateDistance = (): number => {
    if (!currentLocation) {
      return 0; // Default fallback
    }

    const restaurantLocation: LocationCoordinates = {
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    };

    return LocationService.calculateDistance(currentLocation, restaurantLocation);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    return stars.join('');
  };

  return (
    <View
      style={styles.card}
    >
      <ImageBackground
        source={{ uri: restaurant.image }}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        {/* Gradient overlay for better text readability */}
        <View style={styles.overlay} />

        {/* Top section with status indicator */}
        <View style={styles.topSection}>
          {restaurant.isOpen !== undefined && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: restaurant.isOpen ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {restaurant.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom section with restaurant info */}
        <View style={styles.bottomSection}>
          <View style={styles.mainInfo}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
          </View>

          <View style={styles.details}>
            <View style={styles.ratingContainer}>
              <Text style={styles.stars}>{renderStars(restaurant.rating)}</Text>
              <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
            </View>

            <View style={styles.distanceContainer}>
              <Text style={styles.distance}>{calculateDistance().toFixed(1)} km</Text>
              {restaurant.priceRange && (
                <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
              )}
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#fff',
  },
  imageBackground: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  topSection: {
    flex: 1,
    alignItems: 'flex-end',
    padding: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSection: {
    padding: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  mainInfo: {
    marginBottom: 15,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cuisine: {
    fontSize: 18,
    color: '#f0f0f0',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 16,
    color: '#FFD700',
    marginRight: 8,
  },
  rating: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginRight: 10,
  },
  priceRange: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});