import { SwipeDeckScreen } from '@/screens/SwipeDeckScreen';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  // Create a navigation object that works with Expo Router
  const navigation = {
    navigate: (screen: string, params?: any) => {
      if (screen === 'RestaurantDetail') {
        router.push({
          pathname: '/restaurant-detail',
          params: { restaurantData: JSON.stringify(params.restaurant) }
        });
      }
    },
    goBack: () => router.back(),
  };

  return <SwipeDeckScreen navigation={navigation} />;
}
