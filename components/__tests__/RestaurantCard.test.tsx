import React from 'react';
import { render } from '@testing-library/react-native';
import { RestaurantCard } from '../RestaurantCard';
import { Restaurant } from '../../types/restaurant';
import { LocationCoordinates } from '../../services/locationService';

// Mock LocationService
jest.mock('../../services/locationService', () => ({
  LocationService: {
    calculateDistance: jest.fn().mockReturnValue(0), // Default return value
  },
}));

describe('RestaurantCard', () => {
  const mockRestaurant: Restaurant = {
    id: 'test-restaurant-1',
    name: 'Test Restaurant',
    cuisine: 'Italian',
    image: 'https://example.com/restaurant-image.jpg',
    latitude: 37.7749,
    longitude: -122.4194,
    rating: 4.5,
    priceRange: '$$',
    phoneNumber: '+1-555-123-4567',
    hours: '9:00 AM - 10:00 PM',
    description: 'A test restaurant serving delicious Italian food.',
    address: '123 Test Street, Test City',
    isOpen: true,
    dataSource: 'api',
  };

  const mockLocation: LocationCoordinates = {
    latitude: 37.7849,
    longitude: -122.4094,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders restaurant name correctly', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('Test Restaurant')).toBeTruthy();
  });

  it('renders restaurant cuisine correctly', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('Italian')).toBeTruthy();
  });

  it('renders restaurant status when provided', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('Open')).toBeTruthy();
  });

  it('renders price range correctly', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('$$')).toBeTruthy();
  });

  it('renders rating stars correctly for full stars', () => {
    const restaurantWithFullRating = { ...mockRestaurant, rating: 4 };
    const { getByText } = render(
      <RestaurantCard restaurant={restaurantWithFullRating} currentLocation={mockLocation} />
    );

    expect(getByText('★★★★')).toBeTruthy();
  });

  it('renders rating stars correctly with half star', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    // 4.5 rating should show 4 full stars and 1 half star
    expect(getByText('★★★★☆')).toBeTruthy();
  });

  it('calculates and displays distance when location is provided', () => {
    const mockCalculateDistance = require('../../services/locationService').LocationService.calculateDistance;
    mockCalculateDistance.mockReturnValue(1.2);

    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('1.2 km')).toBeTruthy(); // Distance text as one unit
    expect(mockCalculateDistance).toHaveBeenCalledWith(
      mockLocation,
      { latitude: 37.7749, longitude: -122.4194 }
    );
  });

  it('shows default distance when no current location is provided', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} />
    );

    expect(getByText('0.0 km')).toBeTruthy(); // Distance text as one unit
  });

  it('handles missing optional fields gracefully', () => {
    const minimalRestaurant: Restaurant = {
      id: 'minimal-restaurant',
      name: 'Minimal Restaurant',
      cuisine: 'Unknown',
      image: '',
      latitude: 0,
      longitude: 0,
      rating: 0,
      dataSource: 'api',
    };

    const { getByText } = render(
      <RestaurantCard restaurant={minimalRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('Minimal Restaurant')).toBeTruthy();
    expect(getByText('Unknown')).toBeTruthy();
  });

  it('renders zero rating correctly (no stars)', () => {
    const restaurantWithZeroRating = { ...mockRestaurant, rating: 0 };
    const { queryByText } = render(
      <RestaurantCard restaurant={restaurantWithZeroRating} currentLocation={mockLocation} />
    );

    // Should not render any stars
    expect(queryByText(/★/)).toBeNull();
  });

  it('renders rating value correctly', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} currentLocation={mockLocation} />
    );

    expect(getByText('4.5')).toBeTruthy();
  });
});