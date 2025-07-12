// Advanced caching system for following posts
import { Post } from "@shared/api";

export interface CachedFollowingPost extends Post {
  cached_at: string;
  user_avatar?: string;
  user_name?: string;
  is_liked?: boolean;
}

interface FollowingPostsCache {
  posts: CachedFollowingPost[];
  lastUpdated: string;
  userId: string;
}

class FollowingPostsCacheManager {
  private userId: string;
  private cacheKey: string;
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days cache - never expire posts
  private minPostsToKeep = 5; // NEVER delete - always keep at least 5 posts
  private maxPostsToStore = 10; // Store max 10 posts for variety
  private refreshCallbacks: Array<() => void> = [];

  constructor(userId: string) {
    this.userId = userId;
    this.cacheKey = `following_posts_cache_${userId}`;

    console.log("🗄️ FollowingPostsCache initialized for user:", userId);

    // Check localStorage usage on init
    this.checkStorageUsage();
  }

  // Check localStorage usage and clean if needed
  private checkStorageUsage(): void {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
          }
        }
      }

      const totalSizeMB = totalSize / (1024 * 1024);
      console.log(`📊 Total localStorage usage: ${totalSizeMB.toFixed(2)}MB`);

      // If usage is high (>3MB), proactively clean
      if (totalSizeMB > 3) {
        console.log("🧹 localStorage usage high, cleaning up...");
        this.clearAllOldCaches();
      }
    } catch (error) {
      console.error("❌ Storage check error:", error);
    }
  }

  // Check if there's enough space for new data
  private hasEnoughSpace(newDataSize: number): boolean {
    try {
      // Estimate current usage
      let currentSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            currentSize += new Blob([value]).size;
          }
        }
      }

      // localStorage limit is typically 5-10MB, we'll use 4MB as safe limit
      const maxSafeSize = 4 * 1024 * 1024; // 4MB
      const projectedSize = currentSize + newDataSize;

      console.log(
        `💾 Current: ${Math.round(currentSize / 1024)}KB, New: ${Math.round(newDataSize / 1024)}KB, Projected: ${Math.round(projectedSize / 1024)}KB`,
      );

      return projectedSize < maxSafeSize;
    } catch (error) {
      console.error("❌ Space check error:", error);
      return false; // Assume no space if we can't check
    }
  }

  // Get cached posts ultra-fast (<50ms)
  async getPostsUltraFast(): Promise<CachedFollowingPost[]> {
    const startTime = performance.now();
    console.log("🚀 Getting posts ultra-fast for user:", this.userId);

    try {
      const cached = this.getCachedPosts();
      console.log(
        "📦 Cached data:",
        cached ? `${cached.posts.length} posts` : "no cache",
      );

      // ALWAYS return cached posts if they exist, regardless of age
      if (cached && cached.posts.length > 0) {
        const loadTime = performance.now() - startTime;
        console.log(
          `⚡ Ultra-fast following posts loaded in ${loadTime.toFixed(1)}ms (${cached.posts.length} posts)`,
        );
        return cached.posts;
      }

      console.log("📭 No cached posts found - will need initial load");
      return [];
    } catch (error) {
      console.error("❌ Ultra-fast cache error:", error);
      return [];
    }
  }

  // Preload posts when user logs in - only if no cache exists
  async preloadOnLogin(): Promise<void> {
    console.log("🚀 Checking if preload needed for user:", this.userId);

    try {
      // Check if we have any cache (even expired)
      const cached = this.getCachedPosts();
      if (cached && cached.posts.length > 0) {
        console.log("✅ Cache found, skipping preload (manual refresh only)");
        return;
      }

      // Only preload if no cache exists at all
      console.log("🔄 No cache found, initial load...");
      await this.refreshFromAPI();
    } catch (error) {
      console.error("❌ Preload error:", error);
    }
  }

  // Refresh posts from API
  async refreshFromAPI(): Promise<CachedFollowingPost[]> {
    console.log(
      "🔄 Refreshing following posts from API for user:",
      this.userId,
    );

    try {
      const { default: apiClient } = await import("./api");
      console.log("📡 Calling API getFollowingPosts...");
      const response = await apiClient.getFollowingPosts();
      console.log("📡 API response received:", response);

      const postsWithCache: CachedFollowingPost[] = response.posts.map(
        (post) => ({
          ...post,
          cached_at: new Date().toISOString(),
          user_avatar: post.user?.avatar_url,
          user_name: post.user?.name,
          is_liked: false, // Will be updated from likes cache
        }),
      );

      // Ensure posts are sorted by created_at descending (newest first)
      postsWithCache.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      console.log(
        "✅ Posts sorted by date, first 3:",
        postsWithCache.slice(0, 3).map((p) => ({
          user: p.user?.name,
          date: p.created_at.substring(0, 19),
        })),
      );

      // Save to cache
      this.savePosts(postsWithCache);

      // Notify callbacks
      this.refreshCallbacks.forEach((callback) => callback());

      console.log(
        "✅ Following posts refreshed:",
        postsWithCache.length,
        "posts",
      );
      return postsWithCache;
    } catch (error) {
      console.error("❌ API refresh error:", error);
      throw error;
    }
  }

  // Force refresh (for manual refresh actions)
  async forceRefresh(): Promise<CachedFollowingPost[]> {
    console.log("🔃 Force refreshing following posts...");
    this.clearCache();
    return await this.refreshFromAPI();
  }

  // Background refresh without blocking UI
  private async refreshInBackground(): Promise<void> {
    setTimeout(async () => {
      try {
        await this.refreshFromAPI();
      } catch (error) {
        console.warn("⚠️ Background refresh failed:", error);
      }
    }, 100); // Small delay to not block UI
  }

  // Get cached posts from localStorage
  private getCachedPosts(): FollowingPostsCache | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const parsed: FollowingPostsCache = JSON.parse(cached);

      // Validate cache structure
      if (
        !parsed.posts ||
        !Array.isArray(parsed.posts) ||
        !parsed.lastUpdated
      ) {
        console.warn("⚠️ Invalid cache structure, clearing...");
        this.clearCache();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("❌ Cache read error:", error);
      this.clearCache();
      return null;
    }
  }

  // Save posts to cache with smart trimming and quota management
  private savePosts(posts: CachedFollowingPost[]): void {
    // Don't try to save if no posts or localStorage might be full
    if (!posts || posts.length === 0) {
      console.log("📭 No posts to save, skipping cache");
      return;
    }

    try {
      // Smart caching: Keep only the most recent posts and minimize data
      let postsToSave = [...posts];

      // Ultra-conservative: Only 3 posts maximum to avoid quota issues
      postsToSave.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      postsToSave = postsToSave.slice(0, 3); // Keep only 3 most recent

      // Ultra-minimize data size
      const optimizedPosts = postsToSave.map((post) => ({
        id: post.id,
        user_id: post.user_id,
        image_url: post.image_url,
        caption: post.caption?.substring(0, 80) || "", // Very short caption
        likes: post.likes,
        created_at: post.created_at,
        cached_at: new Date().toISOString(),
        is_liked: post.is_liked || false,
        user: post.user
          ? {
              id: post.user.id,
              name: post.user.name?.substring(0, 20) || "",
              avatar_url: post.user.avatar_url,
              role: post.user.role,
            }
          : null,
      }));

      const cacheData: FollowingPostsCache = {
        posts: optimizedPosts as CachedFollowingPost[],
        lastUpdated: new Date().toISOString(),
        userId: this.userId,
      };

      const dataToStore = JSON.stringify(cacheData);

      // Check data size before storing
      const dataSize = new Blob([dataToStore]).size;
      console.log(`📊 Cache data size: ${Math.round(dataSize / 1024)}KB`);

      // Be very conservative - if data is > 30KB, don't even try
      if (dataSize > 30000) {
        console.warn(
          "⚠️ Data too large (>30KB), skipping cache to avoid quota error",
        );
        return;
      }

      // Check if we have enough space
      if (!this.hasEnoughSpace(dataSize)) {
        console.log("⚠️ Not enough space, cleaning up first...");
        this.clearAllOldCaches();

        // After cleanup, check again
        if (!this.hasEnoughSpace(dataSize)) {
          console.warn(
            "⚠️ Still not enough space after cleanup, skipping cache",
          );
          return;
        }
      }

      localStorage.setItem(this.cacheKey, dataToStore);
      console.log("✅ Successfully cached", optimizedPosts.length, "posts");
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        console.warn("🚨 localStorage quota exceeded, cleaning up...");
        this.handleQuotaExceeded(posts);
      } else {
        console.error("❌ Cache save error:", error);
      }
    }
  }

  // Handle quota exceeded by ultra-aggressive cleanup
  private handleQuotaExceeded(posts: CachedFollowingPost[]): void {
    try {
      console.warn("🚨 QUOTA EXCEEDED - Starting emergency cleanup...");

      // NUCLEAR OPTION: Clear almost everything except auth
      this.nuclearCleanup();

      // Try to save ultra-minimal data (just 1 post with bare minimum fields)
      if (posts.length > 0) {
        const ultraMinimalPost = posts.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];

        const essentialData = {
          posts: [
            {
              id: ultraMinimalPost.id,
              user_id: ultraMinimalPost.user_id,
              image_url: ultraMinimalPost.image_url,
              caption: ultraMinimalPost.caption?.substring(0, 50) || "",
              likes: ultraMinimalPost.likes || 0,
              created_at: ultraMinimalPost.created_at,
              cached_at: new Date().toISOString(),
              is_liked: false,
              user: ultraMinimalPost.user
                ? {
                    id: ultraMinimalPost.user.id,
                    name: ultraMinimalPost.user.name?.substring(0, 20) || "",
                    avatar_url: ultraMinimalPost.user.avatar_url,
                    role: ultraMinimalPost.user.role,
                  }
                : null,
            },
          ],
          lastUpdated: new Date().toISOString(),
          userId: this.userId,
        };

        const dataString = JSON.stringify(essentialData);
        console.log(
          `💾 Trying to save ultra-minimal cache: ${Math.round(new Blob([dataString]).size / 1024)}KB`,
        );

        localStorage.setItem(this.cacheKey, dataString);
        console.log("✅ Ultra-minimal emergency cache saved with 1 post");
      }
    } catch (thirdError) {
      console.error("❌ Ultra-minimal emergency cache failed:", thirdError);
      // Absolute last resort: operate without cache
      console.warn(
        "⚠��� Operating without cache - localStorage completely full",
      );
      this.operateWithoutCache();
    }
  }

  // Nuclear cleanup - remove everything except essential auth data
  private nuclearCleanup(): void {
    try {
      console.log("☢️ NUCLEAR CLEANUP - Removing all non-essential data...");

      // Save essential auth data first
      const authToken = localStorage.getItem("barbershop_token");
      const authUser = localStorage.getItem("barbershop_user");

      // Clear EVERYTHING
      localStorage.clear();

      // Restore only essential auth data
      if (authToken) localStorage.setItem("barbershop_token", authToken);
      if (authUser) localStorage.setItem("barbershop_user", authUser);

      console.log(
        "☢️ Nuclear cleanup complete - localStorage cleared except auth",
      );
    } catch (error) {
      console.error("❌ Nuclear cleanup failed:", error);
    }
  }

  // Fallback to operate without cache
  private operateWithoutCache(): void {
    console.warn("🔥 OPERATING WITHOUT CACHE");
    // Clear the cache key so we don't keep trying
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (e) {
      // Even removal fails, localStorage is completely broken
      console.error("❌ Cannot even remove cache key:", e);
    }
  }

  // Clear all old cache data from other users or expired data
  private clearAllOldCaches(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Remove old cache from other users or expired data
          if (
            key.startsWith("following_posts_cache_") &&
            key !== this.cacheKey
          ) {
            keysToRemove.push(key);
          }
          // Remove old barber cache
          if (
            key.startsWith("barber_cache_") ||
            key.startsWith("chat_cache_")
          ) {
            keysToRemove.push(key);
          }
          // Remove old temporary data
          if (key.includes("temp_") || key.includes("debug_")) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log("🗑️ Removed old cache:", key);
      });

      console.log(`🧹 Cleaned up ${keysToRemove.length} old cache entries`);
    } catch (error) {
      console.error("❌ Cache cleanup error:", error);
    }
  }

  // Check if cache is still valid
  private isCacheValid(cache: FollowingPostsCache): boolean {
    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    return cacheAge < this.maxCacheAge;
  }

  // Clear cache - but keep minimum posts if possible
  private clearCache(): void {
    try {
      const cached = this.getCachedPosts();
      if (cached && cached.posts.length >= this.minPostsToKeep) {
        // Keep the last 5 posts even when "clearing"
        const postsToKeep = cached.posts
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, this.minPostsToKeep);

        const backupCache = {
          posts: postsToKeep,
          lastUpdated: new Date().toISOString(),
          userId: this.userId,
        };

        localStorage.setItem(this.cacheKey, JSON.stringify(backupCache));
        console.log(
          `🛡️ Cache cleared but kept ${this.minPostsToKeep} recent posts`,
        );
      } else {
        localStorage.removeItem(this.cacheKey);
        console.log("🗑️ Cache completely cleared");
      }
    } catch (error) {
      localStorage.removeItem(this.cacheKey);
      console.error("❌ Error in smart cache clear:", error);
    }
  }

  // Subscribe to refresh events
  onRefresh(callback: () => void): () => void {
    this.refreshCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.refreshCallbacks = this.refreshCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  // Update like status for a post
  updatePostLike(postId: string, isLiked: boolean): void {
    const cached = this.getCachedPosts();
    if (!cached) return;

    const postIndex = cached.posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    cached.posts[postIndex].is_liked = isLiked;
    cached.posts[postIndex].likes += isLiked ? 1 : -1;

    this.savePosts(cached.posts);

    // Notify callbacks
    this.refreshCallbacks.forEach((callback) => callback());
  }

  // Get cache stats
  getCacheStats(): { size: number; age: number; postsCount: number } {
    const cached = this.getCachedPosts();
    if (!cached) {
      return { size: 0, age: 0, postsCount: 0 };
    }

    const size = new Blob([JSON.stringify(cached)]).size;
    const age = Date.now() - new Date(cached.lastUpdated).getTime();

    return {
      size,
      age,
      postsCount: cached.posts.length,
    };
  }

  // Cleanup
  destroy(): void {
    this.refreshCallbacks = [];
    console.log("🗑️ FollowingPostsCache destroyed for user:", this.userId);
  }
}

// Cache instances per user
const followingPostsCacheInstances = new Map<
  string,
  FollowingPostsCacheManager
>();

// Get following posts cache for a user
export function getFollowingPostsCache(
  userId: string,
): FollowingPostsCacheManager {
  if (!followingPostsCacheInstances.has(userId)) {
    followingPostsCacheInstances.set(
      userId,
      new FollowingPostsCacheManager(userId),
    );
  }
  return followingPostsCacheInstances.get(userId)!;
}

// Cleanup all caches
export function clearAllFollowingPostsCaches() {
  followingPostsCacheInstances.forEach((cache) => cache.destroy());
  followingPostsCacheInstances.clear();
}

export { FollowingPostsCacheManager };
