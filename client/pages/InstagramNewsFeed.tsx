import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  getFollowingPostsCache,
  CachedFollowingPost,
} from "@/lib/following-posts-cache";

interface InstagramNewsFeedProps {
  user: User;
  onUserClick?: (user: User) => void;
}

export default function InstagramNewsFeed({
  user,
  onUserClick,
}: InstagramNewsFeedProps) {
  console.log("🚀🚀🚀 INSTAGRAM NEWS FEED LOADING 🚀🚀🚀");
  console.log("📱 InstagramNewsFeed mounted for user:", user?.id);
  console.log("👤 User data:", user);

  const [posts, setPosts] = useState<CachedFollowingPost[]>([]);
  const [loading, setLoading] = useState(false); // Don't show loading by default
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastTabClickTime, setLastTabClickTime] = useState(0);
  const [lastAppFocus, setLastAppFocus] = useState(Date.now());
  const [hasInitialized, setHasInitialized] = useState(false);
  const cache = useRef(getFollowingPostsCache(user.id));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load posts on mount - only once
  useEffect(() => {
    loadPostsInitial();

    // Subscribe to cache updates
    const unsubscribe = cache.current.onRefresh(() => {
      loadPosts();
    });

    // Only preload if no cache exists
    cache.current.preloadOnLogin();

    return unsubscribe;
  }, [user.id]);

  // Listen for manual refresh events and tab clicks
  useEffect(() => {
    const handleManualRefresh = () => {
      handleRefresh();
    };

    // Listen for double tab click on homepage
    const handleTabChange = (e: CustomEvent) => {
      if (e.detail === "homepage") {
        const now = Date.now();
        if (now - lastTabClickTime < 1000) {
          // Double click within 1 second
          console.log("🔄 Double tab click detected, refreshing posts...");
          handleRefresh();
        }
        setLastTabClickTime(now);
      }
    };

    // Listen for app focus/blur to detect 30 second absence
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const awayTime = now - lastAppFocus;
        console.log(
          `👁️ App became visible, was away for ${Math.round(awayTime / 1000)} seconds`,
        );

        if (awayTime > 30000) {
          // 30 seconds
          console.log("🔄 App returned after 30+ seconds, refreshing posts...");
          handleRefresh();
        }
        setLastAppFocus(now);
      } else {
        const now = Date.now();
        console.log("👁️ App became hidden");
        setLastAppFocus(now);
      }
    };

    window.addEventListener("manualPostsRefresh", handleManualRefresh);
    window.addEventListener("tabChange", handleTabChange as EventListener);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("manualPostsRefresh", handleManualRefresh);
      window.removeEventListener("tabChange", handleTabChange as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lastTabClickTime, lastAppFocus]);

  // Initial load - only loads cached posts, no API calls
  const loadPostsInitial = async () => {
    // Only show loading if this is the very first time
    if (!hasInitialized) {
      setLoading(true);
    }

    console.log("📥 Initial posts load (cache only)...");
    try {
      const cachedPosts = await cache.current.getPostsUltraFast();
      console.log("⚡ Cached posts loaded:", cachedPosts.length);
      setPosts(cachedPosts);

      // If no cached posts, still show empty state (no automatic API call)
      if (cachedPosts.length === 0) {
        console.log(
          "💭 No cached posts found, showing empty state (manual refresh required)",
        );
      }
    } catch (error) {
      console.error("❌ Error loading cached posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
      setHasInitialized(true);
    }
  };

  // Regular load for manual refreshes
  const loadPosts = async () => {
    console.log("📥 Loading posts (from cache)...");
    try {
      const cachedPosts = await cache.current.getPostsUltraFast();
      console.log("⚡ Cached posts loaded:", cachedPosts.length);
      setPosts(cachedPosts);
    } catch (error) {
      console.error("❌ Error loading posts:", error);
      setPosts([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const freshPosts = await cache.current.forceRefresh();
      setPosts(freshPosts);
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

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

    // Update cache immediately
    cache.current.updatePostLike(postId, !isLiked);

    // Send to API in background
    try {
      const { default: apiClient } = await import("../lib/api");
      if (isLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert optimistic update on error
      if (isLiked) {
        setLikedPosts((prev) => new Set([...prev, postId]));
      } else {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
      cache.current.updatePostLike(postId, isLiked); // Revert cache
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "الآ��";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} د`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} س`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ي`;
    return `${Math.floor(diffInSeconds / 604800)} أ`;
  };

  // Enhanced Pull to refresh functionality
  const handlePullToRefresh = useCallback((e: React.TouchEvent) => {
    // Only allow pull to refresh if at top of page
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      return;
    }

    const startY = e.touches[0].clientY;
    let hasMoved = false;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const pullDistance = currentY - startY;

      // Only trigger if pulled down more than 100px from top
      if (pullDistance > 100 && !hasMoved) {
        hasMoved = true;
        console.log("🔽 Pull to refresh triggered");
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

  // عرض رسالة الخطأ
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-4">حدث خطأ</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              loadPosts();
            }}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
      >
        {/* Loading indicator */}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">جاري تحميل المنشورات...</p>
            <p className="text-gray-400 text-sm mt-2">يرجى الانتظار</p>
          </div>
        </div>
      </div>
    );
  }

  console.log("🎨 Rendering InstagramNewsFeed with:", {
    postsCount: posts.length,
    loading,
    refreshing,
    userId: user?.id,
  });

  return (
    <div
      ref={scrollRef}
      className="min-h-screen bg-background text-foreground overflow-y-auto"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
      }}
      onTouchStart={handlePullToRefresh}
    >
      {/* Stories Section */}
      <div className="sticky top-0 z-10 border-b border-border/20 bg-background/95 backdrop-blur-sm">
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

          {/* Other Stories Placeholder */}
          {[
            {
              name: "d___sssu",
              avatar: "https://picsum.photos/100/100?random=1",
            },
            {
              name: "allaa2h",
              avatar: "https://picsum.photos/100/100?random=2",
            },
            {
              name: "hs.do_20",
              avatar: "https://picsum.photos/100/100?random=3",
            },
            { name: "احمد", avatar: "https://picsum.photos/100/100?random=4" },
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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="pb-20">
        {loading && posts.length === 0 ? (
          <div className="space-y-4">
            {/* Skeleton Stories */}
            <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm">
              <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 min-w-[70px]"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted/30 animate-pulse"></div>
                    <div className="w-12 h-3 bg-muted/30 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Posts */}
            {[...Array(3)].map((_, i) => (
              <article
                key={i}
                className="border-b border-border/10 bg-background animate-pulse"
              >
                {/* Post Header Skeleton */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-muted/30"></div>
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-muted/30 rounded mb-1"></div>
                    <div className="w-16 h-3 bg-muted/20 rounded"></div>
                  </div>
                  <div className="w-6 h-6 bg-muted/20 rounded"></div>
                </div>

                {/* Post Image Skeleton */}
                <div className="w-full h-80 bg-muted/20"></div>

                {/* Post Actions Skeleton */}
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-6 h-6 bg-muted/20 rounded"></div>
                    <div className="w-6 h-6 bg-muted/20 rounded"></div>
                    <div className="w-6 h-6 bg-muted/20 rounded"></div>
                    <div className="ml-auto w-6 h-6 bg-muted/20 rounded"></div>
                  </div>
                  <div className="w-20 h-4 bg-muted/30 rounded mb-2"></div>
                  <div className="w-full h-4 bg-muted/20 rounded mb-1"></div>
                  <div className="w-3/4 h-4 bg-muted/20 rounded"></div>
                </div>
              </article>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-background">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">
                ابدأ متابعة الحلاقين
              </h3>
              <p className="text-muted-foreground">
                اكتشف حلاقين جدد وتابع أعمالهم لترى منشوراتهم هنا
              </p>
            </div>

            <Button
              onClick={() => {
                // Navigate to explore tab
                const event = new CustomEvent("tabChange", {
                  detail: "search",
                });
                window.dispatchEvent(event);
              }}
              className="bg-primary text-primary-foreground px-8 py-3 text-lg"
            >
              🔍 اكتشف الحلاقين
            </Button>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="border-b border-border/10 bg-background"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="w-10 h-10 cursor-pointer"
                    onClick={() => post.user && onUserClick?.(post.user)}
                  >
                    <AvatarImage src={post.user?.avatar_url} />
                    <AvatarFallback>
                      {post.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      className="font-medium text-sm text-foreground cursor-pointer"
                      onClick={() => post.user && onUserClick?.(post.user)}
                    >
                      {post.user?.name}
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

              {/* Post Image - الصورة بحرية العرض */}
              <div className="relative bg-black">
                <img
                  src={post.image_url}
                  alt={post.caption || "منشور"}
                  className="w-full h-auto max-h-[70vh] object-contain"
                  style={{ aspectRatio: "auto" }}
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
                          likedPosts.has(post.id) || post.is_liked
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
                  {post.likes + (likedPosts.has(post.id) ? 1 : 0)} إعجاب
                </p>

                {/* Caption */}
                {post.caption && (
                  <div className="text-sm text-foreground">
                    <span className="font-medium">{post.user?.name}</span>{" "}
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
        )}
      </div>
    </div>
  );
}
