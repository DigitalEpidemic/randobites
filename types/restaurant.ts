export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  rating: number;
  distance: number; // in miles
  description?: string;
  address?: string;
  phoneNumber?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  isOpen?: boolean;
  hours?: string;
}