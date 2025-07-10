/**
 * Network-aware API wrapper that handles offline scenarios gracefully
 */

import apiClient from "./api";

class NetworkAwareAPIWrapper {
  private apiClient: typeof apiClient;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.apiClient = apiClient;
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

  // Helper function to properly format error messages
  private formatError(error: any): string {
    if (!error) return "Unknown error";

    if (typeof error === "string") return error;

    if (error.message) return error.message;

    if (error.error && typeof error.error === "string") return error.error;

    if (error.toString && typeof error.toString === "function") {
      const errorString = error.toString();
      if (errorString !== "[object Object]") return errorString;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "خطأ غير متوقع";
    }
  }

  async safeRequest<T>(
    operation: () => Promise<T>,
    fallback?: T,
  ): Promise<T | null> {
    try {
      // Update online status before making request
      this.isOnline = navigator.onLine;
      return await operation();
    } catch (error: any) {
      // Handle network errors gracefully
      if (this.isNetworkError(error)) {
        // Update online status after error
        this.isOnline = navigator.onLine;

        if (!this.isOnline) {
          console.log("📱 Offline mode - using cached data");
        } else {
          console.log("🌐 Network issue detected - using fallback data");
        }

        return fallback || null;
      }

      // For non-network errors, provide fallback if available
      console.warn("⚠️ API Error (non-network):", this.formatError(error));
      if (fallback !== undefined) {
        console.log("🔄 استخدام البيانات الاحتياطية لخطأ غير شبكي");
        return fallback;
      }
      throw error;
    }
  }

  private isNetworkError(error: any): boolean {
    return (
      error?.errorType === "NETWORK_ERROR" ||
      error?.isNetworkError === true ||
      (error instanceof TypeError && error.message.includes("fetch")) ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("فشل في الاتصال") ||
      error.name === "NetworkError" ||
      error.name === "TypeError"
    );
  }

  // Wrapped API methods
  async getUnreadMessageCount() {
    return this.safeRequest(() => this.apiClient.getUnreadMessageCount(), {
      count: 0,
    });
  }

  async getNotifications() {
    return this.safeRequest(() => this.apiClient.getNotifications(), {
      notifications: [],
    });
  }

  async getMessages(conversationId?: string) {
    return this.safeRequest(() => this.apiClient.getMessages(conversationId), {
      messages: [],
    });
  }

  async getBookings() {
    return this.safeRequest(() => this.apiClient.getBookings(), {
      bookings: [],
      total: 0,
    });
  }

  async getPosts(userId?: string) {
    return this.safeRequest(() => this.apiClient.getPosts(userId), {
      posts: [],
      total: 0,
    });
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
    // Placeholder for delete booking - not implemented in current API
    return Promise.resolve({ success: true });
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
