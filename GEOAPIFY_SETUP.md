# Geoapify API Setup

To enable real restaurant data fetching, you need to set up a Geoapify API key. Geoapify offers a **generous FREE tier** with 3,000 requests per day and **allows caching** to reduce API usage!

## Why Geoapify over Google Places?

- ✅ **3,000 FREE requests/day** (vs Google's 100-200)
- ✅ **Caching allowed** to reduce API usage
- ✅ **No credit card required** for free tier
- ✅ **Better pricing** for paid plans
- ✅ **Same quality data** from OpenStreetMap

## Setup Steps:

1. Go to [Geoapify](https://www.geoapify.com/)
2. Click "Get Started Free"
3. Create a free account (no credit card needed)
4. Go to your dashboard and create a new project
5. Copy your API key

## Configuration:

1. Open the `.env` file in the root directory
2. Uncomment and add your API key:
```env
EXPO_PUBLIC_GEOAPIFY_API_KEY=your_actual_api_key_here
```

Example:
```env
EXPO_PUBLIC_GEOAPIFY_API_KEY=1234567890abcdef1234567890abcdef
```

## Smart Caching System:

The app includes a built-in caching system that:
- **Caches restaurant data for 30 minutes**
- **Reduces API calls** when users return to the same area
- **Automatically clears expired cache**
- **Uses device storage** for offline-friendly experience

This means even with heavy usage, you'll likely stay well under the 3,000 daily request limit!

## Security:

- The `.env` file is already added to `.gitignore` to prevent accidentally committing your API key
- Never commit your actual API key to version control
- In production, use environment variables or secure secret management

## Fallback Behavior:

If no API key is configured, the app will automatically fall back to using randomized mock restaurant data, so the app will still function perfectly for testing and development.

## Data Quality:

Geoapify uses OpenStreetMap data, which includes:
- Restaurant names and locations
- Cuisine types
- Phone numbers and addresses
- Opening hours
- Real-world restaurant data from your area

The app enhances this with:
- Distance calculations
- Random realistic ratings
- Curated food images
- Smart randomization for discovery