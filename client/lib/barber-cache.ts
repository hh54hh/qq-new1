/**
 * Smart Barber Cache Manager
 * Instagram-like instant loading with background sync and skeleton placeholders
 */

import { getOfflineStorage } from "./offline-storage";
import apiClient from "./api";

export interface CachedBarber {
  id: string;
  name: string;
  email: string;
  role: "barber";
  status: string;
  level: number;
  points: number;
  is_verified: boolean;
  created_at: string;
  avatar_url?: string;
  rating: number;
  followers: number;
  distance: number;
  price: number;
  isFollowed: boolean;
  lat?: number;
  lng?: number;
  followers_count?: number;
  _cached_at: number;
  _quality_score: number; // For sorting
}

export interface CachedBarberStats {
  totalBarbers: number;
  nearbyBarbers: number;
  followedBarbers: number;
  highRatedBarbers: number;
  _cached_at: number;
}

export interface BarberCacheConfig {
  maxBarbers: number;
  maxRecentBarbers: number; // Keep most recent/frequently accessed
  backgroundSyncInterval: number;
  cleanupInterval: number;
  dataRetention: number; // days
  preloadOnLogin: boolean;
  skeletonCount: number;
  memoryThresholdMB: number; // Memory usage threshold
  adaptiveSync: boolean; // Adjust sync frequency based on activity
  compressionEnabled: boolean; // Compress cached data
}

class BarberCacheManager {
  private storage: any = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private currentUserId: string | null = null;

  private readonly config: BarberCacheConfig = {
    maxBarbers: 150, // Reduced for better memory management
    maxRecentBarbers: 50, // Keep only most accessed
    backgroundSyncInterval: 15000, // Increased to 15 seconds for efficiency
    cleanupInterval: 900000, // Reduced to 15 minutes for aggressive cleanup
    dataRetention: 3, // Reduced to 3 days for memory efficiency
    preloadOnLogin: true,
    skeletonCount: 6,
    memoryThresholdMB: 10, // 10MB threshold
    adaptiveSync: true, // Smart sync frequency
    compressionEnabled: true, // Enable compression
  };

  // Performance tracking
  private lastAccessTimes: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private currentMemoryUsage = 0;
  private isBackgroundActive = true;

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) return;

    try {
      this.currentUserId = userId;
      this.storage = await getOfflineStorage();
      this.isInitialized = true;

      // Start background processes
      this.startBackgroundSync();
      this.startPeriodicCleanup();

      console.log("✅ Barber cache manager initialized for user:", userId);
    } catch (error) {
      console.error("❌ Failed to initialize barber cache manager:", error);
      throw error;
    }
  }

  // =================== INSTANT LOADING ===================

  async getCachedBarbers(): Promise<CachedBarber[]> {
    try {
      const barbers = await this.storage.getAllData("barbers");
      const validBarbers = barbers.filter(
        (barber: CachedBarber) => barber.id && barber.name,
      );

      // Update access times for performance tracking
      const now = Date.now();
      validBarbers.forEach((barber) => {
        this.lastAccessTimes.set(barber.id, now);
        this.accessCounts.set(
          barber.id,
          (this.accessCounts.get(barber.id) || 0) + 1,
        );
      });

      // Smart sorting: combine quality score with access frequency and recency
      return validBarbers
        .sort((a: CachedBarber, b: CachedBarber) => {
          const aScore = this.calculateSmartScore(a);
          const bScore = this.calculateSmartScore(b);
          return bScore - aScore;
        })
        .slice(0, this.config.maxRecentBarbers); // Use maxRecentBarbers for better memory
    } catch (error) {
      console.warn("Failed to get cached barbers:", error);
      return [];
    }
  }

  private calculateSmartScore(barber: CachedBarber): number {
    const baseScore = barber._quality_score || 0;
    const accessCount = this.accessCounts.get(barber.id) || 0;
    const lastAccess = this.lastAccessTimes.get(barber.id) || 0;
    const recencyBonus = Math.max(
      0,
      10 - (Date.now() - lastAccess) / (1000 * 60 * 60),
    ); // Decrease over hours

    return baseScore + accessCount * 2 + recencyBonus;
  }

  async getBarbersWithInstantLoad(): Promise<{
    barbers: CachedBarber[];
    isFromCache: boolean;
    needsSync: boolean;
  }> {
    // 1. Get cached barbers immediately (0ms delay)
    const cached = await this.getCachedBarbers();
    const cacheAge =
      cached.length > 0
        ? Date.now() - Math.max(...cached.map((b) => b._cached_at))
        : Infinity;
    const isStale = cacheAge > 30000; // 30 seconds

    // 2. Start background sync if data is stale (don't wait)
    if (isStale || cached.length === 0) {
      this.syncBarbersInBackground();
    }

    return {
      barbers: cached,
      isFromCache: cached.length > 0,
      needsSync: isStale,
    };
  }

  // =================== SKELETON PLACEHOLDERS ===================

  generateSkeletonBarbers(): CachedBarber[] {
    return Array.from({ length: this.config.skeletonCount }, (_, index) => ({
      id: `skeleton_${index}`,
      name: "جاري التحميل...",
      email: "",
      role: "barber" as const,
      status: "متاح",
      level: 50,
      points: 500,
      is_verified: true,
      created_at: new Date().toISOString(),
      avatar_url: undefined,
      rating: 4.5,
      followers: 25,
      distance: 2.5,
      price: 40,
      isFollowed: false,
      _cached_at: Date.now(),
      _quality_score: 50,
      _isSkeleton: true,
    })) as CachedBarber[];
  }

  // =================== BACKGROUND SYNC ===================

  private async syncBarbersInBackground(): Promise<void> {
    try {
      console.log("🔄 Syncing barbers in background...");

      // Get fresh data from API
      const barbersResponse = await apiClient.getBarbers();
      const freshBarbers = barbersResponse.barbers || [];

      if (freshBarbers.length === 0) {
        console.warn("⚠️ No barbers received from API");
        return;
      }

      // Load follow data in parallel
      let followedUsers: string[] = [];
      try {
        const followsResponse = await apiClient.getFollows("following");
        followedUsers =
          followsResponse.follows?.map((f) => f.followed_id) || [];
      } catch (error) {
        console.warn("Failed to load follows data:", error);
      }

      // Process and enhance barbers
      const now = Date.now();
      const enhancedBarbers: CachedBarber[] = freshBarbers.map((barber) => {
        const qualityScore = this.calculateQualityScore(barber);

        return {
          ...barber,
          role: "barber" as const,
          rating: barber.rating || 4.0,
          followers: barber.followers_count || 0,
          distance: 2.5, // Default distance
          status: barber.status || "متاح",
          isFollowed: followedUsers.includes(barber.id),
          price: barber.price || 30,
          _cached_at: now,
          _quality_score: qualityScore,
        };
      });

      // Save to cache
      await this.replaceBarbers(enhancedBarbers);

      // Update stats
      await this.updateBarberStats(enhancedBarbers);

      console.log(`✅ Synced ${enhancedBarbers.length} barbers in background`);

      // Notify UI about new data
      this.notifyUIUpdate();
    } catch (error) {
      console.warn("Background barbers sync failed:", error);
    }
  }

  private calculateQualityScore(barber: any): number {
    // Instagram-like quality algorithm
    let score = 0;

    // Rating contribution (0-40 points)
    score += (barber.rating || 0) * 8;

    // Level contribution (0-30 points)
    score += (barber.level || 0) * 0.3;

    // Verification bonus (10 points)
    if (barber.is_verified) score += 10;

    // Followers contribution (0-20 points)
    score += Math.min((barber.followers_count || 0) * 0.2, 20);

    // Recency bonus (0-10 points)
    const createdAt = new Date(barber.created_at).getTime();
    const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) score += 10 - daysSinceCreation / 3;

    return Math.round(score);
  }

  private async replaceBarbers(barbers: CachedBarber[]): Promise<void> {
    try {
      // Clear old barbers
      await this.storage.clearStore("barbers");

      // Save new barbers (keep only top quality)
      const topBarbers = barbers
        .sort((a, b) => b._quality_score - a._quality_score)
        .slice(0, this.config.maxBarbers);

      for (const barber of topBarbers) {
        await this.storage.saveData("barbers", barber, barber.id, "barber");
      }
    } catch (error) {
      console.error("Failed to replace barbers:", error);
    }
  }

  // =================== STATS & ANALYTICS ===================

  private async updateBarberStats(barbers: CachedBarber[]): Promise<void> {
    try {
      const stats: CachedBarberStats = {
        totalBarbers: barbers.length,
        nearbyBarbers: barbers.filter((b) => b.distance <= 5).length,
        followedBarbers: barbers.filter((b) => b.isFollowed).length,
        highRatedBarbers: barbers.filter((b) => b.rating >= 4.5).length,
        _cached_at: Date.now(),
      };

      await this.storage.saveData("barber_stats", stats, "current", "stats");
    } catch (error) {
      console.warn("Failed to update barber stats:", error);
    }
  }

  async getBarberStats(): Promise<CachedBarberStats | null> {
    try {
      return await this.storage.getData("barber_stats", "current");
    } catch (error) {
      console.warn("Failed to get barber stats:", error);
      return null;
    }
  }

  // =================== SMART FILTERING ===================

  async getFilteredBarbers(
    filters: {
      query?: string;
      maxDistance?: number;
      minRating?: number;
      followedOnly?: boolean;
      availableOnly?: boolean;
    } = {},
  ): Promise<CachedBarber[]> {
    const allBarbers = await this.getCachedBarbers();

    return allBarbers.filter((barber) => {
      // Skip skeleton entries
      if ((barber as any)._isSkeleton) return false;

      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        if (!barber.name.toLowerCase().includes(query)) return false;
      }

      // Distance filter
      if (filters.maxDistance && barber.distance > filters.maxDistance)
        return false;

      // Rating filter
      if (filters.minRating && barber.rating < filters.minRating) return false;

      // Followed only
      if (filters.followedOnly && !barber.isFollowed) return false;

      // Available only
      if (filters.availableOnly && barber.status !== "متاح") return false;

      return true;
    });
  }

  // =================== PRELOADING ===================

  async preloadBarbersOnLogin(): Promise<void> {
    if (!this.config.preloadOnLogin) return;

    try {
      console.log("🚀 Preloading barbers on login...");
      await this.syncBarbersInBackground();
    } catch (error) {
      console.warn("Preload failed:", error);
    }
  }

  // =================== UI NOTIFICATIONS ===================

  private notifyUIUpdate(): void {
    // Dispatch custom event to notify UI components
    window.dispatchEvent(
      new CustomEvent("barbersUpdated", {
        detail: { timestamp: Date.now() },
      }),
    );
  }

  // =================== FOLLOW MANAGEMENT ===================

  async updateFollowStatus(
    barberId: string,
    isFollowed: boolean,
  ): Promise<void> {
    try {
      const barber = await this.storage.getData("barbers", barberId);
      if (barber) {
        barber.isFollowed = isFollowed;
        barber._cached_at = Date.now();
        await this.storage.saveData("barbers", barber, barberId, "barber");
      }
    } catch (error) {
      console.warn("Failed to update follow status:", error);
    }
  }

  // =================== CLEANUP & MANAGEMENT ===================

  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      // Sync only if page is visible to save battery
      if (document.visibilityState === "visible") {
        this.syncBarbersInBackground();
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
      const retentionMs = this.config.dataRetention * 24 * 60 * 60 * 1000;

      // Clean old barbers
      const allBarbers = await this.storage.getAllData("barbers");
      let cleanedCount = 0;

      for (const barber of allBarbers) {
        if (now - barber._cached_at > retentionMs) {
          await this.storage.deleteData("barbers", barber.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} old barbers from cache`);
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  }

  async getStorageStats(): Promise<{
    barbers: number;
    totalSizeKB: number;
    lastSync: number;
  }> {
    try {
      const barbers = await this.storage.getAllData("barbers");
      const stats = await this.getBarberStats();

      const totalSize = new Blob([JSON.stringify(barbers)]).size;

      return {
        barbers: barbers.length,
        totalSizeKB: Math.round(totalSize / 1024),
        lastSync: stats?._cached_at || 0,
      };
    } catch (error) {
      console.warn("Failed to get storage stats:", error);
      return {
        barbers: 0,
        totalSizeKB: 0,
        lastSync: 0,
      };
    }
  }

  async clearAllBarberData(): Promise<void> {
    try {
      await this.storage.clearStore("barbers");
      await this.storage.clearStore("barber_stats");
      console.log("🗑️ All barber data cleared");
    } catch (error) {
      console.warn("Failed to clear barber data:", error);
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
    this.currentUserId = null;
    console.log("🔌 Barber cache manager destroyed");
  }
}

// Singleton instance
let barberCacheManager: BarberCacheManager | null = null;

export async function getBarberCache(
  userId: string,
): Promise<BarberCacheManager> {
  if (!barberCacheManager) {
    barberCacheManager = new BarberCacheManager();
  }
  await barberCacheManager.initialize(userId);
  return barberCacheManager;
}

export { BarberCacheManager };
export default getBarberCache;
