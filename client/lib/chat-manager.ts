/**
 * Smart Chat Manager for Telegram-style messaging
 * Handles offline storage, synchronization, and real-time updates
 */

import { getOfflineStorage } from "./offline-storage";
import offlineAPI from "./offline-api";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  isOffline?: boolean;
  replyTo?: string;
  edited?: boolean;
  editedAt?: number;
}

export interface ChatConversation {
  id: string;
  name: string;
  avatar?: string;
  participantIds: string[];
  lastMessage?: ChatMessage;
  lastActivity: number;
  unreadCount: number;
  isOnline?: boolean;
  type: "direct" | "group";
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: number;
}

class ChatManager {
  private storage: any = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private syncInProgress = false;
  private currentUserId: string = "";
  private fallbackMode = false; // للعمل بدون تخزين محلي

  async initialize(userId: string) {
    this.currentUserId = userId;
    try {
      this.storage = await getOfflineStorage();
      this.fallbackMode = false;
      console.log("✅ تم تهيئة التخزين المحلي");
    } catch (error) {
      console.warn(
        "⚠️ فشل في تهيئة الت��زين المحلي، العمل في fallback mode:",
        error,
      );
      this.fallbackMode = true;
      this.storage = this.createFallbackStorage();
    }
    this.setupNetworkListeners();
    await this.syncPendingMessages();
  }

  private setupNetworkListeners() {
    window.addEventListener("online", () => {
      console.log("📶 Network restored - syncing messages");
      this.syncPendingMessages();
    });

    window.addEventListener("offline", () => {
      console.log("📡 Network lost - switching to offline mode");
    });
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  // Conversation management
  async getConversations(): Promise<ChatConversation[]> {
    try {
      // Try network first
      const response = await offlineAPI.get("/api/messages/conversations");

      if (response.success && response.data) {
        // Cache conversations
        for (const conv of response.data) {
          await this.storage.saveData("conversations", conv, conv.id);
        }
        return response.data;
      }
    } catch (error) {
      console.log("📱 Loading conversations from cache");
    }

    // Fallback to cache + add demo user
    let cached = await this.storage.getAllData("conversations");

    // إضافة مستخدم تجريبي للاختبار
    if (!cached || cached.length === 0) {
      const demoConversation: ChatConversation = {
        id: "demo_user_123",
        name: "👨‍⚖️ أحمد الحلاق (تجريبي)",
        avatar: "",
        participantIds: [this.currentUserId, "demo_user_123"],
        lastActivity: Date.now(),
        unreadCount: 0,
        type: "direct",
        isOnline: true,
      };

      await this.storage.saveData(
        "conversations",
        demoConversation,
        demoConversation.id,
      );

      // إضافة رسالة تجريبية
      const demoMessage = {
        id: "demo_msg_1",
        conversationId: "demo_user_123",
        senderId: "demo_user_123",
        content: "مرحباً! هذه رسالة تجريبية 👋‍♂️",
        timestamp: Date.now() - 300000, // 5 دقائق مضت
        status: "read",
        isOwn: false,
      };

      await this.storage.saveData("messages", demoMessage, demoMessage.id);

      cached = [demoConversation];
      console.log("👨‍⚖️ تم إضافة مستخدم تجريبي مع رسالة");
    }

    return cached || [];
  }

  async getConversation(id: string): Promise<ChatConversation | null> {
    try {
      const response = await offlineAPI.get(`/api/messages/${id}`);
      if (response.success) {
        await this.storage.saveData("conversations", response.data, id);
        return response.data;
      }
    } catch (error) {
      console.log("📱 Loading conversation from cache");
    }

    return await this.storage.getData("conversations", id);
  }

  // Message management
  async getMessages(otherUserId: string): Promise<ChatMessage[]> {
    try {
      // Try network first - otherUserId is the conversation partner
      const response = await offlineAPI.get(`/api/messages/${otherUserId}`);

      if (response.success && response.data) {
        // Cache messages
        for (const msg of response.data) {
          await this.storage.saveData(
            "messages",
            { ...msg, conversationId: otherUserId },
            msg.id,
          );
        }
        return response.data;
      }
    } catch (error) {
      console.log("📱 Loading messages from cache");
    }

    // Fallback to cache
    const cached = await this.storage.getAllData("messages");
    return cached.filter((msg: any) => msg.conversationId === otherUserId);
  }

  async sendMessage(
    otherUserId: string,
    content: string,
    replyTo?: string,
  ): Promise<ChatMessage> {
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: otherUserId,
      senderId: this.currentUserId,
      content: content.trim(),
      timestamp: Date.now(),
      status: "sending",
      isOffline: !navigator.onLine,
      replyTo,
    };

    // Store message locally immediately
    await this.storage.saveData("messages", tempMessage, tempMessage.id);

    // Emit new message event
    this.emit("message:new", tempMessage);

    try {
      // Try to send to server
      const response = await offlineAPI.post("/api/messages", {
        receiver_id: otherUserId,
        content,
        message_type: "text",
      });

      if (response.success && response.data) {
        // Update with server data
        const sentMessage: ChatMessage = {
          ...tempMessage,
          id: response.data.id,
          status: "sent",
          isOffline: false,
        };

        await this.storage.saveData("messages", sentMessage, sentMessage.id);
        await this.storage.deleteData("messages", tempMessage.id);

        this.emit("message:sent", sentMessage);
        return sentMessage;
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.log("📡 Message queued for offline sync");

      // Store for later sync
      await this.storage.saveData(
        "pendingMessages",
        {
          conversationId,
          content,
          replyTo,
          tempId: tempMessage.id,
          timestamp: tempMessage.timestamp,
        },
        tempMessage.id,
      );

      // Update status
      const failedMessage: ChatMessage = {
        ...tempMessage,
        status: navigator.onLine ? "failed" : "sending",
      };

      await this.storage.saveData("messages", failedMessage, failedMessage.id);
      this.emit("message:failed", failedMessage);

      return failedMessage;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const response = await offlineAPI.put(`/api/messages/${messageId}/read`);

      if (response.success) {
        // Update local storage
        const message = await this.storage.getData("messages", messageId);
        if (message) {
          message.status = "read";
          await this.storage.saveData("messages", message, messageId);
          this.emit("message:read", message);
        }
      }
    } catch (error) {
      // Queue for later sync
      await this.storage.saveData(
        "pendingReads",
        { messageId, timestamp: Date.now() },
        messageId,
      );
    }
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const response = await offlineAPI.patch(
        `/api/messages/${conversationId}/read`,
      );

      if (response.success) {
        // Update conversation
        const conversation = await this.storage.getData(
          "conversations",
          conversationId,
        );
        if (conversation) {
          conversation.unreadCount = 0;
          await this.storage.saveData(
            "conversations",
            conversation,
            conversationId,
          );
          this.emit("conversation:read", conversation);
        }
      }
    } catch (error) {
      // Queue for later sync
      await this.storage.saveData(
        "pendingConversationReads",
        { conversationId, timestamp: Date.now() },
        conversationId,
      );
    }
  }

  // Offline sync
  async syncPendingMessages(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine || this.fallbackMode) return;

    this.syncInProgress = true;
    console.log("🔄 Syncing pending messages...");

    try {
      // Sync pending messages
      const pendingMessages =
        await this.storage.getUnsyncedData("pendingMessages");

      for (const pending of pendingMessages) {
        try {
          const response = await offlineAPI.post("/api/messages", {
            conversationId: pending.data.conversationId,
            content: pending.data.content,
            replyTo: pending.data.replyTo,
          });

          if (response.success) {
            // Update the temp message with real ID
            const tempMessage = await this.storage.getData(
              "messages",
              pending.data.tempId,
            );
            if (tempMessage) {
              const sentMessage = {
                ...tempMessage,
                id: response.data.id,
                status: "sent",
                isOffline: false,
              };

              await this.storage.saveData(
                "messages",
                sentMessage,
                response.data.id,
              );
              await this.storage.deleteData("messages", pending.data.tempId);
              this.emit("message:synced", sentMessage);
            }

            // Remove from pending
            await this.storage.deleteData("pendingMessages", pending.id);
          }
        } catch (error) {
          console.warn("Failed to sync message:", pending.id);
        }
      }

      // Sync pending reads
      await this.syncPendingReads();

      console.log("✅ Message sync completed");
    } catch (error: any) {
      console.error("❌ Sync failed:");
      console.error("  Message:", error?.message || "Unknown error");
      console.error("  Type:", error?.name || "Unknown");
      if (error?.stack) {
        console.error("  Stack:", error.stack);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingReads(): Promise<void> {
    const pendingReads = await this.storage.getUnsyncedData("pendingReads");

    for (const pending of pendingReads) {
      try {
        await offlineAPI.put(`/api/messages/${pending.data.messageId}/read`);
        await this.storage.deleteData("pendingReads", pending.id);
      } catch (error) {
        console.warn("Failed to sync read status:", pending.id);
      }
    }

    const pendingConvReads = await this.storage.getUnsyncedData(
      "pendingConversationReads",
    );

    for (const pending of pendingConvReads) {
      try {
        await offlineAPI.patch(
          `/api/messages/${pending.data.conversationId}/read`,
        );
        await this.storage.deleteData("pendingConversationReads", pending.id);
      } catch (error) {
        console.warn("Failed to sync conversation read status:", pending.id);
      }
    }
  }

  // Search functionality
  async searchMessages(query: string): Promise<ChatMessage[]> {
    const allMessages = await this.storage.getAllData("messages");
    return allMessages.filter((msg: ChatMessage) =>
      msg.content.toLowerCase().includes(query.toLowerCase()),
    );
  }

  async searchConversations(query: string): Promise<ChatConversation[]> {
    const allConversations = await this.storage.getAllData("conversations");
    return allConversations.filter((conv: ChatConversation) =>
      conv.name.toLowerCase().includes(query.toLowerCase()),
    );
  }

  // Utility methods
  async getUnreadCount(): Promise<number> {
    try {
      const response = await offlineAPI.get("/api/messages/unread-count");
      if (response.success) {
        return response.data.count;
      }
    } catch (error) {
      // Calculate from cache
      const conversations = await this.storage.getAllData("conversations");
      return conversations.reduce(
        (total: number, conv: ChatConversation) => total + conv.unreadCount,
        0,
      );
    }

    return 0;
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await offlineAPI.delete(`/api/messages/${messageId}`);
      await this.storage.deleteData("messages", messageId);
      this.emit("message:deleted", { messageId });
    } catch (error) {
      // Queue for later sync
      await this.storage.saveData(
        "pendingDeletes",
        { messageId, timestamp: Date.now() },
        messageId,
      );
    }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const response = await offlineAPI.put(`/api/messages/${messageId}`, {
        content: newContent,
      });

      if (response.success) {
        const message = await this.storage.getData("messages", messageId);
        if (message) {
          message.content = newContent;
          message.edited = true;
          message.editedAt = Date.now();
          await this.storage.saveData("messages", message, messageId);
          this.emit("message:edited", message);
        }
      }
    } catch (error) {
      // Queue for later sync
      await this.storage.saveData(
        "pendingEdits",
        { messageId, newContent, timestamp: Date.now() },
        messageId,
      );
    }
  }

  // Get or create a conversation with a specific user
  async getOrCreateConversationWithUser(
    userId: string,
    userName: string,
  ): Promise<ChatConversation | null> {
    console.log(
      "🔥 [CHAT-MANAGER] getOrCreateConversationWithUser تم استدعاؤها!",
    );
    console.log("🗘️ بحث عن محادثة مع:", userId, userName);

    try {
      // First check if conversation already exists
      const conversations = await this.getConversations();
      console.log("📋 المحادثات الموجودة:", conversations.length);

      const existingConversation = conversations.find(
        (conv) =>
          conv.type === "direct" &&
          conv.participantIds.includes(userId) &&
          conv.participantIds.includes(this.currentUserId),
      );

      if (existingConversation) {
        console.log("✅ وجدت محادثة موجودة:", existingConversation.id);
        return existingConversation;
      }

      console.log("🆕 إنشاء محادثة جدي��ة");

      // Create new conversation locally first
      const newConversation: ChatConversation = {
        id: `conv_${this.currentUserId}_${userId}_${Date.now()}`,
        name: userName,
        participantIds: [this.currentUserId, userId],
        lastActivity: Date.now(),
        unreadCount: 0,
        type: "direct",
        isOnline: false,
      };

      // Save locally
      try {
        await this.storage.saveData(
          "conversations",
          newConversation,
          newConversation.id,
        );
        console.log("✅ تم حفظ المحادثة محلياً:", newConversation.id);
      } catch (storageError) {
        console.error("❌ فشل في حفظ المحادثة:");
        console.error(
          "  Error:",
          storageError?.message || storageError?.toString() || "Unknown error",
        );
        // Return the conversation anyway for immediate use
      }

      console.log("✅ تم إنشاء المحادثة:", newConversation.id);

      // No need to create conversation on server - conversations are derived from messages
      console.log("💬 المحادثة تم إنشاؤها محلياً، ستظهر عند إرسال أول رسالة");

      this.emit("conversation:created", newConversation);
      return newConversation;
    } catch (error: any) {
      console.error("❌ Failed to create conversation:");
      console.error("  Message:", error?.message || "Unknown error");
      console.error("  Type:", error?.name || "Unknown");
      return null;
    }
  }

  // Create fallback storage that works in memory
  private createFallbackStorage() {
    const memoryStorage = new Map();

    return {
      async saveData(storeName: string, data: any, id: string) {
        const key = `${storeName}:${id}`;
        memoryStorage.set(key, { id, data, timestamp: Date.now(), synced: 0 });
        console.log(`🧠 حفظ في الذاكرة: ${key}`);
        return id;
      },

      async getData(storeName: string, id: string) {
        const key = `${storeName}:${id}`;
        const stored = memoryStorage.get(key);
        return stored ? stored.data : null;
      },

      async getAllData(storeName: string) {
        const results = [];
        for (const [key, value] of memoryStorage.entries()) {
          if (key.startsWith(`${storeName}:`)) {
            results.push(value.data);
          }
        }
        return results;
      },

      async getUnsyncedData(storeName: string) {
        return []; // لا حاجة للمزامنة في fallback mode
      },

      async deleteData(storeName: string, id: string) {
        const key = `${storeName}:${id}`;
        memoryStorage.delete(key);
      },
    };
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    window.removeEventListener("online", this.syncPendingMessages);
    window.removeEventListener("offline", () => {});
  }
}

// Singleton instance
const chatManager = new ChatManager();

export default chatManager;
export { ChatManager };
