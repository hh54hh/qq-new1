import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Camera,
  Plus,
  Search,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { getPostsCache, type CachedPost } from "@/lib/posts-cache";

interface InstagramNewsFeedProps {
  user: User;
  onUserClick?: (user: any) => void;
}

// Use CachedPost type from cache
type PostType = CachedPost;

export default function InstagramNewsFeed({
  user,
  onUserClick,
}: InstagramNewsFeedProps) {
  const [state, store] = useAppStore();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postsFromCache, setPostsFromCache] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [selectedPost, setSelectedPost] = useState<PostType | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentsData, setCommentsData] = useState<{ [key: string]: any[] }>(
    {},
  );
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Load posts with ultra-fast cache
  const loadPostsUltraFast = useCallback(async () => {
    const startTime = performance.now();
    console.log("🚀 Ultra-fast posts loading initiated for user:", user?.id);

    if (!user?.id) {
      console.log("No user ID, skipping posts load");
      return;
    }

    try {
      // Get posts cache manager
      const postsCache = getPostsCache(user.id);

      // Get instant data (cache/skeleton)
      const {
        posts: cachedPosts,
        source,
        loadTime,
      } = await postsCache.getPostsInstant();

      console.log(`ULTRA-FAST load: ${loadTime.toFixed(1)}ms from ${source}`);

      // Show data immediately regardless of source
      setPosts(cachedPosts);
      setPostsFromCache(source === "cache");
      setLoading(source === "skeleton");

      // Update liked posts state
      const likedIds = new Set<string>(
        cachedPosts.filter((p) => p.isLiked).map((p) => p.id),
      );
      setLikedPosts(likedIds);

      const totalTime = performance.now() - startTime;
      console.log(`TOTAL UI update time: ${totalTime.toFixed(1)}ms`);

      if (source === "skeleton") {
        console.log("Skeletons shown, awaiting real data...");
      } else {
        console.log(`Real data displayed (${cachedPosts.length} posts)`);
      }

      // Don't start automatic background sync
      // Only sync on manual refresh
    } catch (error) {
      console.error("Ultra-fast loading failed:", error);
      setLoading(false);
      setPosts(createDemoPosts());
    }
  }, [user?.id]);

  // Create demo posts for Instagram-like experience
  const createDemoPosts = (): PostType[] => [
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
        name: "محمد المتخصص",
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

  // Handle post like/unlike with cache update
  const handleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);

    try {
      // Optimistic UI update
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !isCurrentlyLiked,
                likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      );

      // Update cache immediately
      const postsCache = getPostsCache(user.id);
      postsCache.updatePostLike(postId, !isCurrentlyLiked);

      // API call
      if (isCurrentlyLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });

      // Revert UI state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: isCurrentlyLiked,
                likes: isCurrentlyLiked ? post.likes + 1 : post.likes - 1,
              }
            : post,
        ),
      );
    }
  };

  // Handle double tap on image for like
  const handleImageDoubleTap = (postId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected - trigger like
      console.log("💖 Double tap on image - triggering like");
      handleLike(postId);

      // Show like animation
      showLikeAnimation(postId);
    }

    setLastTap(now);
  };

  // Show like animation
  const showLikeAnimation = (postId: string) => {
    // Create temporary heart animation
    const heartElement = document.createElement("div");
    heartElement.innerHTML = "❤️";
    heartElement.style.cssText = `
      position: absolute;
      font-size: 3rem;
      color: #FFD700;
      animation: likeHeart 1s ease-out forwards;
      pointer-events: none;
      z-index: 1000;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0);
    `;

    // Add keyframes if not exists
    if (!document.querySelector("#like-heart-keyframes")) {
      const style = document.createElement("style");
      style.id = "like-heart-keyframes";
      style.textContent = `
        @keyframes likeHeart {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          15% { transform: translate(-50%, -50%) scale(1.2); }
          30% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const imageContainer = document.querySelector(`[data-post-id="${postId}"]`);
    if (imageContainer) {
      imageContainer.appendChild(heartElement);
      setTimeout(() => {
        if (heartElement.parentNode) {
          heartElement.parentNode.removeChild(heartElement);
        }
      }, 1000);
    }
  };

  // Load comments for a post
  const loadComments = async (postId: string) => {
    try {
      console.log("💬 Loading comments for post:", postId);
      const response = await apiClient.getPostComments(postId);
      setCommentsData((prev) => ({
        ...prev,
        [postId]: response.comments || [],
      }));
    } catch (error) {
      console.error("Error loading comments:", error);
      setCommentsData((prev) => ({
        ...prev,
        [postId]: [],
      }));
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (postId: string) => {
    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      console.log("📝 Submitting comment for post:", postId);

      const comment = await apiClient.createPostComment(
        postId,
        newComment.trim(),
      );

      // Add new comment to state
      setCommentsData((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));

      // Update post comments count
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post,
        ),
      );

      setNewComment("");
      console.log("✅ Comment submitted successfully");
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle comment button click
  const handleCommentsClick = (post: PostType) => {
    setSelectedPost(post);
    setShowComments(true);
    loadComments(post.id);
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "الآن";
    if (diffInHours < 24) return `منذ ${diffInHours} س`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} ي`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `منذ ${diffInWeeks} أ`;
  };

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    setIsManualRefresh(true);

    try {
      const postsCache = getPostsCache(user.id);

      // Force sync to get fresh data
      await postsCache.forceSyncNow();

      // Get updated posts
      const { posts: updatedPosts } = await postsCache.getPostsInstant();

      setPosts(updatedPosts);
      setPostsFromCache(true);
      setLoading(false);

      // Update liked posts state
      const likedIds = new Set<string>(
        updatedPosts.filter((p) => p.isLiked).map((p) => p.id),
      );
      setLikedPosts(likedIds);

      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setRefreshing(false);
      setIsManualRefresh(false);
    }
  }, [user.id]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
        setIsPulling(distance > 20);

        // Add resistance effect
        if (distance > 100) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      // Trigger refresh
      manualRefresh();
    }

    // Reset pull state
    setPullDistance(0);
    setIsPulling(false);
    setStartY(0);
  };

  // Load posts on mount only (no automatic updates)
  useEffect(() => {
    loadPostsUltraFast();

    // Listen for manual refresh requests from navigation
    const handleManualRefresh = () => {
      manualRefresh();
    };

    // Listen for app focus (return to app)
    const handleAppFocus = () => {
      // Check if user was away for more than 30 seconds
      const lastActiveTime = parseInt(
        localStorage.getItem("lastActiveTime") || "0",
      );
      const now = Date.now();
      const timeAway = now - lastActiveTime;

      if (timeAway > 30000) {
        // 30 seconds
        console.log("🔙 App returned after being away - refreshing posts");
        manualRefresh();
      }

      // Update last active time
      localStorage.setItem("lastActiveTime", now.toString());
    };

    // Listen for app blur (leaving app)
    const handleAppBlur = () => {
      localStorage.setItem("lastActiveTime", Date.now().toString());
    };

    window.addEventListener("manualPostsRefresh", handleManualRefresh);
    window.addEventListener("focus", handleAppFocus);
    window.addEventListener("blur", handleAppBlur);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleAppFocus();
      } else {
        handleAppBlur();
      }
    });

    // Set initial active time
    localStorage.setItem("lastActiveTime", Date.now().toString());

    return () => {
      window.removeEventListener("manualPostsRefresh", handleManualRefresh);
      window.removeEventListener("focus", handleAppFocus);
      window.removeEventListener("blur", handleAppBlur);
      document.removeEventListener("visibilitychange", handleAppFocus);
      // Stop any background sync
      const postsCache = getPostsCache(user.id);
      postsCache.stopBackgroundSync();
    };
  }, [loadPostsUltraFast, user.id, manualRefresh]);

  // Loading skeleton
  if (loading && posts.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-background min-h-screen relative">
        {/* Mobile PWA optimizations */}
        <div className="safe-area-top"></div>

        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stories Skeleton */}
        <div className="p-3 sm:p-4 border-b">
          <div className="flex space-x-3 space-x-reverse overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-full animate-pulse mb-2"></div>
                <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Posts Skeleton */}
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-background">
              {/* Post Header */}
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                    <div className="h-2 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
              </div>

              {/* Post Image */}
              <div className="aspect-square bg-muted animate-pulse"></div>

              {/* Post Actions */}
              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-4 space-x-reverse">
                    <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
                    <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
                    <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md mx-auto bg-background min-h-screen relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile PWA optimizations */}
      <div className="safe-area-top"></div>

      {/* Pull to refresh indicator */}
      {isPulling && (
        <div
          className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-200"
          style={{
            top: `${Math.max(20, pullDistance - 40)}px`,
            opacity: Math.min(1, pullDistance / 60),
          }}
        >
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 border-2 border-primary-foreground rounded-full",
                pullDistance > 60 ? "animate-spin border-t-transparent" : "",
              )}
            ></div>
            {pullDistance > 60 ? "اتركه للتحديث" : "اسحب للتحديث"}
          </div>
        </div>
      )}

      {/* Instagram-style Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">حلاقتي</h1>
          <div className="flex items-center space-x-3 space-x-reverse">
            <Button variant="ghost" size="icon" className="relative">
              <Camera className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="p-3 sm:p-4 border-b bg-background">
        <div className="flex space-x-3 space-x-reverse overflow-x-auto pb-2 scrollbar-hide">
          {/* Custom scrollbar hiding for mobile */}
          {/* Add Your Story */}
          <div className="flex-shrink-0 text-center">
            <div className="relative">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-dashed border-muted-foreground">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xs sm:text-xs mt-1 truncate w-14 sm:w-16">
              إضافة
            </p>
          </div>

          {/* Demo Stories */}
          {[
            {
              name: "أحمد",
              avatar:
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
            },
            {
              name: "محمد",
              avatar:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
            },
            {
              name: "سالم",
              avatar:
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
            },
            {
              name: "خالد",
              avatar:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
            },
            {
              name: "فيصل",
              avatar:
                "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face",
            },
          ].map((story, index) => (
            <div
              key={index}
              className="flex-shrink-0 text-center cursor-pointer"
            >
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-gradient-to-r from-pink-500 to-orange-500 p-0.5">
                <AvatarImage src={story.avatar} className="rounded-full" />
                <AvatarFallback>{story.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-2xs sm:text-xs mt-1 truncate w-14 sm:w-16">
                {story.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-0">
        {posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">ابدأ رحلتك</h3>
            <p className="text-muted-foreground mb-4">
              تابع الحلاقين المفضلين لديك لرؤية أعمالهم المميزة
            </p>
            <Button>اكتشف الحلاقين</Button>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-background border-b">
              {/* Post Header */}
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div
                  className="flex items-center space-x-3 space-x-reverse cursor-pointer"
                  onClick={() => onUserClick?.(post.author)}
                >
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                    <AvatarImage
                      src={post.author.avatar_url || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {post.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <p className="font-semibold text-xs sm:text-sm">
                        {post.author.name}
                      </p>
                      {post.author.is_verified && (
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-2xs sm:text-xs text-muted-foreground">
                      {formatTimeAgo(post.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                >
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>

              {/* Post Image */}
              <div
                className="aspect-square bg-muted relative"
                data-post-id={post.id}
                onClick={() => handleImageDoubleTap(post.id)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Post Actions */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-4 space-x-reverse">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0 h-auto"
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart
                        className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200",
                          post.isLiked
                            ? "fill-yellow-500 text-yellow-500 scale-110 drop-shadow-lg"
                            : "text-foreground hover:text-yellow-500",
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0 h-auto"
                      onClick={() => handleCommentsClick(post)}
                    >
                      <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="p-0 h-auto">
                      <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="p-0 h-auto">
                    <Bookmark className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>

                {/* Likes Count */}
                <p className="font-semibold text-xs sm:text-sm mb-1">
                  {post.likes} إعجاب
                </p>

                {/* Caption */}
                {post.caption && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold ml-2">
                      {post.author.name}
                    </span>
                    <span>{post.caption}</span>
                  </div>
                )}

                {/* Comments */}
                {post.comments_count > 0 && (
                  <Button
                    variant="ghost"
                    className="p-0 h-auto text-muted-foreground text-xs sm:text-sm mt-1"
                    onClick={() => handleCommentsClick(post)}
                  >
                    عرض جميع التعليقات ({post.comments_count})
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary-foreground rounded-full animate-spin border-t-transparent"></div>
            {isManualRefresh ? "جاري التحديث..." : "تحديث تلقائي..."}
          </div>
        </div>
      )}

      {/* Safe area bottom for mobile */}
      <div className="safe-area-bottom"></div>

      {/* Comments Modal */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md mx-auto h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowComments(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle>التعليقات</DialogTitle>
              <div className="w-10" /> {/* Spacer */}
            </div>
          </DialogHeader>

          {selectedPost && (
            <div className="flex flex-col h-full">
              {/* Post Header in Modal */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedPost.author.avatar_url || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {selectedPost.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {selectedPost.author.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(selectedPost.created_at)}
                    </p>
                  </div>
                </div>
                {selectedPost.caption && (
                  <p className="text-sm mt-2">{selectedPost.caption}</p>
                )}
              </div>

              {/* Comments List */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {commentsData[selectedPost.id]?.length ? (
                    commentsData[selectedPost.id].map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={comment.user?.avatar_url || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {comment.user?.name?.charAt(0) || "؟"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-sm">
                              {comment.user?.name || "مجهول"}
                            </span>
                            <span className="text-sm">{comment.comment}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(comment.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        لا توجد تعليقات بعد
                      </p>
                      <p className="text-xs text-muted-foreground">
                        كن أول من يعلق!
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Comment Input */}
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="أضف تعليقاً..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment(selectedPost.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleSubmitComment(selectedPost.id)}
                      disabled={!newComment.trim() || isSubmittingComment}
                      size="sm"
                      className="px-3"
                    >
                      {isSubmittingComment ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
