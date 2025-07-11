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

interface InstagramNewsFeedProps {
  user: User;
  onUserClick?: (user: any) => void;
}

// Types for posts
interface PostType {
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
}

export default function InstagramNewsFeed({
  user,
  onUserClick,
}: InstagramNewsFeedProps) {
  const [state, store] = useAppStore();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Cache key for posts
  const CACHE_KEY = `instagram_posts_${user.id}`;
  const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

  // Load posts with cache-first approach
  const loadPosts = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!forceRefresh) {
          // Try cache first
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const parsedCache = JSON.parse(cached);
              if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
                console.log("📱 Loading posts from cache");
                setPosts(parsedCache.data);
                setLoading(false);

                // Load likes state
                const likedIds = new Set(
                  parsedCache.data
                    .filter((p: PostType) => p.isLiked)
                    .map((p: PostType) => p.id),
                );
                setLikedPosts(likedIds);

                // Still fetch in background for updates
                setTimeout(() => loadPosts(true), 1000);
                return;
              }
            } catch (e) {
              console.warn("Failed to parse cached posts");
            }
          }
        }

        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        // Get following list
        const followingResponse = await apiClient.getFollows("following");
        const followingIds =
          followingResponse.follows?.map((f: any) => f.followed_id) || [];

        if (followingIds.length === 0) {
          // Show demo content if not following anyone
          const demoPosts = createDemoPosts();
          setPosts(demoPosts);

          // Cache demo posts
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: demoPosts,
              timestamp: Date.now(),
            }),
          );

          setLoading(false);
          setRefreshing(false);
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
          }))
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        // Get user's liked posts
        try {
          const likesResponse = await apiClient.getUserLikes();
          const userLikedPostIds = new Set(likesResponse.liked_posts || []);

          // Update posts with like status
          followedPosts.forEach((post) => {
            post.isLiked = userLikedPostIds.has(post.id);
          });

          setLikedPosts(userLikedPostIds);
        } catch (error) {
          console.warn("Could not load user likes:", error);
        }

        setPosts(followedPosts);

        // Cache the results
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: followedPosts,
            timestamp: Date.now(),
          }),
        );

        console.log(
          `✅ Loaded ${followedPosts.length} posts from ${followingIds.length} followed users`,
        );
      } catch (error) {
        console.error("Error loading posts:", error);

        // Try to use cached data as fallback
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached && !forceRefresh) {
          try {
            const parsedCache = JSON.parse(cached);
            setPosts(parsedCache.data);
            console.log("📱 Using cached posts as fallback");
          } catch (e) {
            // If cache fails, show demo posts
            setPosts(createDemoPosts());
          }
        } else {
          setPosts(createDemoPosts());
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.id, CACHE_KEY],
  );

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

  // Handle post like/unlike
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

      // API call
      if (isCurrentlyLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }

      // Update cache
      const currentPosts = JSON.parse(
        localStorage.getItem(CACHE_KEY) || '{"data": []}',
      );
      const updatedPosts = currentPosts.data.map((post: PostType) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !isCurrentlyLiked,
              likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      );
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: updatedPosts,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (likedPosts.has(postId)) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
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

  // Load posts on mount and set up background sync
  useEffect(() => {
    loadPosts();

    // Background sync every 30 seconds
    const interval = setInterval(() => {
      loadPosts(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPosts]);

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
              <div className="flex items-center justify-between p-4">
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
    <div className="max-w-md mx-auto bg-background min-h-screen">
      {/* Instagram-style Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 py-3">
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
      <div className="p-4 border-b bg-background">
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
