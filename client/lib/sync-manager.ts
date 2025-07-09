/**
 * Background Sync Manager for Barber App
 * Handles data synchronization when the app comes back online
 */

import { getOfflineStorage } from "./offline-storage";
import offlineAPI from "./offline-api";

interface SyncEvent {
  type: string;
  data: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncQueue: SyncEvent[] = [];
  private syncInterval: number | null = null;

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Network restored - starting sync...");
      this.syncAll();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📡 Network lost - sync paused");
    });

    // Service Worker sync events
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if ("sync" in window.ServiceWorkerRegistration.prototype) {
          // Register for background sync events
          registration.sync?.register("background-sync-data");
        }
      });
    }
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    }, 30000);
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log("🔄 Starting comprehensive data sync...");

    try {
      // Sync pending API actions first
      await offlineAPI.syncPendingActions();

      // Sync specific data types
      await this.syncBookings();
      await this.syncMessages();
      await this.syncUserData();
      await this.syncNotifications();

      console.log("✅ All data synced successfully");

      // Notify the user if there were significant changes
      this.notifyUserOfSync();
    } catch (error) {
      console.error("❌ Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncBookings(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const unsyncedBookings = await storage.getUnsyncedData("bookings");

      for (const booking of unsyncedBookings) {
        try {
          // Determine sync action based on booking data
          if (booking.data._action === "create") {
            await this.createBooking(booking);
          } else if (booking.data._action === "update") {
            await this.updateBooking(booking);
          } else if (booking.data._action === "cancel") {
            await this.cancelBooking(booking);
          }

          // Mark as synced
          await storage.markAsSynced("bookings", booking.id);
          console.log(`✅ Synced booking: ${booking.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Failed to sync bookings:", error);
    }
  }

  private async createBooking(booking: any): Promise<void> {
    const response = await offlineAPI.post("/api/bookings", booking.data);
    if (!response.success) {
      throw new Error("Failed to create booking");
    }
  }

  private async updateBooking(booking: any): Promise<void> {
    const response = await offlineAPI.put(
      `/api/bookings/${booking.data.id}`,
      booking.data,
    );
    if (!response.success) {
      throw new Error("Failed to update booking");
    }
  }

  private async cancelBooking(booking: any): Promise<void> {
    const response = await offlineAPI.put(
      `/api/bookings/${booking.data.id}/cancel`,
      {},
    );
    if (!response.success) {
      throw new Error("Failed to cancel booking");
    }
  }

  private async syncMessages(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const unsyncedMessages = await storage.getUnsyncedData("messages");

      for (const message of unsyncedMessages) {
        try {
          if (message.data._action === "send") {
            await this.sendMessage(message);
          } else if (message.data._action === "mark_read") {
            await this.markMessageAsRead(message);
          }

          await storage.markAsSynced("messages", message.id);
          console.log(`✅ Synced message: ${message.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync message ${message.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Failed to sync messages:", error);
    }
  }

  private async sendMessage(message: any): Promise<void> {
    const response = await offlineAPI.post("/api/messages", message.data);
    if (!response.success) {
      throw new Error("Failed to send message");
    }
  }

  private async markMessageAsRead(message: any): Promise<void> {
    const response = await offlineAPI.put(
      `/api/messages/${message.data.id}/read`,
      {},
    );
    if (!response.success) {
      throw new Error("Failed to mark message as read");
    }
  }

  private async syncUserData(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const unsyncedUsers = await storage.getUnsyncedData("users");

      for (const user of unsyncedUsers) {
        try {
          if (user.data._action === "update_profile") {
            await this.updateUserProfile(user);
          } else if (user.data._action === "update_preferences") {
            await this.updateUserPreferences(user);
          }

          await storage.markAsSynced("users", user.id);
          console.log(`✅ Synced user data: ${user.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync user data ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Failed to sync user data:", error);
    }
  }

  private async updateUserProfile(user: any): Promise<void> {
    const response = await offlineAPI.put(
      `/api/users/${user.data.id}/profile`,
      user.data,
    );
    if (!response.success) {
      throw new Error("Failed to update user profile");
    }
  }

  private async updateUserPreferences(user: any): Promise<void> {
    const response = await offlineAPI.put(
      `/api/users/${user.data.id}/preferences`,
      user.data.preferences,
    );
    if (!response.success) {
      throw new Error("Failed to update user preferences");
    }
  }

  private async syncNotifications(): Promise<void> {
    try {
      // Fetch latest notifications
      const response = await offlineAPI.get("/api/notifications");
      if (response.success && response.data) {
        const storage = await getOfflineStorage();

        // Store new notifications
        for (const notification of response.data) {
          await storage.saveData(
            "notifications",
            notification,
            notification.id.toString(),
          );
        }

        console.log(
          `✅ Synced ${response.data.length} notifications from server`,
        );
      }
    } catch (error) {
      console.error("Failed to sync notifications:", error);
    }
  }

  private async notifyUserOfSync(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const pendingActions = await storage.getPendingActions();

      if (pendingActions.length === 0) {
        // Show brief success notification
        this.showNotification(
          "تم تحديث البيانات",
          "تمت مزامنة جميع البيانات بنجاح",
        );
      }
    } catch (error) {
      console.warn("Failed to check sync status for notification:", error);
    }
  }

  private showNotification(title: string, body: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "sync-notification",
        silent: true,
      });
    } else {
      // Fallback to console or toast notification
      console.log(`📱 ${title}: ${body}`);
    }
  }

  // Queue a sync event for later processing
  async queueSyncEvent(
    type: string,
    data: any,
    maxAttempts: number = 3,
  ): Promise<void> {
    const event: SyncEvent = {
      type,
      data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts,
    };

    this.syncQueue.push(event);

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    while (this.syncQueue.length > 0 && this.isOnline) {
      const event = this.syncQueue.shift();
      if (!event) continue;

      try {
        await this.processSyncEvent(event);
      } catch (error) {
        event.attempts++;
        if (event.attempts < event.maxAttempts) {
          // Re-queue for retry
          this.syncQueue.push(event);
        } else {
          console.error(
            `❌ Sync event failed after ${event.maxAttempts} attempts:`,
            event,
          );
        }
      }
    }
  }

  private async processSyncEvent(event: SyncEvent): Promise<void> {
    switch (event.type) {
      case "booking_create":
        await this.createBooking(event);
        break;
      case "booking_update":
        await this.updateBooking(event);
        break;
      case "message_send":
        await this.sendMessage(event);
        break;
      default:
        console.warn(`Unknown sync event type: ${event.type}`);
    }
  }

  // Public methods for manual sync triggers
  async forceSyncBookings(): Promise<void> {
    await this.syncBookings();
  }

  async forceSyncMessages(): Promise<void> {
    await this.syncMessages();
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Singleton instance
const syncManager = new SyncManager();

export default syncManager;
export { SyncManager };
export type { SyncEvent };
