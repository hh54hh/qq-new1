import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowRight, Calendar, Heart } from "lucide-react";
import { User, Post } from "@shared/api";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/use-location";
import PostViewPage from "./PostViewPage";
import { PostCardSkeleton } from "@/components/ui/loading-skeleton";

interface SearchPageProps {
  user: User;
  onBack: () => void;
  onSelectBarber: (barber: any) => void;
}

type SortOption = "newest" | "rating" | "distance";

const sortOptions = [
  { value: "newest", label: "الأحدث", icon: "⏱" },
  { value: "rating", label: "الأفضل", icon: "⭐" },
  { value: "distance", label: "الأقرب", icon: "📍" },
];

// Real posts data loaded from API

export default function SearchPage({
  user,
  onBack,
  onSelectBarber,
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showPostView, setShowPostView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    minRating: 0,
    maxPrice: 0,
    radius: 50,
    services: [] as string[],
  });
  const { location: userLocation } = useLocation();

  // Load posts from API
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);

        // Check network connectivity first
        if (!navigator.onLine) {
          console.log("📱 No network connection, using offline mode");
          setPosts([]);
          setFilteredPosts([]);
          setLikedPosts(new Set());
          return;
        }

        const postsResponse = await apiClient.getPosts();
        const loadedPosts = postsResponse.posts || [];
        setPosts(loadedPosts);
        setFilteredPosts(loadedPosts);

        // Load user's liked posts
        try {
          const likesResponse = await apiClient.getUserLikes();
          setLikedPosts(new Set(likesResponse.liked_posts));
        } catch (error) {
          console.warn(
            "Failed to load user likes, continuing with empty set:",
            error,
          );
          setLikedPosts(new Set());
        }
      } catch (error) {
        const errorMessage = error?.message || "Unknown error";
        const isNetworkError =
          errorMessage.includes("fetch") ||
          errorMessage.includes("Failed to fetch") ||
          error?.name === "TypeError";

        console.error("Error loading posts:", {
          message: errorMessage,
          type: error?.name || "Unknown type",
          isNetworkError,
          details: error,
        });

        if (isNetworkError) {
          console.log("🌐 Network error detected, switching to offline mode");
        }

        // Always provide empty arrays to prevent UI breaking
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // فلترة المنشو��ات بناءً على البحث
  useEffect(() => {
    let filtered = [...posts];

    // فلترة بالاسم
    if (searchQuery.trim()) {
      filtered = filtered.filter((post) =>
        post.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // ترتيب المنشورات
    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "rating":
        filtered.sort((a, b) => (b.user?.level || 0) - (a.user?.level || 0));
        break;
      case "distance":
        // ترتيب عشوائي للمحاكاة - في التطبيق الحقيقي سيكون بناءً ��لى المسافة الفعلية
        filtered.sort(() => Math.random() - 0.5);
        break;
    }

    setFilteredPosts(filtered);
  }, [searchQuery, sortBy, posts]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 24) {
      return `منذ ${diffInHours} ساعة`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `منذ ${diffInDays} ${diffInDays === 1 ? "يوم" : "أيام"}`;
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠";
    if (level >= 80) return "🟡";
    if (level >= 60) return "🔹";
    return "🔸";
  };

  const handleLikePost = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      if (likedPosts.has(postId)) {
        await apiClient.unlikePost(postId);
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        // تحديث عدد الإعجابات في المنشورات
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes: Math.max(0, post.likes - 1) }
              : post,
          ),
        );
      } else {
        await apiClient.likePost(postId);
        setLikedPosts((prev) => new Set(prev).add(postId));
        // تحديث عدد الإعجابات ��ي المنشورات
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post,
          ),
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleBookNow = (barber: User) => {
    setSelectedPost(null);
    onSelectBarber({
      ...barber,
      rating: barber.level / 20, // تحويل المستوى إلى تقييم
      distance: userLocation ? 2.5 : null,
      price: 30,
      status: "متاح",
      isFollowed: false,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-base sm:text-lg font-bold text-foreground">
            استكشاف
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* شريط البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن حلاق..."
            className="pr-10 text-right"
          />
        </div>

        {/* فلتر الترتيب */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ترتيب حسب:</span>
          <Select
            value={sortBy}
            onValueChange={(value: SortOption) => setSortBy(value)}
          >
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* شبكة المنشورات */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <PostCardSkeleton />
                </div>
              ))
            : filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-card/50 border border-border/50"
                  onClick={() => {
                    setSelectedPost(post);
                    setShowPostView(true);
                  }}
                >
                  {/* الصورة */}
                  <img
                    src={post.image_url}
                    alt={post.caption}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* طبقة تمرير الماوس */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-4 text-white">
                      <button
                        onClick={(e) => handleLikePost(post.id, e)}
                        className="flex items-center gap-1 hover:scale-110 transition-transform"
                      >
                        <Heart
                          className={`h-4 w-4 ${likedPosts.has(post.id) ? "fill-red-500 text-red-500" : "fill-white"}`}
                        />
                        <span className="text-sm font-medium">
                          {post.likes || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* مؤشر نوع المنشور */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-black/50 text-white border-none"
                    >
                      {getLevelIcon(post.user.level)}
                    </Badge>
                  </div>
                </div>
              ))}
        </div>

        {/* رسالة عدم وجود نتائج */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا توجد منشورات
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "جرب البحث بكلمة أخرى"
                : "لا توجد منشورات متاحة حالياً"}
            </p>
          </div>
        )}
      </div>

      {/* Post View Page */}
      {showPostView && selectedPost && (
        <div className="fixed inset-0 z-50 bg-background">
          <PostViewPage
            post={selectedPost}
            user={user}
            isLiked={selectedPost ? likedPosts.has(selectedPost.id) : false}
            onBack={() => {
              setShowPostView(false);
              setSelectedPost(null);
            }}
            onLike={(postId) => {
              if (likedPosts.has(postId)) {
                setLikedPosts((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(postId);
                  return newSet;
                });
              } else {
                setLikedPosts((prev) => new Set(prev).add(postId));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
