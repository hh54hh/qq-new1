// Advanced Posts Cache System - Professional Facebook-like Experience
import { Post, User } from "@shared/api";

export interface CachedPost extends Post {
  cached_at: string;
  sync_status: "synced" | "pending" | "failed";
  local_id?: string; // For offline posts
  scroll_position?: number;
}

export interface OfflinePost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  frame_style: string;
  created_at: string;
  sync_status: "pending" | "failed";
  retry_count: number;
}

export interface PostsState {
  posts: CachedPost[];
  last_updated: string;
  scroll_position: number;
  has_more: boolean;
  page: number;
  new_posts_count: number;
}

class AdvancedPostsCache {
  private dbName = "BarberAppPosts";
  private version = 1;
  private db: IDBDatabase | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.initializeDB();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Posts store
        if (!db.objectStoreNames.contains("posts")) {
          const postsStore = db.createObjectStore("posts", { keyPath: "id" });
          postsStore.createIndex("user_id", "user_id", { unique: false });
          postsStore.createIndex("created_at", "created_at", { unique: false });
          postsStore.createIndex("sync_status", "sync_status", {
            unique: false,
          });
        }

        // Offline posts store
        if (!db.objectStoreNames.contains("offline_posts")) {
          const offlineStore = db.createObjectStore("offline_posts", {
            keyPath: "id",
          });
          offlineStore.createIndex("sync_status", "sync_status", {
            unique: false,
          });
        }

        // App state store
        if (!db.objectStoreNames.contains("app_state")) {
          db.createObjectStore("app_state", { keyPath: "key" });
        }

        console.log("✅ IndexedDB initialized successfully");
      };
    });
  }

  // Get posts with pagination (ultra-fast)
  async getPostsPage(
    page: number = 1,
    limit: number = 10,
  ): Promise<CachedPost[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["posts"], "readonly");
      const store = transaction.objectStore("posts");
      const index = store.index("created_at");

      const posts: CachedPost[] = [];
      let count = 0;
      const skip = (page - 1) * limit;

      // Get posts in descending order (newest first)
      const request = index.openCursor(null, "prev");

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && count < skip + limit) {
          if (count >= skip) {
            posts.push(cursor.value);
          }
          count++;
          cursor.continue();
        } else {
          console.log(
            `⚡ Loaded page ${page}: ${posts.length} posts in ${Date.now()}ms`,
          );
          resolve(posts);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Save posts to cache
  async savePosts(posts: Post[]): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(["posts"], "readwrite");
    const store = transaction.objectStore("posts");

    for (const post of posts) {
      const cachedPost: CachedPost = {
        ...post,
        cached_at: new Date().toISOString(),
        sync_status: "synced",
      };
      store.put(cachedPost);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`💾 Saved ${posts.length} posts to IndexedDB`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Add offline post
  async addOfflinePost(
    post: Omit<OfflinePost, "id" | "created_at" | "retry_count">,
  ): Promise<string> {
    if (!this.db) await this.initializeDB();

    const offlinePost: OfflinePost = {
      ...post,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      sync_status: "pending",
      retry_count: 0,
    };

    const transaction = this.db!.transaction(["offline_posts"], "readwrite");
    const store = transaction.objectStore("offline_posts");
    store.add(offlinePost);

    // Also add to posts for immediate display
    const cachedPost: CachedPost = {
      id: offlinePost.id,
      user_id: offlinePost.user_id,
      image_url: offlinePost.image_url,
      caption: offlinePost.caption,
      frame_style: offlinePost.frame_style,
      likes: 0,
      created_at: offlinePost.created_at,
      cached_at: new Date().toISOString(),
      sync_status: "pending",
      local_id: offlinePost.id,
      user: undefined, // Will be populated from current user
    };

    const postsTransaction = this.db!.transaction(["posts"], "readwrite");
    const postsStore = postsTransaction.objectStore("posts");
    postsStore.add(cachedPost);

    return new Promise((resolve, reject) => {
      postsTransaction.oncomplete = () => {
        console.log(`📱 Added offline post: ${offlinePost.id}`);
        resolve(offlinePost.id);
      };
      postsTransaction.onerror = () => reject(postsTransaction.error);
    });
  }

  // Get pending offline posts
  async getPendingPosts(): Promise<OfflinePost[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["offline_posts"], "readonly");
      const store = transaction.objectStore("offline_posts");
      const index = store.index("sync_status");
      const request = index.getAll("pending");

      request.onsuccess = () => {
        console.log(`📤 Found ${request.result.length} pending posts`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Mark offline post as synced
  async markPostSynced(localId: string, serverId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(
      ["offline_posts", "posts"],
      "readwrite",
    );

    // Remove from offline_posts
    const offlineStore = transaction.objectStore("offline_posts");
    offlineStore.delete(localId);

    // Update in posts with new server ID
    const postsStore = transaction.objectStore("posts");
    const getRequest = postsStore.get(localId);

    getRequest.onsuccess = () => {
      const post = getRequest.result;
      if (post) {
        postsStore.delete(localId);
        post.id = serverId;
        post.sync_status = "synced";
        delete post.local_id;
        postsStore.add(post);
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Post synced: ${localId} -> ${serverId}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Save app state (scroll position, etc.)
  async saveAppState(state: Partial<PostsState>): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(["app_state"], "readwrite");
    const store = transaction.objectStore("app_state");

    store.put({
      key: `posts_state_${this.userId}`,
      ...state,
      updated_at: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get app state
  async getAppState(): Promise<PostsState | null> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["app_state"], "readonly");
      const store = transaction.objectStore("app_state");
      const request = store.get(`posts_state_${this.userId}`);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear old cache (keep last 100 posts)
  async clearOldCache(): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["posts"], "readwrite");
      const store = transaction.objectStore("posts");
      const index = store.index("created_at");

      let count = 0;
      const request = index.openCursor(null, "prev");

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          count++;
          if (count > 100) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          console.log(
            `🧹 Cleaned old cache, kept ${Math.min(count, 100)} posts`,
          );
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get cache stats
  async getCacheStats(): Promise<{
    postsCount: number;
    offlineCount: number;
    size: number;
  }> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ["posts", "offline_posts"],
        "readonly",
      );

      let postsCount = 0;
      let offlineCount = 0;

      const postsRequest = transaction.objectStore("posts").count();
      const offlineRequest = transaction.objectStore("offline_posts").count();

      postsRequest.onsuccess = () => {
        postsCount = postsRequest.result;
      };

      offlineRequest.onsuccess = () => {
        offlineCount = offlineRequest.result;
      };

      transaction.oncomplete = () => {
        // Estimate size (rough calculation)
        const estimatedSize = postsCount * 2048 + offlineCount * 1024;

        resolve({
          postsCount,
          offlineCount,
          size: estimatedSize,
        });
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Global cache instance
let cacheInstance: AdvancedPostsCache | null = null;

export function getAdvancedPostsCache(userId: string): AdvancedPostsCache {
  if (!cacheInstance || cacheInstance["userId"] !== userId) {
    cacheInstance = new AdvancedPostsCache(userId);
  }
  return cacheInstance;
}

export default AdvancedPostsCache;
