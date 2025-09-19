import { RestaurantDetailScreen } from '@/screens/RestaurantDetailScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Restaurant } from '@/types/restaurant';

export default function RestaurantDetailRoute() {
  const { restaurantData } = useLocalSearchParams();
  const router = useRouter();

  const restaurant: Restaurant = JSON.parse(restaurantData as string);

  const navigation = {
    goBack: () => router.back(),
  };

  const route = {
    params: {
      restaurant,
    },
  };

  return <RestaurantDetailScreen route={route} navigation={navigation} />;
}