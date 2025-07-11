/**
 * Background Sync Service
 * Handles offline message sending, automatic retries, and background synchronization
 */

import { getChatCache, CachedMessage } from "./chat-cache";
import apiClient from "./api";
import { getOfflineStorage } from "./offline-storage";

interface QueuedMessage {
  id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  retry_count: number;
  last_retry: number;
  max_retries: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingMessages: number;
  lastSync: Date | null;
  retryQueue: QueuedMessage[];
}

class BackgroundSyncService {
  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private storage: any = null;
  private chatCache: any = null;

  private readonly config = {
    syncIntervalMs: 10000, // 10 seconds
    retryIntervalMs: 30000, // 30 seconds
    maxRetries: 5,
    retryDelayMs: 5000, // 5 seconds initial delay
    maxRetryDelayMs: 60000, // 1 minute max delay
  };

  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingMessages: 0,
    lastSync: null,
    retryQueue: [],
  };

  private listeners: Array<(status: SyncStatus) => void> = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.storage = await getOfflineStorage();
      this.chatCache = await getChatCache();

      // Listen for online/offline events
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));

      // Listen for page visibility changes
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange.bind(this),
      );

      // Start background processes
      this.startBackgroundSync();
      this.startRetryService();

      // Load existing retry queue
      await this.loadRetryQueue();

      this.isInitialized = true;
      console.log("✅ Background sync service initialized");

      // Initial sync if online
      if (this.status.isOnline) {
        this.performSync();
      }
    } catch (error) {
      console.error("❌ Failed to initialize background sync service:", error);
      throw error;
    }
  }

  // =================== EVENT HANDLERS ===================

  private handleOnline(): void {
    console.log("🌐 تم الاتصال بالإنترنت - بدء المزامنة التلقائية");
    this.status.isOnline = true;
    this.notifyListeners();

    // Immediate sync when coming online
    setTimeout(() => {
      this.performSync();
      this.processRetryQueue();
    }, 1000);
  }

  private handleOffline(): void {
    console.log("📱 انقطع الاتصال بالإنترنت - تم تفعيل الوضع الأوفلاين");
    this.status.isOnline = false;
    this.status.isSyncing = false;
    this.notifyListeners();
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible" && this.status.isOnline) {
      // Page became visible and we're online - sync immediately
      setTimeout(() => {
        this.performSync();
      }, 500);
    }
  }

  // =================== BACKGROUND SYNC ===================

  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (
        this.status.isOnline &&
        document.visibilityState === "visible" &&
        !this.status.isSyncing
      ) {
        this.performSync();
      }
    }, this.config.syncIntervalMs);
  }

  private async performSync(): Promise<void> {
    if (this.status.isSyncing || !this.status.isOnline) return;

    this.status.isSyncing = true;
    this.notifyListeners();

    try {
      // Sync pending messages first
      await this.syncPendingMessages();

      // Update conversations in background
      await this.syncConversations();

      this.status.lastSync = new Date();
      console.log("🔄 مزامنة الخلفية اكتملت بنجاح");
    } catch (error) {
      console.warn("⚠️ فشلت مزامنة الخلفية:", error);
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async syncPendingMessages(): Promise<void> {
    try {
      const pendingMessages =
        await this.storage.getUnsyncedData("pendingMessages");

      for (const pendingData of pendingMessages) {
        const messageData = pendingData.data;
        try {
          // Try to send the message
          const sentMessage = await apiClient.createMessage({
            receiver_id: messageData.receiver_id,
            message: messageData.message,
          });

          // Mark as synced and remove from pending
          await this.storage.markAsSynced("pendingMessages", pendingData.id);
          await this.storage.deleteData("pendingMessages", pendingData.id);

          // Update chat cache with real message
          if (this.chatCache) {
            // Remove optimistic message and add real one
            // This would be handled by the cache manager
          }

          console.log(`✅ رسالة معلقة تم إرسالها: ${pendingData.id}`);
        } catch (error) {
          console.warn(`❌ فشل إرسال رسالة معلقة: ${pendingData.id}`, error);

          // Add to retry queue if not already there
          await this.addToRetryQueue(messageData, pendingData.id);
        }
      }
    } catch (error) {
      console.warn("Failed to sync pending messages:", error);
    }
  }

  private async syncConversations(): Promise<void> {
    // This would trigger the chat cache to refresh conversations
    // in the background without affecting the UI
    if (this.chatCache) {
      // The chat cache handles this automatically
    }
  }

  // =================== RETRY QUEUE ===================

  private startRetryService(): void {
    if (this.retryInterval) return;

    this.retryInterval = setInterval(() => {
      if (this.status.isOnline && this.status.retryQueue.length > 0) {
        this.processRetryQueue();
      }
    }, this.config.retryIntervalMs);
  }

  private async addToRetryQueue(
    messageData: any,
    originalId: string,
  ): Promise<void> {
    const queuedMessage: QueuedMessage = {
      id: originalId,
      receiver_id: messageData.receiver_id,
      message: messageData.message,
      created_at: messageData.created_at || new Date().toISOString(),
      retry_count: 0,
      last_retry: 0,
      max_retries: this.config.maxRetries,
    };

    // Check if already in queue
    const existingIndex = this.status.retryQueue.findIndex(
      (msg) => msg.id === originalId,
    );

    if (existingIndex >= 0) {
      // Update existing entry
      this.status.retryQueue[existingIndex] = queuedMessage;
    } else {
      // Add new entry
      this.status.retryQueue.push(queuedMessage);
    }

    // Save to storage
    await this.saveRetryQueue();
    this.updatePendingCount();
    this.notifyListeners();
  }

  private async processRetryQueue(): Promise<void> {
    if (!this.status.isOnline || this.status.retryQueue.length === 0) return;

    const now = Date.now();
    const messagesToRetry = this.status.retryQueue.filter((msg) => {
      const timeSinceLastRetry = now - msg.last_retry;
      const retryDelay = Math.min(
        this.config.retryDelayMs * Math.pow(2, msg.retry_count),
        this.config.maxRetryDelayMs,
      );
      return timeSinceLastRetry >= retryDelay;
    });

    for (const queuedMessage of messagesToRetry) {
      try {
        // Attempt to send the message
        const sentMessage = await apiClient.createMessage({
          receiver_id: queuedMessage.receiver_id,
          message: queuedMessage.message,
        });

        // Success - remove from retry queue
        this.status.retryQueue = this.status.retryQueue.filter(
          (msg) => msg.id !== queuedMessage.id,
        );

        // Remove from storage
        await this.storage.deleteData("pendingMessages", queuedMessage.id);

        console.log(`✅ رسالة معاد إرسالها بنجاح: ${queuedMessage.id}`);
      } catch (error) {
        // Failed - increment retry count
        queuedMessage.retry_count++;
        queuedMessage.last_retry = now;

        if (queuedMessage.retry_count >= queuedMessage.max_retries) {
          // Max retries reached - remove from queue
          this.status.retryQueue = this.status.retryQueue.filter(
            (msg) => msg.id !== queuedMessage.id,
          );

          console.error(
            `❌ فشل إرسال الرسالة نهائياً بعد ${queuedMessage.max_retries} محاولات: ${queuedMessage.id}`,
          );

          // Mark as failed in storage
          await this.storage.deleteData("pendingMessages", queuedMessage.id);
        } else {
          console.warn(
            `⚠️ فشل إرسال الرسالة (محاولة ${queuedMessage.retry_count}/${queuedMessage.max_retries}): ${queuedMessage.id}`,
          );
        }
      }
    }

    await this.saveRetryQueue();
    this.updatePendingCount();
    this.notifyListeners();
  }

  private async loadRetryQueue(): Promise<void> {
    try {
      const saved = await this.storage.getData("backgroundSync", "retryQueue");
      if (saved && Array.isArray(saved)) {
        this.status.retryQueue = saved;
        this.updatePendingCount();
      }
    } catch (error) {
      console.warn("Failed to load retry queue:", error);
      this.status.retryQueue = [];
    }
  }

  private async saveRetryQueue(): Promise<void> {
    try {
      await this.storage.saveData(
        "backgroundSync",
        this.status.retryQueue,
        "retryQueue",
        "retry_queue",
      );
    } catch (error) {
      console.warn("Failed to save retry queue:", error);
    }
  }

  private updatePendingCount(): void {
    this.status.pendingMessages = this.status.retryQueue.length;
  }

  // =================== PUBLIC API ===================

  async queueMessage(messageData: {
    receiver_id: string;
    message: string;
  }): Promise<string> {
    const messageId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to pending messages
    await this.storage.saveData(
      "pendingMessages",
      {
        ...messageData,
        created_at: new Date().toISOString(),
      },
      messageId,
      "pending_message",
    );

    // Add to retry queue
    await this.addToRetryQueue(messageData, messageId);

    // Try immediate send if online
    if (this.status.isOnline) {
      setTimeout(() => {
        this.processRetryQueue();
      }, 100);
    }

    return messageId;
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback({ ...this.status });
      } catch (error) {
        console.warn("Error in sync status listener:", error);
      }
    });
  }

  async forcSync(): Promise<void> {
    if (!this.status.isOnline) {
      throw new Error("لا يمكن المزامنة في الوضع الأوفلاين");
    }

    await this.performSync();
    await this.processRetryQueue();
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );

    this.listeners = [];
    this.isInitialized = false;

    console.log("🔌 Background sync service destroyed");
  }
}

// Singleton instance
let backgroundSyncService: BackgroundSyncService | null = null;

export async function getBackgroundSync(): Promise<BackgroundSyncService> {
  if (!backgroundSyncService) {
    backgroundSyncService = new BackgroundSyncService();
    await backgroundSyncService.initialize();
  }
  return backgroundSyncService;
}

export { BackgroundSyncService };
export type { SyncStatus, QueuedMessage };
