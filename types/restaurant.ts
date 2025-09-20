export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  rating: number;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  isOpen?: boolean;
  hours?: string;
}