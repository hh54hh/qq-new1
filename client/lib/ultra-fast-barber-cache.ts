/**
 * Ultra-Fast Barber Cache System
 * <50ms load times with instant response
 */

import { CachedBarber } from "./barber-cache";
import apiClient from "./api";
import { measurePerformance } from "./performance-monitor";

interface UltraFastCache {
  barbers: CachedBarber[];
  lastUpdate: number;
  preloadedData: boolean;
}

class UltraFastBarberCache {
  private memoryCache: UltraFastCache = {
    barbers: [],
    lastUpdate: 0,
    preloadedData: false,
  };

  private indexedDBCache: IDBDatabase | null = null;
  private isInitialized = false;
  private currentUserId: string | null = null;

  private readonly config = {
    memoryRetention: 300000, // 5 minutes
    maxMemoryBarbers: 50,
    instantLoadThreshold: 10000, // 10 seconds
    preloadBatchSize: 20,
    backgroundSyncDelay: 100,
  };

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) return;

    this.currentUserId = userId;
    await this.initIndexedDB();
    await this.loadFromIndexedDB();
    this.isInitialized = true;

    console.log("⚡ Ultra-fast barber cache initialized");
  }

  // ================= INSTANT LOADING =================

  async getInstantBarbers(): Promise<{
    barbers: CachedBarber[];
    source: "memory" | "indexeddb" | "skeleton";
    loadTime: number;
  }> {
    const startTime = performance.now();

    // 1. Memory cache first (fastest - <5ms)
    if (this.memoryCache.barbers.length > 0) {
      const loadTime = performance.now() - startTime;
      console.log(`⚡ Memory cache hit: ${loadTime.toFixed(1)}ms`);

      // Start background refresh if data is old
      if (
        Date.now() - this.memoryCache.lastUpdate >
        this.config.instantLoadThreshold
      ) {
        setTimeout(
          () => this.backgroundRefresh(),
          this.config.backgroundSyncDelay,
        );
      }

      return {
        barbers: this.memoryCache.barbers,
        source: "memory",
        loadTime,
      };
    }

    // 2. IndexedDB cache (fast - <20ms)
    if (this.indexedDBCache) {
      try {
        const cached = await this.readFromIndexedDB();
        if (cached && cached.length > 0) {
          this.updateMemoryCache(cached);

          const loadTime = performance.now() - startTime;
          console.log(`📱 IndexedDB cache hit: ${loadTime.toFixed(1)}ms`);

          setTimeout(
            () => this.backgroundRefresh(),
            this.config.backgroundSyncDelay,
          );

          return {
            barbers: cached,
            source: "indexeddb",
            loadTime,
          };
        }
      } catch (error) {
        console.warn("IndexedDB read failed:", error);
      }
    }

    // 3. Generate skeletons immediately (<2ms)
    const skeletons = this.generateSkeletons();
    const loadTime = performance.now() - startTime;
    console.log(`🦴 Skeleton generation: ${loadTime.toFixed(1)}ms`);

    // Start aggressive background loading
    setTimeout(() => this.aggressiveBackgroundLoad(), 0);

    return {
      barbers: skeletons,
      source: "skeleton",
      loadTime,
    };
  }

  // ================= SKELETON GENERATION =================

  private generateSkeletons(): CachedBarber[] {
    const count = 6;
    const skeletons: CachedBarber[] = [];

    for (let i = 0; i < count; i++) {
      skeletons.push({
        id: `skeleton_${i}`,
        name: "",
        email: "",
        role: "barber",
        status: "متاح",
        level: 50,
        points: 500,
        is_verified: true,
        created_at: new Date().toISOString(),
        rating: 4.5,
        followers: 25,
        distance: 2.5,
        price: 40,
        isFollowed: false,
        _cached_at: Date.now(),
        _quality_score: 50,
        _isSkeleton: true,
      } as CachedBarber);
    }

    return skeletons;
  }

  // ================= BACKGROUND LOADING =================

  private async aggressiveBackgroundLoad(): Promise<void> {
    try {
      console.log("🔥 Starting aggressive background load...");

      const loadPromises = [this.loadFromAPI(), this.loadCachedFollowData()];
      const results = await Promise.allSettled(loadPromises);

      const apiResult = results[0];
      if (apiResult.status === "fulfilled" && apiResult.value.length > 0) {
        this.processAndCacheBarbers(apiResult.value);
      }
    } catch (error) {
      console.warn("Aggressive background load failed:", error);
    }
  }

  private async backgroundRefresh(): Promise<void> {
    try {
      const freshBarbers = await this.loadFromAPI();
      if (freshBarbers.length > 0) {
        this.processAndCacheBarbers(freshBarbers);
      }
    } catch (error) {
      console.warn("Background refresh failed:", error);
    }
  }

  private async loadFromAPI(): Promise<any[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = (await Promise.race([
        apiClient.getBarbers(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API timeout")), 3000),
        ),
      ])) as any;

      clearTimeout(timeoutId);
      return response.barbers || [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async loadCachedFollowData(): Promise<string[]> {
    try {
      const response = await apiClient.getFollows("following");
      return response.follows?.map((f: any) => f.followed_id) || [];
    } catch (error) {
      return [];
    }
  }

  // ================= PROCESSING & CACHING =================

  private processAndCacheBarbers(rawBarbers: any[]): void {
    const processed = rawBarbers
      .slice(0, this.config.preloadBatchSize)
      .map((barber) => ({
        ...barber,
        role: "barber" as const,
        rating: barber.rating || 4.0,
        followers: barber.followers_count || 0,
        distance: 2.5,
        status: barber.status || "متاح",
        isFollowed: false,
        price: barber.price || 30,
        _cached_at: Date.now(),
        _quality_score: this.calculateQualityScore(barber),
      })) as CachedBarber[];

    this.updateMemoryCache(processed);
    this.saveToIndexedDB(processed);
    this.notifyUIUpdate();
  }

  private calculateQualityScore(barber: any): number {
    let score = 0;
    score += (barber.rating || 0) * 10;
    score += (barber.level || 0) * 0.5;
    if (barber.is_verified) score += 15;
    score += Math.min((barber.followers_count || 0) * 0.1, 20);
    return Math.round(score);
  }

  private updateMemoryCache(barbers: CachedBarber[]): void {
    this.memoryCache = {
      barbers: barbers.slice(0, this.config.maxMemoryBarbers),
      lastUpdate: Date.now(),
      preloadedData: true,
    };
  }

  // ================= INDEXEDDB OPERATIONS =================

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        `ultrafast_barbers_${this.currentUserId}`,
        1,
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("barbers")) {
          db.createObjectStore("barbers", { keyPath: "id" });
        }
      };
    });
  }

  private async loadFromIndexedDB(): Promise<void> {
    try {
      const cached = await this.readFromIndexedDB();
      if (cached && cached.length > 0) {
        this.updateMemoryCache(cached);
      }
    } catch (error) {
      console.warn("Failed to load from IndexedDB:", error);
    }
  }

  private async readFromIndexedDB(): Promise<CachedBarber[] | null> {
    if (!this.indexedDBCache) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(
        ["barbers"],
        "readonly",
      );
      const store = transaction.objectStore("barbers");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const barbers = request.result as CachedBarber[];
        const oneHourAgo = Date.now() - 3600000;
        const fresh = barbers.filter((b) => b._cached_at > oneHourAgo);
        resolve(fresh.length > 0 ? fresh : null);
      };
    });
  }

  private async saveToIndexedDB(barbers: CachedBarber[]): Promise<void> {
    if (!this.indexedDBCache) return;

    try {
      const transaction = this.indexedDBCache.transaction(
        ["barbers"],
        "readwrite",
      );
      const store = transaction.objectStore("barbers");

      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => resolve();
      });

      for (const barber of barbers) {
        store.add(barber);
      }
    } catch (error) {
      console.warn("Failed to save to IndexedDB:", error);
    }
  }

  // ================= UI NOTIFICATIONS =================

  private notifyUIUpdate(): void {
    window.dispatchEvent(
      new CustomEvent("ultraFastBarbersUpdated", {
        detail: {
          timestamp: Date.now(),
          source: "ultra-fast-cache",
        },
      }),
    );
  }

  // ================= PRELOADING =================

  async preloadOnLogin(): Promise<void> {
    console.log("🚀 Ultra-fast preload initiated");
    setTimeout(() => {
      this.aggressiveBackgroundLoad();
    }, 0);
  }

  // ================= CLEANUP =================

  destroy(): void {
    this.memoryCache = { barbers: [], lastUpdate: 0, preloadedData: false };
    if (this.indexedDBCache) {
      this.indexedDBCache.close();
      this.indexedDBCache = null;
    }
    this.isInitialized = false;
    this.currentUserId = null;
    console.log("⚡ Ultra-fast cache destroyed");
  }
}

// Singleton instance
let ultraFastCache: UltraFastBarberCache | null = null;

export async function getUltraFastBarberCache(
  userId: string,
): Promise<UltraFastBarberCache> {
  if (!ultraFastCache) {
    ultraFastCache = new UltraFastBarberCache();
  }
  await ultraFastCache.initialize(userId);
  return ultraFastCache;
}

export { UltraFastBarberCache };
export default getUltraFastBarberCache;
