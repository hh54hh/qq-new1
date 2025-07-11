/**
 * Enhanced Chat Cache Manager
 * Implements smart caching with storage limits, instant loading, and background sync
 */

import { getOfflineStorage } from "./offline-storage";
import apiClient from "./api";

export interface CachedMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: "text" | "image" | "voice" | "system";
  is_read: boolean;
  created_at: string;
  conversation_id: string;
  _cached_at: number;
  _pending?: boolean;
  _retry_count?: number;
}

export interface CachedConversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  lastMessage: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
  last_activity: string;
  _cached_at: number;
  _opened_at?: number;
}

export interface ChatCacheConfig {
  maxConversations: number;
  maxMessagesPerChat: number;
  backgroundSyncInterval: number;
  cleanupInterval: number;
  messageRetention: number; // days
  conversationRetention: number; // days
}

class ChatCacheManager {
  private storage: any = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private readonly config: ChatCacheConfig = {
    maxConversations: 50,
    maxMessagesPerChat: 100,
    backgroundSyncInterval: 5000, // 5 seconds
    cleanupInterval: 1800000, // 30 minutes
    messageRetention: 30, // 30 days
    conversationRetention: 90, // 90 days
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.storage = await getOfflineStorage();
      this.isInitialized = true;

      // Start background processes
      this.startBackgroundSync();
      this.startPeriodicCleanup();

      console.log("✅ Chat cache manager initialized");
    } catch (error) {
      console.error("❌ Failed to initialize chat cache manager:", error);
      throw error;
    }
  }

  // =================== CONVERSATIONS ===================

  async getCachedConversations(): Promise<CachedConversation[]> {
    try {
      const conversations = await this.storage.getAllData("conversations");
      return conversations
        .sort(
          (a: CachedConversation, b: CachedConversation) =>
            new Date(b.last_activity).getTime() -
            new Date(a.last_activity).getTime(),
        )
        .slice(0, this.config.maxConversations);
    } catch (error) {
      console.warn("Failed to get cached conversations:", error);
      return [];
    }
  }

  async getConversationsWithSync(): Promise<CachedConversation[]> {
    // 1. Get cached conversations immediately
    const cached = await this.getCachedConversations();

    // 2. Start background sync (don't wait)
    this.syncConversationsInBackground();

    return cached;
  }

  private async syncConversationsInBackground(): Promise<void> {
    try {
      const response = await apiClient.getConversations();
      const freshConversations = response.conversations || [];

      const now = Date.now();
      const updatedConversations: CachedConversation[] = freshConversations.map(
        (conv) => ({
          id: conv.user.id,
          user: conv.user,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
          last_activity: conv.lastMessage.created_at,
          _cached_at: now,
        }),
      );

      // Save updated conversations
      await this.replaceConversations(updatedConversations);

      console.log(
        `🔄 Synced ${updatedConversations.length} conversations in background`,
      );
    } catch (error) {
      console.warn("Background conversation sync failed:", error);
    }
  }

  private async replaceConversations(
    conversations: CachedConversation[],
  ): Promise<void> {
    // Clear old conversations
    await this.storage.clearStore("conversations");

    // Save new conversations
    for (const conv of conversations.slice(0, this.config.maxConversations)) {
      await this.storage.saveData(
        "conversations",
        conv,
        conv.id,
        "conversation",
      );
    }
  }

  async markConversationAsOpened(conversationId: string): Promise<void> {
    try {
      const conversation = await this.storage.getData(
        "conversations",
        conversationId,
      );
      if (conversation) {
        conversation._opened_at = Date.now();
        await this.storage.saveData(
          "conversations",
          conversation,
          conversationId,
          "conversation",
        );
      }
    } catch (error) {
      console.warn("Failed to mark conversation as opened:", error);
    }
  }

  // =================== MESSAGES ===================

  async getCachedMessages(
    conversationId: string,
    limit?: number,
  ): Promise<CachedMessage[]> {
    try {
      const allMessages = await this.storage.getAllData("messages");
      const conversationMessages = allMessages
        .filter((msg: CachedMessage) => msg.conversation_id === conversationId)
        .sort(
          (a: CachedMessage, b: CachedMessage) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

      // Return most recent messages if limit is specified
      if (limit) {
        return conversationMessages.slice(-limit);
      }

      return conversationMessages;
    } catch (error) {
      console.warn("Failed to get cached messages:", error);
      return [];
    }
  }

  async getMessagesWithSync(conversationId: string): Promise<CachedMessage[]> {
    // 1. Get cached messages immediately (recent 30 messages)
    const cached = await this.getCachedMessages(conversationId, 30);

    // 2. Start background sync (don't wait)
    this.syncMessagesInBackground(conversationId);

    return cached;
  }

  private async syncMessagesInBackground(
    conversationId: string,
  ): Promise<void> {
    try {
      const response = await apiClient.getMessages(conversationId);
      const freshMessages = response.messages || [];

      const now = Date.now();
      const updatedMessages: CachedMessage[] = freshMessages.map((msg) => ({
        ...msg,
        conversation_id: conversationId,
        _cached_at: now,
      }));

      // Replace messages for this conversation
      await this.replaceMessagesForConversation(
        conversationId,
        updatedMessages,
      );

      console.log(
        `🔄 Synced ${updatedMessages.length} messages for conversation ${conversationId} in background`,
      );
    } catch (error) {
      console.warn("Background message sync failed:", error);
    }
  }

  private async replaceMessagesForConversation(
    conversationId: string,
    messages: CachedMessage[],
  ): Promise<void> {
    // Remove old messages for this conversation
    const allMessages = await this.storage.getAllData("messages");
    const otherMessages = allMessages.filter(
      (msg: CachedMessage) => msg.conversation_id !== conversationId,
    );

    // Clear messages store
    await this.storage.clearStore("messages");

    // Save other conversations' messages
    for (const msg of otherMessages) {
      await this.storage.saveData("messages", msg, msg.id, "message");
    }

    // Save new messages (keep only recent ones)
    const recentMessages = messages.slice(-this.config.maxMessagesPerChat);
    for (const msg of recentMessages) {
      await this.storage.saveData("messages", msg, msg.id, "message");
    }
  }

  // =================== OPTIMISTIC UI ===================

  async addOptimisticMessage(message: {
    receiver_id: string;
    message: string;
    sender_id: string;
  }): Promise<CachedMessage> {
    const optimisticMessage: CachedMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      message: message.message,
      message_type: "text",
      is_read: false,
      created_at: new Date().toISOString(),
      conversation_id: message.receiver_id,
      _cached_at: Date.now(),
      _pending: true,
      _retry_count: 0,
    };

    // Save optimistic message
    await this.storage.saveData(
      "messages",
      optimisticMessage,
      optimisticMessage.id,
      "message",
    );

    // Send in background
    this.sendMessageInBackground(optimisticMessage);

    return optimisticMessage;
  }

  private async sendMessageInBackground(
    optimisticMessage: CachedMessage,
  ): Promise<void> {
    try {
      const sentMessage = await apiClient.createMessage({
        receiver_id: optimisticMessage.receiver_id,
        message: optimisticMessage.message,
      });

      // Replace optimistic message with real one
      await this.storage.deleteData("messages", optimisticMessage.id);

      const realMessage: CachedMessage = {
        ...sentMessage,
        conversation_id: optimisticMessage.conversation_id,
        _cached_at: Date.now(),
      };

      await this.storage.saveData(
        "messages",
        realMessage,
        realMessage.id,
        "message",
      );

      console.log(
        `✅ Message sent successfully: ${optimisticMessage.id} -> ${realMessage.id}`,
      );
    } catch (error) {
      console.warn("Failed to send message:", error);

      // Mark for retry
      optimisticMessage._retry_count =
        (optimisticMessage._retry_count || 0) + 1;
      await this.storage.saveData(
        "messages",
        optimisticMessage,
        optimisticMessage.id,
        "message",
      );

      // Retry later if not too many attempts
      if (optimisticMessage._retry_count < 3) {
        setTimeout(
          () => {
            this.sendMessageInBackground(optimisticMessage);
          },
          Math.pow(2, optimisticMessage._retry_count) * 5000,
        ); // Exponential backoff
      }
    }
  }

  // =================== LAZY LOADING ===================

  async loadOlderMessages(
    conversationId: string,
    beforeMessageId: string,
    limit = 20,
  ): Promise<CachedMessage[]> {
    // For now, return from cache - in production this would fetch older messages from server
    const allCached = await this.getCachedMessages(conversationId);
    const beforeIndex = allCached.findIndex(
      (msg) => msg.id === beforeMessageId,
    );

    if (beforeIndex > 0) {
      const start = Math.max(0, beforeIndex - limit);
      return allCached.slice(start, beforeIndex);
    }

    return [];
  }

  // =================== CLEANUP & MANAGEMENT ===================

  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      // Sync only if page is visible to save battery
      if (document.visibilityState === "visible") {
        this.syncConversationsInBackground();
      }
    }, this.config.backgroundSyncInterval);
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const messageRetentionMs =
        this.config.messageRetention * 24 * 60 * 60 * 1000;
      const conversationRetentionMs =
        this.config.conversationRetention * 24 * 60 * 60 * 1000;

      // Clean old messages
      const allMessages = await this.storage.getAllData("messages");
      let cleanedMessages = 0;

      for (const msg of allMessages) {
        if (now - msg._cached_at > messageRetentionMs) {
          await this.storage.deleteData("messages", msg.id);
          cleanedMessages++;
        }
      }

      // Clean old conversations that haven't been opened recently
      const allConversations = await this.storage.getAllData("conversations");
      let cleanedConversations = 0;

      for (const conv of allConversations) {
        const lastActivity = conv._opened_at || conv._cached_at;
        if (now - lastActivity > conversationRetentionMs) {
          await this.storage.deleteData("conversations", conv.id);
          cleanedConversations++;
        }
      }

      // Limit conversations to max count
      const remainingConversations =
        await this.storage.getAllData("conversations");
      if (remainingConversations.length > this.config.maxConversations) {
        const sorted = remainingConversations.sort(
          (a: CachedConversation, b: CachedConversation) =>
            new Date(b.last_activity).getTime() -
            new Date(a.last_activity).getTime(),
        );

        const toRemove = sorted.slice(this.config.maxConversations);
        for (const conv of toRemove) {
          await this.storage.deleteData("conversations", conv.id);
          cleanedConversations++;
        }
      }

      if (cleanedMessages > 0 || cleanedConversations > 0) {
        console.log(
          `🧹 Cleanup completed: ${cleanedMessages} messages, ${cleanedConversations} conversations removed`,
        );
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  }

  async getStorageStats(): Promise<{
    conversations: number;
    messages: number;
    pendingMessages: number;
    totalSizeKB: number;
  }> {
    try {
      const conversations = await this.storage.getAllData("conversations");
      const messages = await this.storage.getAllData("messages");
      const pendingMessages = messages.filter(
        (msg: CachedMessage) => msg._pending,
      );

      const totalSize = new Blob([
        JSON.stringify(conversations),
        JSON.stringify(messages),
      ]).size;

      return {
        conversations: conversations.length,
        messages: messages.length,
        pendingMessages: pendingMessages.length,
        totalSizeKB: Math.round(totalSize / 1024),
      };
    } catch (error) {
      console.warn("Failed to get storage stats:", error);
      return {
        conversations: 0,
        messages: 0,
        pendingMessages: 0,
        totalSizeKB: 0,
      };
    }
  }

  async clearAllChatData(): Promise<void> {
    try {
      await this.storage.clearStore("conversations");
      await this.storage.clearStore("messages");
      console.log("🗑️ All chat data cleared");
    } catch (error) {
      console.warn("Failed to clear chat data:", error);
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isInitialized = false;
    console.log("🔌 Chat cache manager destroyed");
  }
}

// Singleton instance
let chatCacheManager: ChatCacheManager | null = null;

export async function getChatCache(): Promise<ChatCacheManager> {
  if (!chatCacheManager) {
    chatCacheManager = new ChatCacheManager();
    await chatCacheManager.initialize();
  }
  return chatCacheManager;
}

export { ChatCacheManager };
export default getChatCache;
