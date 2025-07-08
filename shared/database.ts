// Database Schema Types for Supabase Integration
// This file defines the exact structure expected by Supabase

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash?: string;
          avatar_url?: string;
          phone?: string;
          role: "customer" | "barber" | "admin";
          status: "active" | "pending" | "blocked";
          level: number;
          points: number;
          is_verified: boolean;
          location?: {
            lat: number;
            lng: number;
            address: string;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash?: string;
          avatar_url?: string;
          phone?: string;
          role: "customer" | "barber" | "admin";
          status?: "active" | "pending" | "blocked";
          level?: number;
          points?: number;
          is_verified?: boolean;
          location?: {
            lat: number;
            lng: number;
            address: string;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          password_hash?: string;
          avatar_url?: string;
          phone?: string;
          role?: "customer" | "barber" | "admin";
          status?: "active" | "pending" | "blocked";
          level?: number;
          points?: number;
          is_verified?: boolean;
          location?: {
            lat: number;
            lng: number;
            address: string;
          };
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          images?: string[];
          caption?: string;
          frame_style: string;
          likes_count: number;
          comments_count: number;
          tags?: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          images?: string[];
          caption?: string;
          frame_style?: string;
          likes_count?: number;
          comments_count?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          image_url?: string;
          images?: string[];
          caption?: string;
          frame_style?: string;
          likes_count?: number;
          comments_count?: number;
          tags?: string[];
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          barber_id: string;
          datetime: string;
          duration_minutes: number;
          service_type: string;
          price: number;
          status:
            | "pending"
            | "accepted"
            | "rejected"
            | "completed"
            | "cancelled";
          notes?: string;
          customer_message?: string;
          barber_notes?: string;
          reminder_sent: boolean;
          payment_status: "pending" | "paid" | "refunded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          barber_id: string;
          datetime: string;
          duration_minutes?: number;
          service_type: string;
          price: number;
          status?:
            | "pending"
            | "accepted"
            | "rejected"
            | "completed"
            | "cancelled";
          notes?: string;
          customer_message?: string;
          barber_notes?: string;
          reminder_sent?: boolean;
          payment_status?: "pending" | "paid" | "refunded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          datetime?: string;
          duration_minutes?: number;
          service_type?: string;
          price?: number;
          status?:
            | "pending"
            | "accepted"
            | "rejected"
            | "completed"
            | "cancelled";
          notes?: string;
          customer_message?: string;
          barber_notes?: string;
          reminder_sent?: boolean;
          payment_status?: "pending" | "paid" | "refunded";
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          followed_id: string;
          created_at?: string;
        };
        Update: {};
      };
      ratings: {
        Row: {
          id: string;
          customer_id: string;
          barber_id: string;
          booking_id?: string;
          stars: number;
          comment?: string;
          images?: string[];
          helpful_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          barber_id: string;
          booking_id?: string;
          stars: number;
          comment?: string;
          images?: string[];
          helpful_count?: number;
          created_at?: string;
        };
        Update: {
          stars?: number;
          comment?: string;
          images?: string[];
          helpful_count?: number;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message: string;
          message_type: "text" | "image" | "voice" | "system";
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          message: string;
          message_type?: "text" | "image" | "voice" | "system";
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: any;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: any;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      barber_services: {
        Row: {
          id: string;
          barber_id: string;
          name: string;
          description?: string;
          price: number;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          barber_id: string;
          name: string;
          description?: string;
          price: number;
          duration_minutes: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
        };
      };
      barber_availability: {
        Row: {
          id: string;
          barber_id: string;
          day_of_week: number; // 0-6 (Sunday-Saturday)
          start_time: string; // HH:MM format
          end_time: string; // HH:MM format
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          barber_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
        };
      };
      activation_keys: {
        Row: {
          id: string;
          code: string;
          is_used: boolean;
          created_by: string;
          used_by?: string;
          expires_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          is_used?: boolean;
          created_by: string;
          used_by?: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          is_used?: boolean;
          used_by?: string;
        };
      };
    };
    Views: {
      barber_stats: {
        Row: {
          barber_id: string;
          total_bookings: number;
          completed_bookings: number;
          total_revenue: number;
          average_rating: number;
          total_reviews: number;
          followers_count: number;
          posts_count: number;
        };
      };
      customer_stats: {
        Row: {
          customer_id: string;
          total_bookings: number;
          total_spent: number;
          favorite_barbers: string[];
          last_booking_date: string;
        };
      };
    };
    Functions: {
      search_barbers: {
        Args: {
          search_query?: string;
          user_lat?: number;
          user_lng?: number;
          max_distance?: number;
          min_rating?: number;
          service_types?: string[];
        };
        Returns: {
          id: string;
          name: string;
          avatar_url: string;
          level: number;
          points: number;
          average_rating: number;
          distance: number;
          is_available: boolean;
          services: any[];
        }[];
      };
      get_recommendations: {
        Args: {
          user_id: string;
          limit?: number;
        };
        Returns: {
          id: string;
          name: string;
          avatar_url: string;
          reason: string;
          confidence: number;
        }[];
      };
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Commonly used types
export type DbUser = Tables<"users">;
export type DbPost = Tables<"posts">;
export type DbBooking = Tables<"bookings">;
export type DbRating = Tables<"ratings">;
export type DbMessage = Tables<"messages">;
export type DbNotification = Tables<"notifications">;
export type DbBarberService = Tables<"barber_services">;
export type DbBarberAvailability = Tables<"barber_availability">;
