// Advanced Posts Feed - Professional Facebook-like Experience
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPostsManager } from "@/lib/posts-manager";
import { CachedPost } from "@/lib/advanced-posts-cache";

interface AdvancedPostsFeedProps {
  user: User;
  onUserClick?: (user: User) => void;
}

export default function AdvancedPostsFeed({
  user,
  onUserClick,
}: AdvancedPostsFeedProps) {
  console.log("🚀 AdvancedPostsFeed loading for user:", user?.id);

  // Core state
  const [posts, setPosts] = useState<CachedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [newPostsCount, setNewPostsCount] = useState(0);

  // UI state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNewPostsBar, setShowNewPostsBar] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [scrollPosition, setScrollPosition] = useState(0);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const postsManager = useMemo(() => getPostsManager(user.id), [user.id]);
  const lastScrollY = useRef(0);
  const isLoadingMore = useRef(false);

  // Function to remove duplicate posts
  const removeDuplicatePosts = useCallback((posts: CachedPost[]) => {
    const seenIds = new Set<string>();
    const uniquePosts = posts.filter((post) => {
      const key = `${post.id}-${post.created_at}`;
      if (seenIds.has(key)) {
        console.warn("🚨 Duplicate post detected:", post.id);
        return false;
      }
      seenIds.add(key);
      return true;
    });

    if (uniquePosts.length !== posts.length) {
      console.log(
        `🧹 Removed ${posts.length - uniquePosts.length} duplicate posts`,
      );
    }

    return uniquePosts;
  }, []);

  // Initialize posts on mount
  useEffect(() => {
    initializePosts();

    // Setup event listeners
    const unsubscribe = postsManager.addEventListener(handlePostsEvent);

    // Restore scroll position
    restoreScrollPosition();

    return () => {
      unsubscribe();
      saveCurrentScrollPosition();
    };
  }, [user.id]);

  // Initialize posts
  const initializePosts = async () => {
    console.log("📥 Initializing posts for user:", user.id);
    console.log("📥 PostsManager:", postsManager);
    try {
      const result = await postsManager.getPosts(1);
      console.log("📥 PostsManager.getPosts(1) result:", result);
      console.log("📥 Raw posts from manager:", result.posts);

      const uniquePosts = removeDuplicatePosts(result.posts);
      console.log("📥 Unique posts after deduplication:", uniquePosts);

      setPosts(uniquePosts);
      setHasMore(result.hasMore);
      setNewPostsCount(result.newPostsCount);

      console.log(
        `✅ Initialized with ${result.posts.length} posts (cache: ${result.isFromCache})`,
      );
      console.log("✅ Posts state should now be:", uniquePosts);
    } catch (error) {
      console.error("❌ Error initializing posts:", error);
    }
  };

  // Handle posts manager events
  const handlePostsEvent = useCallback((event: string, data?: any) => {
    console.log(`📡 Posts event: ${event}`, data);

    switch (event) {
      case "posts_loaded":
        if (data.posts) {
          setPosts((prev) => {
            const newPosts =
              data.page === 1 ? data.posts : [...prev, ...data.posts];
            return removeDuplicatePosts(newPosts);
          });
          setHasMore(data.hasMore);
        }
        break;

      case "posts_updated":
        // Refresh first page to get latest posts
        postsManager.getPosts(1).then((result) => {
          setPosts(removeDuplicatePosts(result.posts));
          setHasMore(true);
          setPage(1);
        });
        break;

      case "new_posts_available":
        setNewPostsCount(data.count);
        setShowNewPostsBar(true);
        break;

      case "post_added":
        // Add new post to top of feed
        initializePosts();
        break;

      case "network_status":
        setIsOnline(data.online);
        break;

      case "post_synced":
        // Update post status
        setPosts((prev) =>
          prev.map((post) =>
            post.id === data.localId || post.local_id === data.localId
              ? { ...post, id: data.serverId, sync_status: "synced" }
              : post,
          ),
        );
        break;
    }
  }, []);

  // Load more posts (infinite scroll)
  const loadMorePosts = useCallback(async () => {
    if (!hasMore || isLoadingMore.current) return;

    isLoadingMore.current = true;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const result = await postsManager.getPosts(nextPage);

      if (result.posts.length > 0) {
        setPosts((prev) => removeDuplicatePosts([...prev, ...result.posts]));
        setPage(nextPage);
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }

      console.log(`📄 Loaded page ${nextPage}: ${result.posts.length} posts`);
    } catch (error) {
      console.error("❌ Error loading more posts:", error);
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [page, hasMore]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollY = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Save scroll position
    setScrollPosition(scrollY);

    // Load more when near bottom
    if (
      scrollHeight - scrollY - clientHeight < 1000 &&
      hasMore &&
      !loading &&
      !isLoadingMore.current
    ) {
      loadMorePosts();
    }

    lastScrollY.current = scrollY;
  }, [hasMore, loading, loadMorePosts]);

  // Pull to refresh
  const handlePullToRefresh = useCallback(async (e: React.TouchEvent) => {
    const container = scrollRef.current;
    if (!container || container.scrollTop > 0) return;

    const startY = e.touches[0].clientY;
    let hasPulled = false;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > 80 && !hasPulled) {
        hasPulled = true;
        handleRefresh();
        document.removeEventListener("touchmove", handleTouchMove);
      }
    };

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  }, []);

  // Refresh posts
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await postsManager.refreshPosts();
      setPosts(removeDuplicatePosts(result.posts));
      setHasMore(result.hasMore);
      setPage(1);
      setNewPostsCount(0);
      setShowNewPostsBar(false);
      console.log("🔄 Posts refreshed");
    } catch (error) {
      console.error("❌ Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show new posts
  const showNewPosts = () => {
    setShowNewPostsBar(false);
    setNewPostsCount(0);
    scrollToTop();
    handleRefresh();
  };

  // Scroll to top
  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Save/restore scroll position
  const saveCurrentScrollPosition = () => {
    if (scrollPosition > 0) {
      postsManager.saveScrollPosition(scrollPosition);
    }
  };

  const restoreScrollPosition = async () => {
    const savedPosition = await postsManager.getScrollPosition();
    if (savedPosition > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: savedPosition });
      }, 100);
    }
  };

  // Handle like
  const handleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);

    // Optimistic update
    if (isLiked) {
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setLikedPosts((prev) => new Set([...prev, postId]));
    }

    // Update posts
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, likes: post.likes + (isLiked ? -1 : 1) }
          : post,
      ),
    );

    // API call (works offline with queue)
    try {
      const { default: apiClient } = await import("../lib/api");
      if (isLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }
    } catch (error) {
      console.warn("⚠️ Like sync failed (will retry later):", error);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "الآن";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} د`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} س`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ي`;
    return `${Math.floor(diffInSeconds / 604800)} أ`;
  };

  console.log("🎨 Rendering AdvancedPostsFeed:", {
    postsCount: posts.length,
    hasMore,
    isOnline,
    newPostsCount,
  });

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* New Posts Bar */}
      {showNewPostsBar && (
        <div className="fixed top-4 left-4 right-4 z-40">
          <Button
            onClick={showNewPosts}
            className="w-full bg-primary text-primary-foreground shadow-lg"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            عرض {newPostsCount} منشور جديد
          </Button>
        </div>
      )}

      {/* Stories Section */}
      <div className="sticky top-12 z-30 border-b border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-border">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs text-foreground truncate max-w-[60px]">
              قصتك
            </span>
          </div>

          {/* Sample Stories */}
          {[
            { name: "أحمد", avatar: "https://picsum.photos/100/100?random=1" },
            { name: "فاطمة", avatar: "https://picsum.photos/100/100?random=2" },
            { name: "محمد", avatar: "https://picsum.photos/100/100?random=3" },
            { name: "نور", avatar: "https://picsum.photos/100/100?random=4" },
          ].map((story, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={story.avatar} />
                  <AvatarFallback>{story.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-foreground truncate max-w-[60px]">
                {story.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Indicator */}
      {refreshing && (
        <div className="flex justify-center py-4 bg-background">
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">جاري التحديث...</span>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div
        ref={scrollRef}
        className="pb-20 overflow-y-auto"
        style={{ height: "calc(100vh - 140px)" }}
        onScroll={handleScroll}
        onTouchStart={handlePullToRefresh}
      >
        {/* DEBUG: Show posts status */}
        <div className="p-4 bg-red-100 text-red-800 text-sm">
          DEBUG: Posts length: {posts.length} | Loading: {loading} | Refreshing:{" "}
          {refreshing} | HasMore: {hasMore}
          {posts.length === 0 && (
            <div>
              No posts found. Check console for API calls and cache status.
            </div>
          )}
        </div>

        {posts.length > 0 ? (
          posts.map((post, index) => (
            <article
              key={`${post.id}-${index}-${post.created_at}`}
              className="border-b border-border/10 bg-background relative"
            >
              {/* Sync Status Indicator */}
              {post.sync_status === "pending" && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="outline" className="text-xs bg-orange-100">
                    في الانتظار
                  </Badge>
                </div>
              )}

              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="w-10 h-10 cursor-pointer"
                    onClick={() => post.user && onUserClick?.(post.user)}
                  >
                    <AvatarImage src={post.user?.avatar_url} />
                    <AvatarFallback>
                      {post.user?.name?.charAt(0) || user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      className="font-medium text-sm text-foreground cursor-pointer"
                      onClick={() => post.user && onUserClick?.(post.user)}
                    >
                      {post.user?.name || user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(post.created_at)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              {/* Post Image */}
              <div className="relative bg-black">
                <img
                  src={post.image_url}
                  alt={post.caption || "منشور"}
                  className="w-full h-auto max-h-[70vh] object-contain"
                  loading="lazy"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart
                        className={cn(
                          "w-6 h-6 transition-colors",
                          likedPosts.has(post.id)
                            ? "fill-red-500 text-red-500"
                            : "text-foreground",
                        )}
                      />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <MessageCircle className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Send className="w-6 h-6" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    <Bookmark className="w-6 h-6" />
                  </Button>
                </div>

                {/* Likes Count */}
                <p className="text-sm font-medium text-foreground mb-2">
                  {post.likes} إعجاب
                </p>

                {/* Caption */}
                {post.caption && (
                  <div className="text-sm text-foreground">
                    <span className="font-medium">
                      {post.user?.name || user.name}
                    </span>{" "}
                    <span>{post.caption}</span>
                  </div>
                )}

                {/* Comments */}
                <button className="text-sm text-muted-foreground mt-2">
                  عرض جميع التعليقات
                </button>
              </div>
            </article>
          ))
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا توجد منشورات بعد
            </h3>
            <p className="text-muted-foreground">
              ابدأ بم��ابعة الحلاقين لرؤية منشوراتهم هنا
            </p>
          </div>
        )}

        {/* Loading more indicator */}
        {loading && hasMore && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">جاري التحميل...</span>
            </div>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            🎉 وصلت إلى نهاية المنشورات
          </div>
        )}
      </div>
    </div>
  );
}
