import apiClient from "./api";

interface CachedPost {
  id: string;
  user_id: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  image_url: string;
  caption?: string;
  likes: number;
  comments_count: number;
  created_at: string;
  isLiked: boolean;
  cached_at: number;
}

interface PostsCache {
  posts: CachedPost[];
  timestamp: number;
  user_id: string;
}

class PostsCacheManager {
  private userId: string;
  private cacheKey: string;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
  private isLoading = false;

  constructor(userId: string) {
    this.userId = userId;
    this.cacheKey = `posts_cache_${userId}`;
  }

  // Get posts with instant cache loading
  async getPostsInstant(): Promise<{
    posts: CachedPost[];
    source: "cache" | "skeleton";
    loadTime: number;
  }> {
    const startTime = performance.now();

    try {
      // Try to load from cache first
      const cached = this.getCachedPosts();
      if (cached && cached.posts.length > 0) {
        const loadTime = performance.now() - startTime;
        console.log(
          `📱 Loaded ${cached.posts.length} posts from cache in ${loadTime.toFixed(1)}ms`,
        );

        // Start background sync if cache is old
        if (Date.now() - cached.timestamp > this.cacheDuration / 2) {
          this.backgroundSync();
        }

        return {
          posts: cached.posts,
          source: "cache",
          loadTime,
        };
      }
    } catch (error) {
      console.warn("Cache loading failed:", error);
    }

    // Return skeleton posts for instant loading
    const skeletonPosts = this.generateSkeletonPosts();
    const loadTime = performance.now() - startTime;

    // Start loading real data
    this.backgroundSync();

    return {
      posts: skeletonPosts,
      source: "skeleton",
      loadTime,
    };
  }

  // Background sync for posts
  private async backgroundSync() {
    if (this.isLoading) return;

    this.isLoading = true;
    console.log("🔄 Starting background posts sync...");

    try {
      // Get following list
      const followingResponse = await apiClient.getFollows("following");
      const followingIds =
        followingResponse.follows?.map((f: any) => f.followed_id) || [];

      if (followingIds.length === 0) {
        console.log("No following users, using demo posts");
        const demoPosts = this.generateDemoPosts();
        this.saveToCacheBackground(demoPosts);
        this.notifyUpdate(demoPosts);
        return;
      }

      // Get posts from API
      const postsResponse = await apiClient.getPosts();
      const allPosts = postsResponse.posts || [];

      // Get users for author info
      const usersResponse = await apiClient.getBarbers();
      const users = usersResponse.barbers || [];

      // Create user lookup
      const userMap = new Map();
      users.forEach((u: any) => {
        userMap.set(u.id, u);
      });

      // Filter and enhance posts
      const followedPosts = allPosts
        .filter((post: any) => followingIds.includes(post.user_id))
        .map((post: any) => ({
          id: post.id,
          user_id: post.user_id,
          author: userMap.get(post.user_id) || {
            id: post.user_id,
            name: "مستخدم مجهول",
            avatar_url: null,
            is_verified: false,
          },
          image_url: post.image_url,
          caption: post.caption || post.content,
          likes: post.likes || 0,
          comments_count: post.comments_count || 0,
          created_at: post.created_at,
          isLiked: false,
          cached_at: Date.now(),
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      // Get user's liked posts
      try {
        const likesResponse = await apiClient.getUserLikes();
        const userLikedPostIds = new Set(likesResponse.liked_posts || []);

        // Update posts with like status
        followedPosts.forEach((post) => {
          post.isLiked = userLikedPostIds.has(post.id);
        });
      } catch (error) {
        console.warn("Could not load user likes:", error);
      }

      // Save to cache
      this.saveToCacheBackground(followedPosts);

      // Notify about updates
      this.notifyUpdate(followedPosts);

      console.log(
        `✅ Background sync completed: ${followedPosts.length} posts`,
      );
    } catch (error) {
      console.error("Background sync failed:", error);
    } finally {
      this.isLoading = false;
    }
  }

  // Save posts to cache in background
  private saveToCacheBackground(posts: CachedPost[]) {
    try {
      const cacheData: PostsCache = {
        posts,
        timestamp: Date.now(),
        user_id: this.userId,
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached ${posts.length} posts`);
    } catch (error) {
      console.warn("Failed to save posts to cache:", error);
    }
  }

  // Get cached posts
  private getCachedPosts(): PostsCache | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const parsed: PostsCache = JSON.parse(cached);

      // Validate cache
      if (parsed.user_id !== this.userId) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn("Failed to parse cached posts:", error);
      localStorage.removeItem(this.cacheKey);
      return null;
    }
  }

  // Generate skeleton posts for loading state
  private generateSkeletonPosts(): CachedPost[] {
    return Array.from({ length: 3 }, (_, i) => ({
      id: `skeleton_${i}`,
      user_id: `skeleton_user_${i}`,
      author: {
        id: `skeleton_user_${i}`,
        name: "...",
        avatar_url: undefined,
        is_verified: false,
      },
      image_url: "/placeholder.svg",
      caption: undefined,
      likes: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      isLiked: false,
      cached_at: Date.now(),
    }));
  }

  // Generate demo posts
  private generateDemoPosts(): CachedPost[] {
    return [
      {
        id: "demo_1",
        user_id: "demo_barber_1",
        author: {
          id: "demo_barber_1",
          name: "أحمد الخبير",
          avatar_url:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
          is_verified: true,
        },
        image_url:
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=600&fit=crop",
        caption: "قصة شعر مميزة لأحد العملاء المتميزين 💫",
        likes: 127,
        comments_count: 23,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
        cached_at: Date.now(),
      },
      {
        id: "demo_2",
        user_id: "demo_barber_2",
        author: {
          id: "demo_barber_2",
          name: "محم�� المتخصص",
          avatar_url:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
          is_verified: true,
        },
        image_url:
          "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&h=600&fit=crop",
        caption: "تصفيف رائع وإطلالة جديدة ✨",
        likes: 89,
        comments_count: 15,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isLiked: true,
        cached_at: Date.now(),
      },
      {
        id: "demo_3",
        user_id: "demo_barber_3",
        author: {
          id: "demo_barber_3",
          name: "سالم الحرفي",
          avatar_url:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
          is_verified: false,
        },
        image_url:
          "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=600&fit=crop",
        caption: "فن الحلاقة الكلاسيكية 🎨",
        likes: 156,
        comments_count: 31,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
        cached_at: Date.now(),
      },
    ];
  }

  // Notify about updates
  private notifyUpdate(posts: CachedPost[]) {
    window.dispatchEvent(
      new CustomEvent("postsUpdated", {
        detail: { posts, userId: this.userId },
      }),
    );
  }

  // Start automatic background sync
  startBackgroundSync() {
    // Clear existing interval
    this.stopBackgroundSync();

    // Start new interval - sync every 2 minutes
    this.backgroundSyncInterval = setInterval(
      () => {
        this.backgroundSync();
      },
      2 * 60 * 1000,
    );

    console.log("🔄 Posts background sync started");
  }

  // Stop background sync
  stopBackgroundSync() {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
      console.log("⏸️ Posts background sync stopped");
    }
  }

  // Update like status for a post
  updatePostLike(postId: string, isLiked: boolean) {
    try {
      const cached = this.getCachedPosts();
      if (!cached) return;

      const updatedPosts = cached.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked,
              likes: isLiked ? post.likes + 1 : post.likes - 1,
            }
          : post,
      );

      this.saveToCacheBackground(updatedPosts);
      this.notifyUpdate(updatedPosts);
    } catch (error) {
      console.warn("Failed to update post like in cache:", error);
    }
  }

  // Cleanup resources
  destroy() {
    this.stopBackgroundSync();
  }
}

// Cache instances per user
const postsCacheInstances = new Map<string, PostsCacheManager>();

// Get posts cache for a user
export function getPostsCache(userId: string): PostsCacheManager {
  if (!postsCacheInstances.has(userId)) {
    postsCacheInstances.set(userId, new PostsCacheManager(userId));
  }
  return postsCacheInstances.get(userId)!;
}

// Cleanup all caches
export function clearAllPostsCaches() {
  postsCacheInstances.forEach((cache) => cache.destroy());
  postsCacheInstances.clear();
}

export type { CachedPost, PostsCache };
export { PostsCacheManager };
