/**
 * Smart Messages API - ذكي ومتقدم للتعامل مع نظام الرسائل
 */

interface SmartMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  message_type: "text" | "image" | "voice" | "system";
}

interface SmartConversation {
  id: string;
  other_user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: "customer" | "barber" | "admin";
    is_online?: boolean;
  };
  last_message?: SmartMessage;
  unread_count: number;
  updated_at: string;
}

interface SmartUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: "customer" | "barber" | "admin";
  status: "active" | "pending" | "blocked";
  is_online?: boolean;
}

class SmartMessagesAPI {
  private baseUrl = "/api";
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`🔄 [SmartAPI] ${options.method || "GET"} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SmartAPI] ${endpoint} failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [SmartAPI] ${endpoint} success:`, data);
    return data;
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}${params ? JSON.stringify(params) : ""}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 [Cache] Hit: ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Get all conversations for current user
  async getConversations(): Promise<SmartConversation[]> {
    const cacheKey = this.getCacheKey("/messages/conversations");
    const cached = this.getFromCache<{ conversations: SmartConversation[] }>(
      cacheKey,
    );
    if (cached) return cached.conversations;

    try {
      const response = await this.request<{
        conversations: SmartConversation[];
      }>("/messages/conversations");

      this.setCache(cacheKey, response);
      return response.conversations || [];
    } catch (error) {
      console.error("❌ خطأ في تحميل المحادثات:", error);
      return [];
    }
  }

  // Get messages between current user and another user
  async getMessages(otherUserId: string): Promise<SmartMessage[]> {
    const cacheKey = this.getCacheKey(`/messages/${otherUserId}`);
    const cached = this.getFromCache<SmartMessage[]>(cacheKey);
    if (cached) return cached;

    try {
      const messages = await this.request<SmartMessage[]>(
        `/messages/${otherUserId}`,
      );

      this.setCache(cacheKey, messages);
      return messages || [];
    } catch (error) {
      console.error("❌ خطأ في تحميل الرسائل:", error);
      return [];
    }
  }

  // Send a new message
  async sendMessage(
    receiverId: string,
    content: string,
    messageType: "text" | "image" | "voice" | "system" = "text",
  ): Promise<SmartMessage> {
    try {
      const message = await this.request<SmartMessage>("/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: receiverId,
          content,
          message_type: messageType,
        }),
      });

      // Invalidate cache for this conversation
      const conversationCacheKey = this.getCacheKey("/messages/conversations");
      const messagesCacheKey = this.getCacheKey(`/messages/${receiverId}`);
      this.cache.delete(conversationCacheKey);
      this.cache.delete(messagesCacheKey);

      return message;
    } catch (error) {
      console.error("❌ خطأ في إرسال الرسالة:", error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(otherUserId: string): Promise<void> {
    try {
      await this.request(`/messages/${otherUserId}/read`, {
        method: "PATCH",
      });

      // Update cache to reflect read status
      const conversationCacheKey = this.getCacheKey("/messages/conversations");
      this.cache.delete(conversationCacheKey);
    } catch (error) {
      console.error("❌ خطأ في تحديث حالة القراءة:", error);
    }
  }

  // Get user info
  async getUser(userId: string): Promise<SmartUser | null> {
    const cacheKey = this.getCacheKey(`/users/${userId}`);
    const cached = this.getFromCache<SmartUser>(cacheKey);
    if (cached) return cached;

    try {
      const user = await this.request<SmartUser>(`/users/${userId}`);
      this.setCache(cacheKey, user);
      return user;
    } catch (error) {
      console.error("❌ خطأ في تحميل بيانات المستخدم:", error);
      return null;
    }
  }

  // Search users
  async searchUsers(query: string): Promise<SmartUser[]> {
    if (!query.trim()) return [];

    try {
      const response = await this.request<{ users: SmartUser[] }>(
        `/users/search?q=${encodeURIComponent(query)}`,
      );
      return response.users || [];
    } catch (error) {
      console.error("❌ خطأ في البحث عن المستخدمين:", error);
      return [];
    }
  }

  // Get unread messages count
  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.request<{ count: number }>(
        "/messages/unread-count",
      );
      return response.count || 0;
    } catch (error) {
      console.error("❌ خطأ في تحميل عدد الرسائل غير المقروءة:", error);
      return 0;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log("🧹 [SmartAPI] Cache cleared");
  }

  // Check if user exists and create conversation
  async startConversationWithUser(
    userId: string,
  ): Promise<SmartConversation | null> {
    try {
      // Get user info first
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      // Check if conversation already exists
      const conversations = await this.getConversations();
      const existingConversation = conversations.find(
        (conv) => conv.other_user.id === userId,
      );

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation object
      const newConversation: SmartConversation = {
        id: `conv-${userId}`,
        other_user: {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role,
          is_online: user.is_online || false,
        },
        unread_count: 0,
        updated_at: new Date().toISOString(),
      };

      return newConversation;
    } catch (error) {
      console.error("❌ خطأ في بدء المحادثة:", error);
      return null;
    }
  }

  // Real-time connection (if needed later)
  setupRealTime(onMessageReceived?: (message: SmartMessage) => void): void {
    // This can be implemented later with WebSockets or Server-Sent Events
    console.log("🔄 [SmartAPI] Real-time setup (placeholder)");
  }
}

// Singleton instance
const smartMessagesAPI = new SmartMessagesAPI();

export default smartMessagesAPI;
export type { SmartMessage, SmartConversation, SmartUser };
