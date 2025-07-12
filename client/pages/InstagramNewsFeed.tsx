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
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastTabClickTime, setLastTabClickTime] = useState(0);
  const [lastAppFocus, setLastAppFocus] = useState(Date.now());
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isFollowingAnyone, setIsFollowingAnyone] = useState<boolean | null>(
    null,
  );
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

  // Listen for manual refresh events, tab clicks, and network changes
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

    // Listen for network status changes
    const handleOnline = () => {
      console.log("🌐 Network came back online, refreshing posts...");
      // Small delay to ensure network is stable
      setTimeout(() => {
        handleRefresh();
      }, 2000);
    };

    const handleOffline = () => {
      console.log("📵 Network went offline, using cached posts");
    };

    window.addEventListener("manualPostsRefresh", handleManualRefresh);
    window.addEventListener("tabChange", handleTabChange as EventListener);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("manualPostsRefresh", handleManualRefresh);
      window.removeEventListener("tabChange", handleTabChange as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [lastTabClickTime, lastAppFocus]);

  // Initial load - loads cached posts first, then refreshes if needed
  const loadPostsInitial = async () => {
    console.log("📥 Initial posts load...");
    try {
      // First, load cached posts immediately for fast display
      const cachedPosts = await cache.current.getPostsUltraFast();
      console.log("⚡ Cached posts loaded:", cachedPosts.length);
      setPosts(cachedPosts);

      // Check if we need to refresh (few posts or old cache)
      const shouldRefresh = cachedPosts.length < 5 || navigator.onLine;

      if (shouldRefresh && navigator.onLine) {
        console.log("🔄 Refreshing posts in background...");
        try {
          // Refresh in background to get latest posts
          setTimeout(async () => {
            try {
              const freshPosts = await cache.current.refreshFromAPI();
              console.log(
                "✅ Background refresh completed:",
                freshPosts.length,
                "posts",
              );
              setPosts(freshPosts);
            } catch (refreshError) {
              console.warn("⚠️ Background refresh failed:", refreshError);
            }
          }, 500); // Small delay to show cached posts first
        } catch (error) {
          console.warn("⚠️ Background refresh setup failed:", error);
        }
      }

      // If no cached posts, check if user follows anyone (for better UX)
      if (cachedPosts.length === 0) {
        console.log("💭 No cached posts found, checking following status...");
        try {
          const { default: apiClient } = await import("../lib/api");
          const followingResponse = await apiClient.getFollows("following");
          setIsFollowingAnyone(followingResponse.total > 0);
          console.log(`👥 User follows ${followingResponse.total} people`);
        } catch (error) {
          console.error("❌ Error checking following status:", error);
          setIsFollowingAnyone(null);
        }
      }
    } catch (error) {
      console.error("❌ Error loading cached posts:", error);
      setPosts([]);
    } finally {
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
      // Check if user follows anyone first
      const { default: apiClient } = await import("../lib/api");
      const followingResponse = await apiClient.getFollows("following");
      setIsFollowingAnyone(followingResponse.total > 0);

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

    if (diffInSeconds < 60) return "الآن";
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

  console.log("🎨 Rendering InstagramNewsFeed with:", {
    postsCount: posts.length,
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
        {
          posts.length > 0 ? (
            // ALWAYS show posts if we have them - render the actual posts
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

                {/* Post Image */}
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
          ) : // NEVER show empty state unless user doesn't follow anyone
          isFollowingAnyone === false && hasInitialized ? (
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
          ) : null // Don't show anything else - just wait for posts to load in background
        }
      </div>
    </div>
  );
}
