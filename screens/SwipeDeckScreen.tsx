import React, { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import { RestaurantCard } from "../components/RestaurantCard";
import { mockRestaurants } from "../data/mockRestaurants";
import { Restaurant } from "../types/restaurant";

interface SwipeDeckScreenProps {
  navigation: any; // We'll type this properly when we set up navigation
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const SwipeDeckScreen: React.FC<SwipeDeckScreenProps> = ({
  navigation,
}) => {
  const [restaurants] = useState<Restaurant[]>(mockRestaurants);
  const [cardIndex, setCardIndex] = useState(0);
  const swiperRef = useRef<Swiper<Restaurant>>(null);

  // Handle when user swipes left (dismiss)
  const onSwipedLeft = (cardIndex: number) => {
    console.log("Dismissed:", restaurants[cardIndex].name);
    // You can add analytics tracking here
  };

  // Handle when user swipes right (match)
  const onSwipedRight = (cardIndex: number) => {
    const restaurant = restaurants[cardIndex];
    console.log("Matched:", restaurant.name);

    // Navigate to detail screen
    navigation.navigate("RestaurantDetail", { restaurant });
  };

  // Handle when all cards are swiped
  const onSwipedAll = () => {
    Alert.alert(
      "No more restaurants!",
      "You've seen all available restaurants. Check back later for more options!",
      [
        {
          text: "OK",
          onPress: () => {
            // Reset the deck or navigate elsewhere
            setCardIndex(0);
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
        onPress={() => {
          // Allow tapping the card to view details without swiping
          navigation.navigate("RestaurantDetail", { restaurant });
        }}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RandoBites</Text>
        <Text style={styles.headerSubtitle}>
          Swipe right to match • Swipe left to pass
        </Text>
      </View>

      {/* Swiper Container */}
      <View style={styles.swiperContainer}>
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
          swipeThreshold={screenWidth * 0.3}
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
      </View>

      {/* Action Buttons (Optional - users can swipe or tap these) */}
      <View style={styles.actionButtons}>
        <Text style={styles.actionButtonsText}>
          {cardIndex < restaurants.length
            ? `${restaurants.length - cardIndex} restaurants left`
            : "All done!"}
        </Text>
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
  swiperContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
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
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  actionButtonsText: {
    fontSize: 14,
    color: "#666",
  },
});
