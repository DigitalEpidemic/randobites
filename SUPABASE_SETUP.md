# Supabase Setup for Shared Restaurant Cache

This app uses Supabase to share restaurant cache data between users, reducing API calls and improving performance.

## Setup Instructions

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account

2. **Create a new project**
   - Click "New Project"
   - Choose an organization
   - Give your project a name (e.g., "randobites-cache")
   - Generate a strong database password
   - Select a region close to your users

3. **Create the cache table**
   - Go to the SQL editor in your Supabase dashboard
   - Run this SQL to create the restaurant cache table:

```sql
-- Create the restaurant cache table
CREATE TABLE restaurant_cache (
  id TEXT PRIMARY KEY,
  grid_lat DECIMAL(10, 7) NOT NULL,
  grid_lng DECIMAL(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL,
  restaurants JSONB NOT NULL,
  location JSONB NOT NULL,
  contributors INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_restaurant_cache_grid ON restaurant_cache(grid_lat, grid_lng, radius_meters);
CREATE INDEX idx_restaurant_cache_updated ON restaurant_cache(updated_at);

-- Enable RLS (Row Level Security) but allow read/write for all users
ALTER TABLE restaurant_cache ENABLE ROW LEVEL SECURITY;

-- Allow all users to read cache data
CREATE POLICY "Anyone can read cache" ON restaurant_cache
  FOR SELECT USING (true);

-- Allow all users to insert/update cache data
CREATE POLICY "Anyone can write cache" ON restaurant_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cache" ON restaurant_cache
  FOR UPDATE USING (true);
```

4. **Get your project credentials**
   - Go to Settings > API in your Supabase dashboard
   - Copy the "Project URL" and "anon public" key

5. **Add environment variables**
   - Create a `.env` file in your project root (if it doesn't exist)
   - Add these lines:

```
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

6. **Optional: Set up automatic cleanup**
   - You can set up a Supabase Edge Function to automatically clean up expired cache entries
   - This keeps your database size manageable

## How it works

- **Grid-based caching**: Locations are rounded to ~1km grids so nearby users share cache data
- **Multi-contributor**: When multiple users fetch data for the same area, their results are merged
- **Local + Shared**: The app first checks local cache (fastest), then shared cache, then makes API calls
- **Automatic expiration**: Cache expires after 7 days (restaurant data is stable)

## Benefits

- **Reduced API calls**: Users benefit from each other's API requests
- **Faster loading**: Shared cache provides data when local cache is empty
- **Cost savings**: Fewer API calls to Geoapify
- **Better user experience**: More restaurant variety from combined user data

## Privacy

- Only restaurant data is cached (public business information)
- No personal user data is stored
- Cache is anonymous and shared between all users