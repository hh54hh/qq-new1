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
} from "lucide-react";
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
      const likedIds = new Set(
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

      // Start background sync for fresh data
      postsCache.startBackgroundSync();
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
    },
  ];

  // Handle post like/unlike with cache update
  const handleLike = async (postId: string) => {
    try {
      const isCurrentlyLiked = likedPosts.has(postId);

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

  // Load posts on mount and listen for updates
  useEffect(() => {
    loadPostsUltraFast();

    // Listen for posts updates from background sync
    const handlePostsUpdate = (event: CustomEvent) => {
      const { posts: updatedPosts, userId } = event.detail;
      if (userId === user.id) {
        console.log("📱 Posts updated from background sync");
        setPosts(updatedPosts);
        setPostsFromCache(true);
        setLoading(false);

        // Update liked posts state
        const likedIds = new Set(
          updatedPosts
            .filter((p: PostType) => p.isLiked)
            .map((p: PostType) => p.id),
        );
        setLikedPosts(likedIds);

        // Show brief refresh indicator
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
      }
    };

    window.addEventListener("postsUpdated", handlePostsUpdate as EventListener);

    return () => {
      window.removeEventListener(
        "postsUpdated",
        handlePostsUpdate as EventListener,
      );
      // Cleanup cache when component unmounts
      const postsCache = getPostsCache(user.id);
      postsCache.stopBackgroundSync();
    };
  }, [loadPostsUltraFast, user.id]);

  // Loading skeleton
  if (loading && posts.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-background min-h-screen">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stories Skeleton */}
        <div className="p-4 border-b">
          <div className="flex space-x-4 space-x-reverse overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-muted rounded-full animate-pulse mb-2"></div>
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
              <div className="p-4 space-y-3">
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
    <div className="w-full max-w-md mx-auto bg-background min-h-screen relative">
      {/* Mobile PWA optimizations */}
      <div className="safe-area-top"></div>
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
        <div className="flex space-x-4 space-x-reverse overflow-x-auto pb-2">
          {/* Add Your Story */}
          <div className="flex-shrink-0 text-center">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-dashed border-muted-foreground">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <p className="text-xs mt-1 truncate w-16">إضافة</p>
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
              <Avatar className="w-16 h-16 border-2 border-gradient-to-r from-pink-500 to-orange-500 p-0.5">
                <AvatarImage src={story.avatar} className="rounded-full" />
                <AvatarFallback>{story.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-xs mt-1 truncate w-16">{story.name}</p>
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
              <div className="flex items-center justify-between p-4">
                <div
                  className="flex items-center space-x-3 space-x-reverse cursor-pointer"
                  onClick={() => onUserClick?.(post.author)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={post.author.avatar_url || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {post.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <p className="font-semibold text-sm">
                        {post.author.name}
                      </p>
                      {post.author.is_verified && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(post.created_at)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Post Image */}
              <div className="aspect-square bg-muted">
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4">
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
                          "w-6 h-6 transition-all duration-200",
                          post.isLiked
                            ? "fill-red-500 text-red-500 scale-110"
                            : "text-foreground hover:text-muted-foreground",
                        )}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className="p-0 h-auto">
                      <MessageCircle className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="p-0 h-auto">
                      <Send className="w-6 h-6" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="p-0 h-auto">
                    <Bookmark className="w-6 h-6" />
                  </Button>
                </div>

                {/* Likes Count */}
                <p className="font-semibold text-sm mb-1">{post.likes} إعجاب</p>

                {/* Caption */}
                {post.caption && (
                  <div className="text-sm">
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
                    className="p-0 h-auto text-muted-foreground text-sm mt-1"
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
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          جاري التحديث...
        </div>
      )}
    </div>
  );
}
