# RandoBites - Tinder for Restaurants

A React Native app built with Expo that lets users swipe through restaurants like Tinder.

## Features

- **Swipe Interface**: Swipe left to dismiss, swipe right to match
- **Restaurant Cards**: Beautiful cards with restaurant info, ratings, and images
- **Detail View**: Full restaurant details when you match or tap a card
- **Contact Integration**: Call restaurants or get directions directly from the app
- **Mock Data**: Currently uses mock restaurant data (easily replaceable with API)

## Project Structure

```
├── components/
│   └── RestaurantCard.tsx      # Reusable restaurant card component
├── screens/
│   ├── SwipeDeckScreen.tsx     # Main swiping interface
│   └── RestaurantDetailScreen.tsx # Restaurant detail view
├── types/
│   └── restaurant.ts           # TypeScript interface for Restaurant
├── data/
│   └── mockRestaurants.ts      # Mock data (replace with API calls)
└── app/
    ├── (tabs)/index.tsx        # Home screen (swipe deck)
    └── restaurant-detail.tsx   # Detail screen route
```

## Key Components

### RestaurantCard
- Displays restaurant image, name, cuisine, rating, distance
- Shows open/closed status
- Handles touch interactions
- Responsive design for different screen sizes

### SwipeDeckScreen
- Uses `react-native-deck-swiper` for Tinder-like swiping
- Handles swipe left (dismiss) and swipe right (match) logic
- Shows overlay labels for visual feedback
- Tracks remaining restaurants
- Navigation to detail screen on match

### RestaurantDetailScreen
- Full restaurant information display
- Contact integration (call, directions)
- Scrollable content with hero image
- Back navigation to swipe deck

## Data Structure

```typescript
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  rating: number;
  distance: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  isOpen?: boolean;
  hours?: string;
}
```

## Extending with Real Data

To replace mock data with real restaurant data (Yelp, Google Places, etc.):

1. **Create API service**: Create `services/restaurantApi.ts`
2. **Replace mock data**: Update `SwipeDeckScreen.tsx` to fetch from API
3. **Add loading states**: Implement loading indicators
4. **Error handling**: Add error boundaries and retry logic
5. **Location services**: Add user location for nearby restaurants

Example API integration:
```typescript
// services/restaurantApi.ts
export const fetchNearbyRestaurants = async (lat: number, lng: number) => {
  // Your API call here
  const response = await fetch(`/api/restaurants?lat=${lat}&lng=${lng}`);
  return response.json();
};
```

## Customization

### Theming
- Colors are defined in component styles
- Easy to extract to a theme system
- Dark theme is currently the default

### Swipe Behavior
- Swipe threshold can be adjusted in `SwipeDeckScreen.tsx`
- Overlay labels can be customized
- Stack size and separation are configurable

### Cards
- Card dimensions are responsive (90% width, 70% height)
- Easy to modify layout in `RestaurantCard.tsx`
- Image sources can be local or remote

## Performance Considerations

- Images are loaded on-demand
- Card stack is limited to 3 cards for performance
- Restaurant data should be paginated for large datasets
- Consider image caching for production

## Next Steps

1. **User Authentication**: Add user accounts and preferences
2. **Favorites**: Save matched restaurants
3. **Filters**: Add cuisine, price, distance filters
4. **Reviews**: Integrate user reviews and photos
5. **Map Integration**: Show restaurants on a map
6. **Push Notifications**: Restaurant deals and updates
7. **Social Features**: Share favorites with friends