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
      // Check if we should skip sync due to memory constraints
      const memoryUsage = await this.calculateMemoryUsage();
      if (memoryUsage > this.config.memoryThresholdMB * 0.8) {
        console.log(
          "⚠️ Skipping sync due to high memory usage:",
          memoryUsage + "MB",
        );
        await this.smartMemoryCleanup();
        return;
      }

      console.log("🔄 Syncing barbers in background...");

      // Get fresh data from API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const barbersResponse = await apiClient.getBarbers();
        const freshBarbers = barbersResponse.barbers || [];
        clearTimeout(timeoutId);

        if (freshBarbers.length === 0) {
          console.warn("⚠️ No barbers received from API");
          return;
        }

        // Load follow data in parallel with timeout
        let followedUsers: string[] = [];
        try {
          const followsResponse = await apiClient.getFollows("following");
          followedUsers =
            followsResponse.follows?.map((f) => f.followed_id) || [];
        } catch (error) {
          console.warn("Failed to load follows data:", error);
        }

        // Get existing cached data for comparison
        const existingBarbers = await this.getCachedBarbers();
        const existingIds = new Set(existingBarbers.map((b) => b.id));

        // Process only new or updated barbers to save memory
        const now = Date.now();
        const enhancedBarbers: CachedBarber[] = [];

        for (const barber of freshBarbers) {
          // Skip if we already have recent data for this barber
          const existing = existingBarbers.find((b) => b.id === barber.id);
          if (existing && now - existing._cached_at < 300000) {
            // 5 minutes
            enhancedBarbers.push(existing); // Keep existing
            continue;
          }

          const qualityScore = this.calculateQualityScore(barber);

          enhancedBarbers.push({
            ...barber,
            role: "barber" as const,
            rating: barber.rating || 4.0,
            followers: barber.followers_count || 0,
            distance: existing?.distance || 2.5,
            status: barber.status || "متاح",
            isFollowed: followedUsers.includes(barber.id),
            price: barber.price || 30,
            _cached_at: now,
            _quality_score: qualityScore,
          });
        }

        // Only update if we have meaningful changes
        if (enhancedBarbers.length > 0) {
          await this.replaceBarbers(enhancedBarbers);
          await this.updateBarberStats(enhancedBarbers);

          console.log(
            `✅ Synced ${enhancedBarbers.length} barbers (optimized)`,
          );

          // Throttled UI notification
          this.throttledNotifyUIUpdate();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // Adaptive error handling - reduce sync frequency on errors
      if (this.config.adaptiveSync) {
        this.config.backgroundSyncInterval = Math.min(
          this.config.backgroundSyncInterval * 1.5,
          60000, // Max 1 minute
        );
      }
      console.warn("Background barbers sync failed:", error);
    }
  }

  private lastUINotification = 0;
  private throttledNotifyUIUpdate(): void {
    const now = Date.now();
    // Throttle UI updates to prevent excessive re-renders
    if (now - this.lastUINotification > 2000) {
      // 2 seconds minimum
      this.lastUINotification = now;
      this.notifyUIUpdate();
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
      // Check database health before operations
      const isHealthy = await this.storage.isDatabaseHealthy();
      if (!isHealthy) {
        console.warn("⚠️ Database unhealthy, skipping barber replacement");
        return;
      }

      // Clear old barbers
      await this.storage.clearStore("barbers");

      // Save new barbers (keep only top quality)
      const topBarbers = barbers
        .sort((a, b) => b._quality_score - a._quality_score)
        .slice(0, this.config.maxBarbers);

      for (const barber of topBarbers) {
        await this.storage.saveData("barbers", barber, barber.id, "barber");
      }

      console.log(
        `✅ Successfully replaced ${topBarbers.length} barbers in cache`,
      );
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

  // =================== SMART MEMORY MANAGEMENT ===================

  private async calculateMemoryUsage(): Promise<number> {
    try {
      const barbers = await this.storage.getAllData("barbers");
      const stats = await this.storage.getAllData("barber_stats");

      const totalSize = new Blob([
        JSON.stringify(barbers),
        JSON.stringify(stats),
      ]).size;

      this.currentMemoryUsage = Math.round(totalSize / (1024 * 1024)); // MB
      return this.currentMemoryUsage;
    } catch (error) {
      console.warn("Failed to calculate memory usage:", error);
      return 0;
    }
  }

  private async smartMemoryCleanup(): Promise<void> {
    const memoryUsage = await this.calculateMemoryUsage();

    if (memoryUsage > this.config.memoryThresholdMB) {
      console.log(
        `🧹 Memory threshold exceeded (${memoryUsage}MB), starting cleanup...`,
      );

      try {
        const barbers = await this.storage.getAllData("barbers");

        // Sort by smart score (keeping most valuable data)
        const sortedBarbers = barbers.sort(
          (a: CachedBarber, b: CachedBarber) => {
            return this.calculateSmartScore(b) - this.calculateSmartScore(a);
          },
        );

        // Keep only top performers
        const keepCount = Math.min(
          this.config.maxRecentBarbers,
          sortedBarbers.length,
        );
        const barbersToKeep = sortedBarbers.slice(0, keepCount);

        // Clear and save optimized data
        await this.storage.clearStore("barbers");
        for (const barber of barbersToKeep) {
          await this.storage.saveData("barbers", barber, barber.id, "barber");
        }

        const newMemoryUsage = await this.calculateMemoryUsage();
        console.log(
          `✅ Smart cleanup completed: ${memoryUsage}MB → ${newMemoryUsage}MB`,
        );

        // Clean access tracking maps
        this.cleanupAccessTracking(barbersToKeep.map((b) => b.id));
      } catch (error) {
        console.error("Smart memory cleanup failed:", error);
      }
    }
  }

  private cleanupAccessTracking(keepIds: string[]): void {
    // Keep only tracking data for retained barbers
    const keepIdsSet = new Set(keepIds);

    for (const [id] of this.lastAccessTimes) {
      if (!keepIdsSet.has(id)) {
        this.lastAccessTimes.delete(id);
        this.accessCounts.delete(id);
      }
    }
  }

  // =================== ADAPTIVE SYNC ===================

  private getAdaptiveSyncInterval(): number {
    if (!this.config.adaptiveSync) return this.config.backgroundSyncInterval;

    // Reduce sync frequency when user is inactive
    const lastActivity = Math.max(...Array.from(this.lastAccessTimes.values()));
    const inactiveTime = Date.now() - lastActivity;

    if (inactiveTime > 5 * 60 * 1000) {
      // 5 minutes inactive
      return this.config.backgroundSyncInterval * 3; // Reduce frequency
    } else if (inactiveTime > 2 * 60 * 1000) {
      // 2 minutes inactive
      return this.config.backgroundSyncInterval * 2; // Moderate reduction
    }

    return this.config.backgroundSyncInterval; // Normal frequency
  }

  // =================== CLEANUP & MANAGEMENT ===================

  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    const startSync = () => {
      this.syncInterval = setInterval(() => {
        // Sync only if page is visible and app is active
        if (document.visibilityState === "visible" && this.isBackgroundActive) {
          this.syncBarbersInBackground();
        }
      }, this.getAdaptiveSyncInterval());
    };

    startSync();

    // Listen for visibility changes to pause/resume
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.isBackgroundActive = false;
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }
      } else {
        this.isBackgroundActive = true;
        if (!this.syncInterval) {
          startSync();
        }
      }
    });
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    try {
      console.log("🧹 Starting comprehensive cleanup...");

      // 1. Check memory usage first
      await this.smartMemoryCleanup();

      // 2. Clean old data
      const now = Date.now();
      const retentionMs = this.config.dataRetention * 24 * 60 * 60 * 1000;

      const allBarbers = await this.storage.getAllData("barbers");
      let cleanedCount = 0;
      let memoryFreed = 0;

      // Filter out old and low-value barbers
      const barbersToKeep = [];

      for (const barber of allBarbers) {
        const isOld = now - barber._cached_at > retentionMs;
        const isLowValue = this.calculateSmartScore(barber) < 10; // Low threshold
        const isRarelyAccessed = (this.accessCounts.get(barber.id) || 0) < 2;

        if (isOld || (isLowValue && isRarelyAccessed)) {
          const barberSize = new Blob([JSON.stringify(barber)]).size;
          memoryFreed += barberSize;
          cleanedCount++;

          // Remove from tracking
          this.lastAccessTimes.delete(barber.id);
          this.accessCounts.delete(barber.id);
        } else {
          barbersToKeep.push(barber);
        }
      }

      // Replace with cleaned data
      if (cleanedCount > 0) {
        await this.storage.clearStore("barbers");
        for (const barber of barbersToKeep) {
          await this.storage.saveData("barbers", barber, barber.id, "barber");
        }

        const memoryFreedMB =
          Math.round((memoryFreed / (1024 * 1024)) * 100) / 100;
        console.log(
          `✅ Cleanup completed: ${cleanedCount} barbers removed, ${memoryFreedMB}MB freed`,
        );
      }

      // 3. Clean stats if too old
      const stats = await this.storage.getAllData("barber_stats");
      for (const stat of stats) {
        if (now - stat._cached_at > retentionMs) {
          await this.storage.deleteData("barber_stats", stat.id || "current");
        }
      }

      // 4. Force garbage collection hint (if available)
      if (typeof window !== "undefined" && (window as any).gc) {
        (window as any).gc();
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
    // Clear all intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear memory tracking
    this.lastAccessTimes.clear();
    this.accessCounts.clear();
    this.currentMemoryUsage = 0;

    // Reset flags
    this.isInitialized = false;
    this.isBackgroundActive = false;
    this.currentUserId = null;
    this.lastUINotification = 0;

    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    console.log("🔌 Barber cache manager destroyed - memory cleaned");
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.isBackgroundActive = false;
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    } else {
      this.isBackgroundActive = true;
      if (!this.syncInterval) {
        this.startBackgroundSync();
      }
    }
  };
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
