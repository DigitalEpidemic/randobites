# RandoBites 🍽️

A React Native app built with Expo that helps users discover restaurants with a Tinder-like swiping interface. Swipe through nearby restaurants, get detailed information, and find your next dining experience.

## Features

- **Tinder-style Swiping**: Swipe left to dismiss, right to save restaurants
- **Real Restaurant Data**: Integration with Geoapify API for authentic restaurant information
- **Location-based Discovery**: Find restaurants near your current location
- **Restaurant Details**: View comprehensive information including cuisine, ratings, and contact info
- **Shared Cache System**: Uses Supabase for efficient data sharing and reduced API calls
- **Blacklist Management**: Automatically filters out previously dismissed restaurants
- **Cross-platform**: Runs on iOS, Android, and web

## Tech Stack

- **Framework**: React Native with Expo 54
- **Router**: Expo Router with TypeScript
- **UI**: Custom components with react-native-deck-swiper
- **APIs**: Geoapify for restaurant data
- **Backend**: Supabase for shared caching
- **Storage**: AsyncStorage for local data persistence
- **Location**: expo-location for GPS functionality
- **Testing**: Jest with React Native Testing Library

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file with your API keys:

   ```bash
   EXPO_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_key
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Start the development server**

   ```bash
   npx expo start
   ```

4. **Open the app**
   - Use Expo Go app on your device
   - Run on iOS Simulator or Android Emulator
   - Open in web browser

## Project Structure

```
├── app/                         # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx            # Home screen with swipe deck
│   │   └── debug.tsx            # Debug/testing screen
│   ├── restaurant-detail.tsx    # Restaurant detail view
│   └── settings.tsx             # App settings
├── components/                  # Reusable UI components
│   ├── RestaurantCard.tsx       # Individual restaurant card
│   ├── BulkImageManager.tsx     # Image management utilities
│   └── ui/                      # Base UI components
├── services/                    # Business logic and API calls
│   ├── restaurantService.ts     # Geoapify API integration
│   ├── locationService.ts       # GPS and location handling
│   ├── sharedCacheService.ts    # Supabase cache management
│   ├── blacklistService.ts      # Restaurant filtering logic
│   └── supabaseClient.ts        # Database connection
├── screens/                     # Screen components
│   └── SwipeDeckScreen.tsx      # Main swiping interface
├── types/                       # TypeScript definitions
│   └── restaurant.ts            # Restaurant data model
└── hooks/                       # Custom React hooks
    └── useRestaurants.ts        # Restaurant data fetching
```

## API Setup

### Geoapify (Required)

1. Sign up at [geoapify.com](https://geoapify.com)
2. Create an API key
3. Add to your `.env` file

### Supabase (Optional - for shared caching)

1. Create project at [supabase.com](https://supabase.com)
2. Run the SQL setup from `SUPABASE_SETUP.md`
3. Add credentials to `.env` file

See `GEOAPIFY_SETUP.md` and `SUPABASE_SETUP.md` for detailed setup instructions.

## Development Commands

```bash
# Development
npm start                # Start Expo dev server
npm run android          # Run on Android
npm run ios              # Run on iOS
npm run web              # Run in browser

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Check code style
```

## Key Features Explained

### Restaurant Discovery

- Fetches real restaurant data from Geoapify API
- Caches data locally and in Supabase for performance
- Filters based on user location and preferences

### Swiping Interface

- Smooth card animations with react-native-deck-swiper
- Visual feedback with overlay labels
- Automatic progression through restaurant stack

### Data Management

- Smart caching system reduces API calls
- Blacklist prevents showing dismissed restaurants
- Shared cache benefits all users in the same area

## Testing

The app includes comprehensive test coverage for core functionality:

```bash
npm test                   # Run all tests
npm run test:coverage      # Generate coverage report
```

Tests cover:

- Restaurant service API integration
- Location service functionality
- Cache management
- Component rendering and interactions

## Deployment

The app is configured for deployment with Expo Application Services (EAS):

```bash
# Build for production
eas build --platform all

# Submit to app stores
eas submit --platform all
```
