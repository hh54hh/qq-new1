/**
 * Offline-Aware API Client for Barber App
 * Handles network requests with offline fallback and data synchronization
 */

import { getOfflineStorage, OfflineStorageManager } from "./offline-storage";

interface APIRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  useCache?: boolean;
  cacheTTL?: number;
  storeOffline?: boolean;
  storeName?: string;
}

interface APIResponse<T = any> {
  data: T;
  success: boolean;
  offline: boolean;
  fromCache: boolean;
  error?: string;
}

class OfflineAPIClient {
  private storage: OfflineStorageManager | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeStorage();
    this.setupNetworkListeners();
  }

  private async initializeStorage(): Promise<void> {
    try {
      this.storage = await getOfflineStorage();
    } catch (error) {
      console.error("Failed to initialize offline storage:", error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Back online - starting sync...");
      this.syncPendingActions();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📡 Gone offline - enabling offline mode");
    });
  }

  async request<T = any>(
    endpoint: string,
    options: APIRequestOptions = {},
  ): Promise<APIResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      useCache = method === "GET",
      cacheTTL = 1000 * 60 * 30, // 30 minutes
      storeOffline = true,
      storeName,
    } = options;

    // Add auth token if available
    const authToken = localStorage.getItem("auth_token");
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    headers["Content-Type"] = headers["Content-Type"] || "application/json";

    try {
      // Try cache first for GET requests
      if (method === "GET" && useCache && this.storage) {
        const cached = await this.storage.getCachedAPIResponse(endpoint);
        if (cached) {
          return {
            data: cached,
            success: true,
            offline: !this.isOnline,
            fromCache: true,
          };
        }
      }

      // Try network request
      if (this.isOnline) {
        const response = await this.makeNetworkRequest(
          endpoint,
          method,
          headers,
          body,
        );

        // Cache successful GET responses
        if (response.success && method === "GET" && useCache && this.storage) {
          await this.storage.cacheAPIResponse(
            endpoint,
            response.data,
            cacheTTL,
          );
        }

        // Store certain data offline for later access
        if (response.success && storeOffline && storeName && this.storage) {
          await this.storeResponseData(response.data, storeName);
        }

        return response;
      }

      throw new Error("No network connection");
    } catch (error) {
      console.warn(`Network request failed for ${endpoint}:`, error);

      // Handle offline scenario
      return this.handleOfflineRequest(endpoint, method, options, body);
    }
  }

  private async makeNetworkRequest(
    endpoint: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): Promise<APIResponse> {
    const url = endpoint.startsWith("/") ? endpoint : `/api/${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      data,
      success: true,
      offline: false,
      fromCache: false,
    };
  }

  private async handleOfflineRequest(
    endpoint: string,
    method: string,
    options: APIRequestOptions,
    body?: any,
  ): Promise<APIResponse> {
    if (!this.storage) {
      return {
        data: null,
        success: false,
        offline: true,
        fromCache: false,
        error: "Offline storage not available",
      };
    }

    // For GET requests, try to return cached or stored data
    if (method === "GET") {
      return this.getOfflineData(endpoint, options);
    }

    // For other methods, store the action for later sync
    if (method !== "GET") {
      await this.storage.savePendingAction({
        type: "api_request",
        method,
        url: endpoint,
        data: body,
        headers: options.headers || {},
      });

      return {
        data: { queued: true, offline: true },
        success: true,
        offline: true,
        fromCache: false,
      };
    }

    return {
      data: null,
      success: false,
      offline: true,
      fromCache: false,
      error: "Request cannot be handled offline",
    };
  }

  private async getOfflineData(
    endpoint: string,
    options: APIRequestOptions,
  ): Promise<APIResponse> {
    if (!this.storage) {
      return {
        data: [],
        success: false,
        offline: true,
        fromCache: false,
        error: "No offline data available",
      };
    }

    try {
      // Try cached API response first
      const cached = await this.storage.getCachedAPIResponse(endpoint);
      if (cached) {
        return {
          data: cached,
          success: true,
          offline: true,
          fromCache: true,
        };
      }

      // Try to get from appropriate store based on endpoint
      const storeName = this.getStoreNameFromEndpoint(endpoint);
      if (storeName) {
        const data = await this.storage.getAllData(storeName);
        return {
          data,
          success: true,
          offline: true,
          fromCache: false,
        };
      }

      return {
        data: [],
        success: true,
        offline: true,
        fromCache: false,
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        offline: true,
        fromCache: false,
        error: "Failed to retrieve offline data",
      };
    }
  }

  private getStoreNameFromEndpoint(endpoint: string): string | null {
    if (endpoint.includes("bookings")) return "bookings";
    if (endpoint.includes("messages")) return "messages";
    if (endpoint.includes("barbershops")) return "barbershops";
    if (endpoint.includes("services")) return "services";
    if (endpoint.includes("notifications")) return "notifications";
    if (endpoint.includes("users")) return "users";
    if (endpoint.includes("posts")) return "posts";
    if (endpoint.includes("reviews")) return "reviews";
    return null;
  }

  private async storeResponseData(data: any, storeName: string): Promise<void> {
    if (!this.storage) return;

    try {
      if (Array.isArray(data)) {
        // Store each item individually
        for (const item of data) {
          if (item.id) {
            await this.storage.saveData(storeName, item, item.id.toString());
          }
        }
      } else if (data && data.id) {
        // Store single item
        await this.storage.saveData(storeName, data, data.id.toString());
      }
    } catch (error) {
      console.warn("Failed to store response data offline:", error);
    }
  }

  async syncPendingActions(): Promise<void> {
    if (!this.storage || !this.isOnline) return;

    try {
      const pendingActions = await this.storage.getPendingActions();
      console.log(`🔄 Syncing ${pendingActions.length} pending actions...`);

      for (const action of pendingActions) {
        try {
          await this.makeNetworkRequest(
            action.data.url,
            action.data.method,
            action.data.headers || {},
            action.data.data,
          );

          // Remove successful action
          await this.storage.removePendingAction(action.id);
          console.log(
            `✅ Synced action: ${action.data.method} ${action.data.url}`,
          );
        } catch (error) {
          console.error(`❌ Failed to sync action ${action.id}:`, error);
          // Keep the action for next sync attempt
        }
      }
    } catch (error) {
      console.error("Failed to sync pending actions:", error);
    }
  }

  // Convenience methods for common operations
  async get<T = any>(
    endpoint: string,
    options?: Omit<APIRequestOptions, "method">,
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<APIRequestOptions, "method" | "body">,
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<APIRequestOptions, "method" | "body">,
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body: data });
  }

  async delete<T = any>(
    endpoint: string,
    options?: Omit<APIRequestOptions, "method">,
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Storage management
  async clearOfflineData(): Promise<void> {
    if (!this.storage) return;

    const stores = [
      "bookings",
      "messages",
      "users",
      "barbershops",
      "services",
      "notifications",
      "posts",
      "reviews",
      "api_cache",
    ];

    for (const store of stores) {
      try {
        await this.storage.clearStore(store);
      } catch (error) {
        console.warn(`Failed to clear store ${store}:`, error);
      }
    }
  }

  async getStorageInfo(): Promise<any> {
    if (!this.storage) return null;
    return this.storage.getStorageInfo();
  }

  isOffline(): boolean {
    return !this.isOnline;
  }
}

// Singleton instance
const offlineAPI = new OfflineAPIClient();

export default offlineAPI;
export { OfflineAPIClient };
export type { APIResponse, APIRequestOptions };
