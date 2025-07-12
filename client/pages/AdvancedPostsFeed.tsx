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
  const handlePostsEvent = useCallback(
    (event: string, data?: any) => {
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
      }
    },
    [postsManager, removeDuplicatePosts],
  );

  // Network state management
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Back online, refreshing posts...");
      handleRefresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📵 Gone offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load more posts (infinite scroll)
  const loadMorePosts = async () => {
    if (isLoadingMore.current || !hasMore) return;

    isLoadingMore.current = true;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const result = await postsManager.getPosts(nextPage);

      if (result.posts.length > 0) {
        setPosts((prev) => removeDuplicatePosts([...prev, ...result.posts]));
        setPage(nextPage);
        setHasMore(result.hasMore);

        console.log(`📄 Loaded page ${nextPage}: ${result.posts.length} posts`);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("❌ Error loading more posts:", error);
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    setShowNewPostsBar(false);

    try {
      const result = await postsManager.getPosts(1, true); // Force refresh
      setPosts(removeDuplicatePosts(result.posts));
      setPage(1);
      setHasMore(true);
      setNewPostsCount(0);

      console.log("✅ Manual refresh completed");

      // Scroll to top
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("❌ Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle scroll for infinite loading and scroll position tracking
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const element = e.currentTarget;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      // Track scroll position
      setScrollPosition(scrollTop);

      // Load more when near bottom (200px threshold)
      if (
        scrollHeight - scrollTop - clientHeight < 200 &&
        hasMore &&
        !loading &&
        !isLoadingMore.current
      ) {
        loadMorePosts();
      }

      lastScrollY.current = scrollTop;
    },
    [hasMore, loading, loadMorePosts],
  );

  // Pull to refresh functionality
  const handlePullToRefresh = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [handleRefresh],
  );

  // Double tap on home tab to refresh
  useEffect(() => {
    let lastTapTime = 0;

    const handleTabChange = (e: CustomEvent) => {
      if (e.detail === "homepage") {
        const now = Date.now();
        if (now - lastTapTime < 500) {
          // Double tap within 500ms
          console.log("👆 Double tap on home tab detected, refreshing...");
          handleRefresh();
        }
        lastTapTime = now;
      }
    };

    window.addEventListener("tabChange", handleTabChange as EventListener);

    return () => {
      window.removeEventListener("tabChange", handleTabChange as EventListener);
    };
  }, [handleRefresh]);

  // Scroll position management
  const saveCurrentScrollPosition = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      postsManager.saveScrollPosition(scrollTop);
    }
  };

  const restoreScrollPosition = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        const savedPosition = postsManager.getScrollPosition();
        if (savedPosition > 0) {
          scrollRef.current.scrollTop = savedPosition;
        }
      }
    }, 100);
  };

  // Like post functionality
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

    try {
      // Update through posts manager
      await postsManager.toggleLike(postId, !isLiked);
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert optimistic update
      if (isLiked) {
        setLikedPosts((prev) => new Set([...prev, postId]));
      } else {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    }
  };

  // Time formatting function
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

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* New Posts Bar */}
      {showNewPostsBar && (
        <div className="fixed top-4 left-4 right-4 z-40">
          <Button
            onClick={handleRefresh}
            className="w-full bg-primary text-primary-foreground shadow-lg"
            disabled={refreshing}
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            {newPostsCount} منشور جديد - انقر للتحديث
          </Button>
        </div>
      )}

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
          /* No posts state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">
                لا توجد منشورات بعد
              </h3>
              <p className="text-muted-foreground mb-4">
                تابع بعض الحلاقين لترى منشوراتهم هنا
              </p>
            </div>

            <Button
              onClick={() => {
                // Navigate to search/explore
                const event = new CustomEvent("tabChange", {
                  detail: "search",
                });
                window.dispatchEvent(event);
              }}
              className="bg-primary text-primary-foreground px-8 py-3"
            >
              🔍 اكتشف الحلاقين
            </Button>

            <Button
              variant="outline"
              onClick={() => handleRefresh()}
              className="mt-3"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  تحديث
                </>
              )}
            </Button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && (
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
