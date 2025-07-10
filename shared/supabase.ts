import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";
import { getValidatedConfig } from "./auto-config";

// Get auto-configured Supabase settings
const config = getValidatedConfig();

export const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseKey,
);

// Helper function to get current user from token
export function getCurrentUserId(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // For now, extract user ID from mock token format
    // In production, decode JWT properly
    if (token.startsWith("supabase_")) {
      return token.replace("supabase_", "");
    }
    return null;
  } catch {
    return null;
  }
}

// Database helper functions
export const db = {
  // Users
  users: {
    async findByEmail(email: string) {
      // Use the same approach as debug login to bypass RLS issues
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email);

      if (error) {
        console.error("Supabase findByEmail error:", error);
        throw error;
      }

      return users && users.length > 0 ? users[0] : null;
    },

    async create(userData: Database["public"]["Tables"]["users"]["Insert"]) {
      const { data, error } = await supabase
        .from("users")
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async findById(id: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      id: string,
      updates: Database["public"]["Tables"]["users"]["Update"],
    ) {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getAll() {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getBarbers() {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "barber")
        .eq("status", "active")
        .order("level", { ascending: false });

      if (error) throw error;
      return data;
    },

    async delete(userId: string) {
      // Delete user (CASCADE will handle related data)
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;
      return true;
    },
  },

  // Posts
  posts: {
    async getAll(userId?: string) {
      let query = supabase
        .from("posts")
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async create(postData: Database["public"]["Tables"]["posts"]["Insert"]) {
      const { data, error } = await supabase
        .from("posts")
        .insert(postData)
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async like(userId: string, postId: string) {
      const { data, error } = await supabase
        .from("post_likes")
        .insert({ user_id: userId, post_id: postId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async unlike(userId: string, postId: string) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (error) throw error;
    },

    async getUserLikes(userId: string): Promise<string[]> {
      const { data, error } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((like) => like.post_id);
    },
  },

  // Bookings
  bookings: {
    async getByUser(userId: string) {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          customer:users!customer_id(*),
          barber:users!barber_id(*)
        `,
        )
        .or(`customer_id.eq.${userId},barber_id.eq.${userId}`)
        .order("datetime", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(
      bookingData: Database["public"]["Tables"]["bookings"]["Insert"],
    ) {
      const { data, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select(
          `
          *,
          customer:users!customer_id(*),
          barber:users!barber_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      id: string,
      updates: Database["public"]["Tables"]["bookings"]["Update"],
    ) {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select(
          `
          *,
          customer:users!customer_id(*),
          barber:users!barber_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async delete(bookingId: string, userId: string) {
      // First, verify the booking belongs to the user (as customer or barber)
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .or(`customer_id.eq.${userId},barber_id.eq.${userId}`)
        .single();

      if (fetchError) throw fetchError;
      if (!booking) throw new Error("Booking not found or access denied");

      // Delete the booking
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;
      return true;
    },
  },

  // Follows
  follows: {
    async getByUser(userId: string, type: "followers" | "following") {
      const column = type === "followers" ? "followed_id" : "follower_id";
      const selectColumn = type === "followers" ? "follower_id" : "followed_id";

      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          *,
          user:users!${selectColumn}(*)
        `,
        )
        .eq(column, userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(followerId: string, followedId: string) {
      const { data, error } = await supabase
        .from("follows")
        .insert({ follower_id: followerId, followed_id: followedId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(followerId: string, followedId: string) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("followed_id", followedId);

      if (error) throw error;
    },

    async checkExists(followerId: string, followedId: string) {
      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", followerId)
        .eq("followed_id", followedId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  },

  // Friend Requests
  friendRequests: {
    async getByUser(userId: string) {
      const { data, error } = await supabase
        .from("friend_requests")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(senderId: string, receiverId: string) {
      const { data, error } = await supabase
        .from("friend_requests")
        .insert({ sender_id: senderId, receiver_id: receiverId })
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, status: "accepted" | "rejected") {
      const { data, error } = await supabase
        .from("friend_requests")
        .update({ status })
        .eq("id", id)
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },
  },

  // Activation Keys
  activationKeys: {
    async validate(code: string) {
      const { data, error } = await supabase
        .from("activation_keys")
        .select("*")
        .eq("code", code)
        .eq("is_used", false)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async checkStatus(code: string) {
      const { data, error } = await supabase
        .from("activation_keys")
        .select("*")
        .eq("code", code)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // Return status: null = doesn't exist, true = used, false = available
      if (!data) return { exists: false, isUsed: null, key: null };
      return { exists: true, isUsed: data.is_used, key: data };
    },

    async markUsed(id: string, userId: string) {
      const { data, error } = await supabase
        .from("activation_keys")
        .update({ is_used: true, used_by: userId })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  // Post Likes
  postLikes: {
    async like(userId: string, postId: string) {
      const { data, error } = await supabase
        .from("post_likes")
        .insert({ user_id: userId, post_id: postId })
        .select()
        .single();

      if (error) throw error;

      // Update post likes_count
      await supabase.rpc("increment_post_likes", { post_id: postId });

      return data;
    },

    async unlike(userId: string, postId: string) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (error) throw error;

      // Update post likes_count
      await supabase.rpc("decrement_post_likes", { post_id: postId });
    },

    async checkUserLiked(userId: string, postId: string) {
      const { data, error } = await supabase
        .from("post_likes")
        .select("*")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
  },

  // Post Comments
  postComments: {
    async getByPost(postId: string) {
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },

    async create(userId: string, postId: string, comment: string) {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          user_id: userId,
          post_id: postId,
          comment,
        })
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .single();

      if (error) throw error;

      // Update post comments_count
      await supabase.rpc("increment_post_comments", { post_id: postId });

      return data;
    },

    async delete(commentId: string, userId: string) {
      const { data: comment } = await supabase
        .from("post_comments")
        .select("post_id")
        .eq("id", commentId)
        .eq("user_id", userId)
        .single();

      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", userId);

      if (error) throw error;

      // Update post comments_count
      if (comment) {
        await supabase.rpc("decrement_post_comments", {
          post_id: comment.post_id,
        });
      }
    },
  },

  // Ratings
  ratings: {
    async getByBarber(barberId: string) {
      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          *,
          customer:users!customer_id(*),
          booking:bookings(*)
        `,
        )
        .eq("barber_id", barberId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(ratingData: {
      customer_id: string;
      barber_id: string;
      booking_id?: string;
      stars: number;
      comment?: string;
      images?: string[];
    }) {
      const { data, error } = await supabase
        .from("ratings")
        .insert(ratingData)
        .select(
          `
          *,
          customer:users!customer_id(*),
          barber:users!barber_id(*),
          booking:bookings(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async getAverageRating(barberId: string) {
      const { data, error } = await supabase
        .from("ratings")
        .select("stars")
        .eq("barber_id", barberId);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { average: 0, count: 0 };
      }

      const average =
        data.reduce((sum, rating) => sum + rating.stars, 0) / data.length;
      return { average: Math.round(average * 10) / 10, count: data.length };
    },
  },

  // Barber Services
  barberServices: {
    async getByBarber(barberId: string) {
      const { data, error } = await supabase
        .from("barber_services")
        .select("*")
        .eq("barber_id", barberId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },

    async create(serviceData: {
      barber_id: string;
      name: string;
      description?: string;
      price: number;
      duration_minutes: number;
    }) {
      const { data, error } = await supabase
        .from("barber_services")
        .insert(serviceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      serviceId: string,
      updates: {
        name?: string;
        description?: string;
        price?: number;
        duration_minutes?: number;
        is_active?: boolean;
      },
    ) {
      const { data, error } = await supabase
        .from("barber_services")
        .update(updates)
        .eq("id", serviceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(serviceId: string) {
      const { error } = await supabase
        .from("barber_services")
        .update({ is_active: false })
        .eq("id", serviceId);

      if (error) throw error;
    },
  },

  // Working Hours / Availability
  availability: {
    async getByBarber(barberId: string) {
      const { data, error } = await supabase
        .from("barber_availability")
        .select("*")
        .eq("barber_id", barberId)
        .order("day_of_week", { ascending: true });

      if (error) throw error;
      return data;
    },

    async saveSchedule(
      barberId: string,
      schedule: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
      }>,
    ) {
      // Delete existing schedule
      await supabase
        .from("barber_availability")
        .delete()
        .eq("barber_id", barberId);

      // Insert new schedule
      const scheduleWithBarberId = schedule.map((slot) => ({
        ...slot,
        barber_id: barberId,
      }));

      const { data, error } = await supabase
        .from("barber_availability")
        .insert(scheduleWithBarberId)
        .select();

      if (error) throw error;
      return data;
    },
  },

  // Notifications
  notifications: {
    async getByUser(userId: string) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(notificationData: {
      user_id: string;
      type: string;
      title: string;
      message: string;
      data?: any;
    }) {
      const { data, error } = await supabase
        .from("notifications")
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async markAsRead(notificationId: string) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },

    async markAllAsRead(userId: string) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },
  },

  // Messages
  messages: {
    async getConversations(userId: string) {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation (unique pairs of users)
      const conversations = new Map();

      data.forEach((message) => {
        const otherUserId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;
        const key = [userId, otherUserId].sort().join("-");

        if (!conversations.has(key)) {
          conversations.set(key, {
            user:
              message.sender_id === userId ? message.receiver : message.sender,
            lastMessage: message,
            unreadCount: 0,
            messages: [],
          });
        }

        const conversation = conversations.get(key);
        conversation.messages.push(message);

        // Count unread messages for current user
        if (message.receiver_id === userId && !message.is_read) {
          conversation.unreadCount++;
        }

        // Update last message if this is more recent
        if (
          new Date(message.created_at) >
          new Date(conversation.lastMessage.created_at)
        ) {
          conversation.lastMessage = message;
        }
      });

      return Array.from(conversations.values());
    },

    async getMessages(userId: string, otherUserId: string) {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },

    async create(messageData: {
      sender_id: string;
      receiver_id: string;
      message: string;
      message_type?: "text" | "image" | "voice" | "system";
    }) {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          ...messageData,
          message_type: messageData.message_type || "text",
        })
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async markAsRead(messageId: string, userId: string) {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId)
        .eq("receiver_id", userId);

      if (error) throw error;
    },

    async markConversationAsRead(userId: string, otherUserId: string) {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", userId)
        .eq("sender_id", otherUserId)
        .eq("is_read", false);

      if (error) throw error;
    },
  },
};
