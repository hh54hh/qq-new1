/**
 * Offline Storage Manager for Barber App
 * Handles data persistence using IndexedDB for offline functionality
 */

interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: number; // 0 = false, 1 = true
}

interface StorageOptions {
  dbName: string;
  version: number;
  stores: string[];
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private readonly options: StorageOptions;

  constructor(options?: Partial<StorageOptions>) {
    this.options = {
      dbName: "BarberAppOfflineDB",
      version: 2,
      stores: [
        "bookings",
        "messages",
        "users",
        "barbershops",
        "services",
        "notifications",
        "posts",
        "reviews",
        "pendingActions",
        "conversations",
        "pendingMessages",
        "pendingConversationReads",
      ],
      ...options,
    };
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = indexedDB.open(this.options.dbName, this.options.version);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = async () => {
        this.db = request.result;
        console.log("✅ IndexedDB initialized successfully");

        // Cleanup old boolean data if this is an upgrade
        if (this.options.version > 1) {
          await this.cleanupOldBooleanData();
        }

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        this.options.stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: "id",
              autoIncrement: false,
            });

            // Add indexes
            store.createIndex("timestamp", "timestamp", { unique: false });
            store.createIndex("synced", "synced", { unique: false });
            store.createIndex("type", "type", { unique: false });

            console.log(`📦 Created object store: ${storeName}`);
          }
        });
      };
    });
  }

  async saveData(
    storeName: string,
    data: any,
    id?: string,
    type?: string,
  ): Promise<string> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(
        `Store '${storeName}' not found. Available stores:`,
        Array.from(this.db.objectStoreNames),
      );
      throw new Error(`Object store '${storeName}' not found`);
    }

    const actualId = id || this.generateId();
    const offlineData: OfflineData = {
      id: actualId,
      type: type || "generic",
      data,
      timestamp: Date.now(),
      synced: 0, // استخدام 0 بدلاً من false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(offlineData);

      request.onsuccess = () => {
        console.log(`💾 Data saved to ${storeName}:`, actualId);
        resolve(actualId);
      };

      request.onerror = () => {
        reject(new Error(`Failed to save data to ${storeName}`));
      };
    });
  }

  async getData(storeName: string, id: string): Promise<any | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(
        `Store '${storeName}' not found. Available stores:`,
        Array.from(this.db.objectStoreNames),
      );
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get data from ${storeName}`));
      };
    });
  }

  async getAllData(storeName: string): Promise<any[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map((item: OfflineData) => ({
          ...item.data,
          _offlineId: item.id,
          _timestamp: item.timestamp,
          _synced: item.synced,
        }));
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all data from ${storeName}`));
      };
    });
  }

  async getUnsyncedData(storeName: string): Promise<OfflineData[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(
        `Store '${storeName}' not found. Available stores:`,
        Array.from(this.db.objectStoreNames),
      );
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index("synced");
      // استخدام 0 للبحث عن البيانات غير المتزامنة (synced = false)
      const keyValue = 0;
      if (!this.isValidIndexDBKey(keyValue)) {
        console.warn("⚠️ Invalid key for IndexedDB:", keyValue);
        resolve([]);
        return;
      }
      const request = index.getAll(IDBKeyRange.only(keyValue));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get unsynced data from ${storeName}`));
      };
    });
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = 1; // استخدام 1 بدلاً من true
          const putRequest = store.put(data);

          putRequest.onsuccess = () => {
            console.log(`✅ Marked as synced: ${storeName}/${id}`);
            resolve();
          };

          putRequest.onerror = () => {
            reject(new Error(`Failed to mark as synced: ${storeName}/${id}`));
          };
        } else {
          resolve(); // Item doesn't exist, consider it handled
        }
      };

      getRequest.onerror = () => {
        reject(
          new Error(`Failed to get data for sync marking: ${storeName}/${id}`),
        );
      };
    });
  }

  async deleteData(storeName: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`🗑️ Data deleted from ${storeName}:`, id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete data from ${storeName}`));
      };
    });
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`🧹 Cleared store: ${storeName}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${storeName}`));
      };
    });
  }

  async getStorageInfo(): Promise<{
    totalSize: number;
    storesSizes: Record<string, number>;
  }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const storesSizes: Record<string, number> = {};
    let totalSize = 0;

    for (const storeName of this.options.stores) {
      const data = await this.getAllData(storeName);
      const size = new Blob([JSON.stringify(data)]).size;
      storesSizes[storeName] = size;
      totalSize += size;
    }

    return { totalSize, storesSizes };
  }

  async savePendingAction(action: {
    type: string;
    method: string;
    url: string;
    data?: any;
    headers?: Record<string, string>;
  }): Promise<string> {
    const id = this.generateId();
    await this.saveData("pendingActions", action, id, "api_action");
    return id;
  }

  async getPendingActions(): Promise<OfflineData[]> {
    return this.getUnsyncedData("pendingActions");
  }

  async removePendingAction(id: string): Promise<void> {
    await this.deleteData("pendingActions", id);
  }

  // Cache management for API responses
  async cacheAPIResponse(
    endpoint: string,
    data: any,
    ttl: number = 1000 * 60 * 30, // 30 minutes default
  ): Promise<void> {
    const cacheKey = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const cacheData = {
      data,
      expires: Date.now() + ttl,
      endpoint,
    };

    await this.saveData("api_cache", cacheData, cacheKey, "api_response");
  }

  async getCachedAPIResponse(endpoint: string): Promise<any | null> {
    const cacheKey = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`;

    try {
      const cached = await this.getData("api_cache", cacheKey);

      if (cached && cached.expires > Date.now()) {
        console.log(`📦 Using cached API response for: ${endpoint}`);
        return cached.data;
      } else if (cached) {
        // Expired cache, remove it
        await this.deleteData("api_cache", cacheKey);
      }
    } catch (error) {
      console.warn("Failed to get cached API response:", error);
    }

    return null;
  }

  private async cleanupOldBooleanData(): Promise<void> {
    if (!this.db) return;

    console.log("🧩 تنظيف البيانات القديمة...");

    try {
      for (const storeName of this.options.stores) {
        if (this.db.objectStoreNames.contains(storeName)) {
          const transaction = this.db.transaction([storeName], "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            const allData = request.result;
            for (const item of allData) {
              if (typeof item.synced === "boolean") {
                // تحويل boolean إلى number
                item.synced = item.synced ? 1 : 0;
                store.put(item);
                console.log(`🔄 تحويل synced لـ ${item.id}`);
              }
            }
          };
        }
      }
    } catch (error) {
      console.warn("⚠️ فشل في تنظيف البيانات القديمة:", error);
    }
  }

  private isValidIndexDBKey(key: any): boolean {
    // IndexedDB يدعم numbers, strings, dates, arrays - لكن لا يدعم booleans
    return (
      typeof key === "number" ||
      typeof key === "string" ||
      key instanceof Date ||
      Array.isArray(key)
    );
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let offlineStorage: OfflineStorageManager | null = null;

export async function getOfflineStorage(): Promise<OfflineStorageManager> {
  if (!offlineStorage) {
    offlineStorage = new OfflineStorageManager();
    await offlineStorage.initialize();
  }
  return offlineStorage;
}

export { OfflineStorageManager };
export type { OfflineData, StorageOptions };
