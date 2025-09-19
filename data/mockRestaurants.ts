import { Restaurant } from "../types/restaurant";

export const mockRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "Giuseppe's Italian Kitchen",
    cuisine: "Italian",
    image:
      "https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?w=400&h=300&fit=crop",
    rating: 4.5,
    distance: 0.3,
    description:
      "Authentic Italian cuisine with fresh pasta made daily. Family-owned restaurant serving traditional recipes passed down through generations.",
    address: "123 Main Street, Downtown",
    phoneNumber: "(555) 123-4567",
    priceRange: "$$",
    isOpen: true,
    hours: "11:00 AM - 10:00 PM",
  },
  {
    id: "2",
    name: "Sakura Sushi & Ramen",
    cuisine: "Japanese",
    image:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
    rating: 4.8,
    distance: 0.7,
    description:
      "Fresh sushi and authentic ramen bowls. Our chefs trained in Tokyo bring you the most authentic Japanese dining experience.",
    address: "456 Oak Avenue, Midtown",
    phoneNumber: "(555) 234-5678",
    priceRange: "$$$",
    isOpen: true,
    hours: "12:00 PM - 11:00 PM",
  },
  {
    id: "3",
    name: "Taco Libre",
    cuisine: "Mexican",
    image:
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
    rating: 4.2,
    distance: 1.2,
    description:
      "Street-style tacos with house-made salsas and fresh ingredients. Don't miss our famous fish tacos and craft margaritas!",
    address: "789 Pine Street, Arts District",
    phoneNumber: "(555) 345-6789",
    priceRange: "$",
    isOpen: false,
    hours: "4:00 PM - 12:00 AM",
  },
  {
    id: "4",
    name: "The Burger Joint",
    cuisine: "American",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    rating: 4.0,
    distance: 0.5,
    description:
      "Gourmet burgers made with locally sourced beef and artisanal buns. Try our signature truffle fries!",
    address: "321 Elm Street, University District",
    phoneNumber: "(555) 456-7890",
    priceRange: "$$",
    isOpen: true,
    hours: "11:00 AM - 2:00 AM",
  },
  {
    id: "5",
    name: "Green Garden Cafe",
    cuisine: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
    rating: 4.6,
    distance: 0.9,
    description:
      "Plant-based cuisine that doesn't compromise on flavor. Organic, locally-sourced ingredients in every dish.",
    address: "654 Maple Drive, Green Valley",
    phoneNumber: "(555) 567-8901",
    priceRange: "$$",
    isOpen: true,
    hours: "8:00 AM - 9:00 PM",
  },
  {
    id: "6",
    name: "Le Petit Bistro",
    cuisine: "French",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
    rating: 4.7,
    distance: 1.5,
    description:
      "Classic French bistro fare in an intimate setting. Our wine selection features over 200 bottles from French vineyards.",
    address: "987 Boulevard Street, Historic Quarter",
    phoneNumber: "(555) 678-9012",
    priceRange: "$$$",
    isOpen: true,
    hours: "5:00 PM - 11:00 PM",
  },
  {
    id: "7",
    name: "Spice Route",
    cuisine: "Indian",
    image:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    rating: 4.4,
    distance: 2.1,
    description:
      "Aromatic Indian cuisine with both traditional and modern interpretations. Our tandoor oven creates the perfect naan and kebabs.",
    address: "147 Curry Lane, Little India",
    phoneNumber: "(555) 789-0123",
    priceRange: "$$",
    isOpen: true,
    hours: "11:30 AM - 10:30 PM",
  },
  {
    id: "8",
    name: "Dragon Palace",
    cuisine: "Chinese",
    image:
      "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop",
    rating: 4.1,
    distance: 1.8,
    description:
      "Authentic Szechuan and Cantonese dishes. Family recipes that have been perfected over decades.",
    address: "258 Dynasty Road, Chinatown",
    phoneNumber: "(555) 890-1234",
    priceRange: "$$",
    isOpen: false,
    hours: "12:00 PM - 10:00 PM",
  },
];
