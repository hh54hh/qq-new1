// Posts Hook - Simplified state management for posts
import { useState, useEffect, useCallback } from "react";
import { getPostsManager } from "@/lib/posts-manager";
import { CachedPost } from "@/lib/advanced-posts-cache";

export interface UsePostsOptions {
  userId: string;
  autoLoad?: boolean;
}

export interface UsePostsReturn {
  posts: CachedPost[];
  loading: boolean;
  hasMore: boolean;
  newPostsCount: number;
  isOnline: boolean;
  error: string | null;

  // Actions
  loadPosts: (page?: number) => Promise<void>;
  refreshPosts: () => Promise<void>;
  loadMore: () => Promise<void>;
  showNewPosts: () => void;

  // Post interactions
  likePost: (postId: string) => Promise<void>;
  createPost: (postData: {
    image_url: string;
    caption: string;
    frame_style?: string;
  }) => Promise<string>;

  // Scroll management
  saveScrollPosition: (position: number) => Promise<void>;
  getScrollPosition: () => Promise<number>;
}

export function usePosts({
  userId,
  autoLoad = true,
}: UsePostsOptions): UsePostsReturn {
  // State
  const [posts, setPosts] = useState<CachedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Posts manager
  const postsManager = getPostsManager(userId);

  // Initialize
  useEffect(() => {
    if (autoLoad) {
      loadPosts(1);
    }

    // Setup event listeners
    const unsubscribe = postsManager.addEventListener(handlePostsEvent);

    // Network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId, autoLoad]);

  // Handle posts manager events
  const handlePostsEvent = useCallback((event: string, data?: any) => {
    switch (event) {
      case "posts_loaded":
        if (data.page === 1) {
          setPosts(data.posts);
        } else {
          setPosts((prev) => [...prev, ...data.posts]);
        }
        setHasMore(data.hasMore);
        setLoading(false);
        break;

      case "posts_updated":
        loadPosts(1);
        break;

      case "new_posts_available":
        setNewPostsCount(data.count);
        break;

      case "post_added":
        loadPosts(1);
        break;

      case "network_status":
        setIsOnline(data.online);
        break;

      case "error":
        setError(data.message);
        setLoading(false);
        break;
    }
  }, []);

  // Load posts
  const loadPosts = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);
      setError(null);

      try {
        const result = await postsManager.getPosts(pageNum);

        if (pageNum === 1) {
          setPosts(result.posts);
          setPage(1);
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
          setPage(pageNum);
        }

        setHasMore(result.hasMore);
        setNewPostsCount(result.newPostsCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ في تحميل المنشورات");
      } finally {
        setLoading(false);
      }
    },
    [postsManager],
  );

  // Refresh posts
  const refreshPosts = useCallback(async () => {
    setNewPostsCount(0);
    await loadPosts(1);
  }, [loadPosts]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadPosts(page + 1);
  }, [hasMore, loading, page, loadPosts]);

  // Show new posts
  const showNewPosts = useCallback(() => {
    setNewPostsCount(0);
    refreshPosts();
  }, [refreshPosts]);

  // Like post
  const likePost = useCallback(async (postId: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post,
      ),
    );

    try {
      const { default: apiClient } = await import("../lib/api");
      await apiClient.likePost(postId);
    } catch (error) {
      console.warn("⚠️ Like failed (will retry):", error);
      // Revert optimistic update
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes: post.likes - 1 } : post,
        ),
      );
    }
  }, []);

  // Create post
  const createPost = useCallback(
    async (postData: {
      image_url: string;
      caption: string;
      frame_style?: string;
    }) => {
      const postId = await postsManager.addPost(postData);
      return postId;
    },
    [postsManager],
  );

  // Scroll position management
  const saveScrollPosition = useCallback(
    async (position: number) => {
      await postsManager.saveScrollPosition(position);
    },
    [postsManager],
  );

  const getScrollPosition = useCallback(async () => {
    return await postsManager.getScrollPosition();
  }, [postsManager]);

  return {
    posts,
    loading,
    hasMore,
    newPostsCount,
    isOnline,
    error,

    loadPosts,
    refreshPosts,
    loadMore,
    showNewPosts,

    likePost,
    createPost,

    saveScrollPosition,
    getScrollPosition,
  };
}

export default usePosts;
