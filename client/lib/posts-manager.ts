// Advanced Posts Manager - Professional Offline Support
import { Post, User } from "@shared/api";
import {
  getAdvancedPostsCache,
  CachedPost,
  OfflinePost,
} from "./advanced-posts-cache";

export interface PostsManagerOptions {
  userId: string;
  pageSize?: number;
  maxCachedPosts?: number;
}

export interface PostsResult {
  posts: CachedPost[];
  hasMore: boolean;
  newPostsCount: number;
  isFromCache: boolean;
}

class PostsManager {
  private cache: ReturnType<typeof getAdvancedPostsCache>;
  private userId: string;
  private pageSize: number;
  private maxCachedPosts: number;
  private syncInProgress = false;
  private listeners: Array<(event: string, data?: any) => void> = [];

  constructor(options: PostsManagerOptions) {
    this.userId = options.userId;
    this.pageSize = options.pageSize || 10;
    this.maxCachedPosts = options.maxCachedPosts || 100;
    this.cache = getAdvancedPostsCache(this.userId);

    // Setup network listeners
    this.setupNetworkListeners();

    // Start background sync if online
    if (navigator.onLine) {
      this.startBackgroundSync();
    }
  }

  // Get posts with pagination (ultra-fast from cache)
  async getPosts(
    page: number = 1,
    forceRefresh: boolean = false,
  ): Promise<PostsResult> {
    const startTime = Date.now();
    console.log(`📥 Getting posts page ${page} (force: ${forceRefresh})`);

    try {
      // Always load from cache first for instant display
      const cachedPosts = await this.cache.getPostsPage(page, this.pageSize);

      const result: PostsResult = {
        posts: cachedPosts,
        hasMore: cachedPosts.length === this.pageSize,
        newPostsCount: 0,
        isFromCache: true,
      };

      const loadTime = Date.now() - startTime;
      console.log(
        `⚡ Cache loaded in ${loadTime}ms: ${cachedPosts.length} posts`,
      );

      // If online and (force refresh or first page), fetch updates in background
      if (navigator.onLine && (forceRefresh || page === 1)) {
        this.fetchUpdatesInBackground(page === 1);
      }

      this.notifyListeners("posts_loaded", result);
      return result;
    } catch (error) {
      console.error("❌ Error getting posts:", error);
      return {
        posts: [],
        hasMore: false,
        newPostsCount: 0,
        isFromCache: false,
      };
    }
  }

  // Fetch updates from API in background
  private async fetchUpdatesInBackground(
    isFirstPage: boolean = false,
  ): Promise<void> {
    if (this.syncInProgress) {
      console.log("🔄 Sync already in progress, skipping");
      return;
    }

    this.syncInProgress = true;
    console.log("🌐 Fetching updates in background...");

    try {
      const { default: apiClient } = await import("./api");

      // Get latest posts from API
      const response = await apiClient.getFollowingPosts();
      const newPosts = response.posts || [];

      if (newPosts.length > 0) {
        // Save to cache
        await this.cache.savePosts(newPosts);

        if (isFirstPage) {
          // Notify about new posts available
          const currentCached = await this.cache.getPostsPage(1, this.pageSize);
          const newCount = this.countNewPosts(currentCached, newPosts);

          if (newCount > 0) {
            this.notifyListeners("new_posts_available", { count: newCount });
          }
        }

        console.log(
          `✅ Background sync completed: ${newPosts.length} posts updated`,
        );
        this.notifyListeners("posts_updated", { count: newPosts.length });
      }

      // Sync offline posts
      await this.syncOfflinePosts();
    } catch (error) {
      console.warn("⚠️ Background sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Add new post (works offline)
  async addPost(postData: {
    image_url: string;
    caption: string;
    frame_style?: string;
  }): Promise<string> {
    console.log("📝 Adding new post...");

    const post = {
      user_id: this.userId,
      image_url: postData.image_url,
      caption: postData.caption,
      frame_style: postData.frame_style || "ذهبي",
      sync_status: navigator.onLine ? "pending" : ("pending" as const),
    };

    try {
      if (navigator.onLine) {
        // Try to post immediately
        const { default: apiClient } = await import("./api");
        const response = await apiClient.createPost(post);

        // Save to cache as synced
        await this.cache.savePosts([response]);
        console.log("✅ Post created and synced immediately");

        this.notifyListeners("post_added", { post: response, synced: true });
        return response.id;
      } else {
        // Save as offline post
        const localId = await this.cache.addOfflinePost(post);
        console.log("📱 Post saved offline");

        this.notifyListeners("post_added", { postId: localId, synced: false });
        return localId;
      }
    } catch (error) {
      console.error("❌ Error adding post:", error);

      // Fallback to offline mode
      const localId = await this.cache.addOfflinePost(post);
      console.log("📱 Post saved offline (fallback)");

      this.notifyListeners("post_added", { postId: localId, synced: false });
      return localId;
    }
  }

  // Sync offline posts when back online
  private async syncOfflinePosts(): Promise<void> {
    const pendingPosts = await this.cache.getPendingPosts();

    if (pendingPosts.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${pendingPosts.length} offline posts...`);

    for (const offlinePost of pendingPosts) {
      try {
        const { default: apiClient } = await import("./api");

        const response = await apiClient.createPost({
          user_id: offlinePost.user_id,
          image_url: offlinePost.image_url,
          caption: offlinePost.caption,
          frame_style: offlinePost.frame_style,
        });

        // Mark as synced
        await this.cache.markPostSynced(offlinePost.id, response.id);
        console.log(
          `✅ Synced offline post: ${offlinePost.id} -> ${response.id}`,
        );

        this.notifyListeners("post_synced", {
          localId: offlinePost.id,
          serverId: response.id,
        });
      } catch (error) {
        console.error(`❌ Failed to sync post ${offlinePost.id}:`, error);
        // Could implement retry logic here
      }
    }
  }

  // Save scroll position
  async saveScrollPosition(position: number): Promise<void> {
    await this.cache.saveAppState({ scroll_position: position });
  }

  // Get saved scroll position
  async getScrollPosition(): Promise<number> {
    const state = await this.cache.getAppState();
    return state?.scroll_position || 0;
  }

  // Refresh posts (pull to refresh)
  async refreshPosts(): Promise<PostsResult> {
    console.log("🔄 Refreshing posts...");
    return this.getPosts(1, true);
  }

  // Count new posts compared to cache
  private countNewPosts(cachedPosts: CachedPost[], newPosts: Post[]): number {
    if (cachedPosts.length === 0) return 0;

    const latestCachedDate = new Date(cachedPosts[0].created_at);
    return newPosts.filter(
      (post) => new Date(post.created_at) > latestCachedDate,
    ).length;
  }

  // Setup network event listeners
  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      console.log("🌐 Back online - starting sync...");
      this.notifyListeners("network_status", { online: true });
      this.startBackgroundSync();
    });

    window.addEventListener("offline", () => {
      console.log("📵 Gone offline");
      this.notifyListeners("network_status", { online: false });
    });
  }

  // Start background sync (when online)
  private startBackgroundSync(): void {
    // Initial sync
    setTimeout(() => {
      this.fetchUpdatesInBackground(true);
    }, 1000);

    // Periodic sync every 5 minutes
    setInterval(
      () => {
        if (navigator.onLine && !this.syncInProgress) {
          this.fetchUpdatesInBackground();
        }
      },
      5 * 60 * 1000,
    );
  }

  // Event listeners
  public addEventListener(
    listener: (event: string, data?: any) => void,
  ): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: string, data?: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("❌ Error in event listener:", error);
      }
    });
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    postsCount: number;
    offlineCount: number;
    size: string;
  }> {
    const stats = await this.cache.getCacheStats();
    return {
      ...stats,
      size: `${Math.round(stats.size / 1024)}KB`,
    };
  }

  // Clean old cache
  async cleanOldCache(): Promise<void> {
    await this.cache.clearOldCache();
    console.log("🧹 Old cache cleaned");
  }

  // Destroy manager (cleanup)
  public destroy(): void {
    this.listeners = [];
    console.log("🗑️ PostsManager destroyed");
  }
}

// Global instance
let postsManagerInstance: PostsManager | null = null;

export function getPostsManager(userId: string): PostsManager {
  if (!postsManagerInstance || postsManagerInstance["userId"] !== userId) {
    if (postsManagerInstance) {
      postsManagerInstance.destroy();
    }
    postsManagerInstance = new PostsManager({ userId });
  }
  return postsManagerInstance;
}

export default PostsManager;
