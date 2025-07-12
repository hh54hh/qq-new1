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
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours cache - keep for long time
  private minPostsToKeep = 10; // Always keep at least 10 posts
  private maxPostsToStore = 50; // Store up to 50 posts, then trim to 10
  private refreshCallbacks: Array<() => void> = [];

  constructor(userId: string) {
    this.userId = userId;
    this.cacheKey = `following_posts_cache_${userId}`;

    console.log("🗄️ FollowingPostsCache initialized for user:", userId);
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

      console.log("📭 No cached posts found");
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

  // Save posts to cache with smart trimming
  private savePosts(posts: CachedFollowingPost[]): void {
    try {
      // Smart caching: Keep only the most recent posts
      let postsToSave = [...posts];

      // If we have too many posts, trim to keep newest ones
      if (postsToSave.length > this.maxPostsToStore) {
        // Sort by created_at to ensure newest are first
        postsToSave.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        // Keep only the most recent posts
        postsToSave = postsToSave.slice(0, this.minPostsToKeep);
        console.log(
          `🗂️ Trimmed cache from ${posts.length} to ${postsToSave.length} posts (keeping newest)`,
        );
      }

      const cacheData: FollowingPostsCache = {
        posts: postsToSave,
        lastUpdated: new Date().toISOString(),
        userId: this.userId,
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log("💾 Following posts cached:", postsToSave.length, "posts");
    } catch (error) {
      console.error("❌ Cache save error:", error);
    }
  }

  // Check if cache is still valid
  private isCacheValid(cache: FollowingPostsCache): boolean {
    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    return cacheAge < this.maxCacheAge;
  }

  // Clear cache
  private clearCache(): void {
    localStorage.removeItem(this.cacheKey);
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
