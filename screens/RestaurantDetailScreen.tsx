import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { Restaurant } from '../types/restaurant';

interface RestaurantDetailScreenProps {
  route: {
    params: {
      restaurant: Restaurant;
    };
  };
  navigation: any;
}


export const RestaurantDetailScreen: React.FC<RestaurantDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { restaurant } = route.params;

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

  const handleCall = () => {
    if (restaurant.phoneNumber) {
      Linking.openURL(`tel:${restaurant.phoneNumber}`);
    } else {
      Alert.alert("Phone Not Available", "This restaurant's phone number is not available.");
    }
  };

  const handleDirections = () => {
    if (restaurant.address) {
      const encodedAddress = encodeURIComponent(restaurant.address);
      Linking.openURL(`maps://app?daddr=${encodedAddress}`);
    } else {
      Alert.alert("Address Not Available", "This restaurant's address is not available for directions.");
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSwipeAgain = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <ImageBackground
          source={{ uri: restaurant.image }}
          style={styles.heroImage}
          imageStyle={styles.heroImageStyle}
        >
          <View style={styles.heroOverlay} />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Status Badge */}
          {restaurant.isOpen !== undefined && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: restaurant.isOpen ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {restaurant.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Restaurant Name and Basic Info */}
          <View style={styles.headerSection}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.cuisine}>{restaurant.cuisine} Cuisine</Text>

            <View style={styles.quickInfo}>
              <View style={styles.ratingContainer}>
                <Text style={styles.stars}>{renderStars(restaurant.rating)}</Text>
                <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)} rating</Text>
              </View>

              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>{restaurant.distance} mi away</Text>
                {restaurant.priceRange && (
                  <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Description */}
          {restaurant.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{restaurant.description}</Text>
            </View>
          )}

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact & Location</Text>

            {restaurant.address && (
              <TouchableOpacity style={styles.contactItem} onPress={handleDirections}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>{restaurant.address}</Text>
                <Text style={styles.contactAction}>Tap for directions →</Text>
              </TouchableOpacity>
            )}

            {restaurant.phoneNumber && (
              <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{restaurant.phoneNumber}</Text>
                <Text style={styles.contactAction}>Tap to call →</Text>
              </TouchableOpacity>
            )}

            {restaurant.hours && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Hours</Text>
                <Text style={styles.contactValue}>{restaurant.hours}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !restaurant.phoneNumber && styles.disabledButton
              ]}
              onPress={handleCall}
              disabled={!restaurant.phoneNumber}
            >
              <Text style={[
                styles.actionButtonText,
                !restaurant.phoneNumber && styles.disabledButtonText
              ]}>
                {restaurant.phoneNumber ? 'Call Restaurant' : 'Phone Not Available'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                !restaurant.address && styles.disabledButton
              ]}
              onPress={handleDirections}
              disabled={!restaurant.address}
            >
              <Text style={[
                styles.actionButtonText,
                !restaurant.address && styles.disabledButtonText
              ]}>
                {restaurant.address ? 'Get Directions' : 'Address Not Available'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.swipeAgainButton}
              onPress={handleSwipeAgain}
            >
              <Text style={styles.swipeAgainText}>← Back to Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    height: 300,
    width: '100%',
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
    paddingHorizontal: 20,
    paddingVertical: 30,
    minHeight: 500,
  },
  headerSection: {
    marginBottom: 25,
  },
  restaurantName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cuisine: {
    fontSize: 18,
    color: '#4ECDC4',
    marginBottom: 15,
    fontWeight: '500',
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 18,
    color: '#FFD700',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 16,
    color: '#999',
    marginRight: 10,
  },
  priceRange: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  contactItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  contactLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  contactAction: {
    fontSize: 14,
    color: '#4ECDC4',
    fontStyle: 'italic',
  },
  actionSection: {
    marginBottom: 25,
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#ccc',
  },
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  swipeAgainButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  swipeAgainText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
});