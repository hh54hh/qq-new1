export interface DemoResponse {
  message: string;
}

// Import service categories
import { ServiceCategory } from "./service-categories";

// User roles
export type UserRole = "customer" | "barber" | "admin";

export type UserStatus = "active" | "pending" | "blocked";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  level: number;
  points: number;
  is_verified: boolean;
  service_category?: ServiceCategory; // New field for service providers
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  created_at: string;
  updated_at?: string;
  // Extended properties for UI
  rating?: number;
  followers_count?: number;
  price?: number;
  lat?: number;
  lng?: number;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  service_category?: ServiceCategory; // Required for service providers
  activation_key?: string; // Required for barbers (legacy)
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Posts
export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  images?: string[];
  caption?: string;
  frame_style: string;
  likes: number;
  likes_count?: number;
  comments_count?: number;
  tags?: string[];
  created_at: string;
  user?: User;
  comments?: any[];
}

// Bookings
export interface Booking {
  id: string;
  user_id: string;
  barber_id: string;
  datetime: string;
  status: BookingStatus;
  created_at: string;
  user?: User;
  barber?: User;
}

export interface CreateBookingRequest {
  barber_id: string;
  datetime: string;
}

// Follows
export interface Follow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
  follower?: User;
  followed?: User;
}

// Ratings
export interface Rating {
  id: string;
  user_id: string;
  barber_id: string;
  stars: number;
  comment?: string;
  created_at: string;
}

// Friend requests
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  sender?: User;
  receiver?: User;
}

// Activation keys
export interface ActivationKey {
  id: string;
  code: string;
  is_used: boolean;
  created_by: string;
  used_by?: string;
  created_at: string;
}

// API Responses
export interface GetBarbersResponse {
  barbers: User[];
  total: number;
}

export interface GetPostsResponse {
  posts: Post[];
  total: number;
}

export interface GetBookingsResponse {
  bookings: Booking[];
  total: number;
}

export interface GetFollowsResponse {
  follows: Follow[];
  total: number;
}

export interface GetFriendRequestsResponse {
  requests: FriendRequest[];
  total: number;
}

// Search filters
export interface SearchBarbersRequest {
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  min_rating?: number;
  max_price?: number;
  level?: number;
}
