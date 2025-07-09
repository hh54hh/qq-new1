/**
 * Network-aware API wrapper that handles offline scenarios gracefully
 */

import { ApiClient } from "./api";

class NetworkAwareAPIWrapper {
  private apiClient: ApiClient;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.apiClient = new ApiClient();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Network restored");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📡 Network lost");
    });
  }

  async safeRequest<T>(
    operation: () => Promise<T>,
    fallback?: T,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error: any) {
      // Handle network errors gracefully
      if (this.isNetworkError(error)) {
        if (!this.isOnline) {
          console.log("📱 Offline mode - operation skipped silently");
          return fallback || null;
        } else {
          console.warn("⚠️ Network error while online:", error.message);
          return fallback || null;
        }
      }

      // For non-network errors, let them bubble up
      throw error;
    }
  }

  private isNetworkError(error: any): boolean {
    return (
      error?.errorType === "NETWORK_ERROR" ||
      (error instanceof TypeError && error.message.includes("fetch")) ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError")
    );
  }

  // Wrapped API methods
  async getUnreadMessageCount() {
    return this.safeRequest(() => this.apiClient.getUnreadMessageCount(), {
      count: 0,
    });
  }

  async getNotifications() {
    return this.safeRequest(() => this.apiClient.getNotifications(), []);
  }

  async getMessages(conversationId?: string) {
    return this.safeRequest(
      () => this.apiClient.getMessages(conversationId),
      [],
    );
  }

  async getBookings() {
    return this.safeRequest(() => this.apiClient.getBookings(), []);
  }

  // Pass-through methods for non-GET operations (these should handle errors normally)
  async sendMessage(data: any) {
    return this.apiClient.sendMessage(data);
  }

  async createBooking(data: any) {
    return this.apiClient.createBooking(data);
  }

  async updateBooking(id: string, data: any) {
    return this.apiClient.updateBooking(id, data);
  }

  async deleteBooking(id: string) {
    return this.apiClient.deleteBooking(id);
  }

  // Utility methods
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      lastChecked: new Date(),
    };
  }
}

// Export singleton instance
export const networkAwareAPI = new NetworkAwareAPIWrapper();
export default networkAwareAPI;
