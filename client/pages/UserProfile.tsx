import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Star,
  MapPin,
  Users,
  Calendar,
  Scissors,
  Heart,
  Edit,
  UserPlus,
  UserMinus,
  MessageCircle,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import networkAwareAPI from "@/lib/api-wrapper";
import PostViewPage from "./PostViewPage";
import { useNavigate } from "react-router-dom";

interface UserProfileProps {
  profileUser: User & {
    rating?: number;
    distance?: number;
    followers?: number;
    following?: number;
    posts?: number;
    bookings?: number;
    isFollowed?: boolean;
  };
  currentUser: User;
  onBack: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onBooking?: () => void;
  onMessage?: () => void;
  onStartChat?: (userId: string, userName: string) => void;
}

export default function UserProfile({
  profileUser,
  currentUser,
  onBack,
  onFollow,
  onUnfollow,
  onBooking,
  onMessage,
  onStartChat,
}: UserProfileProps) {
  const [state, store] = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(
    profileUser.isFollowed || false,
  );
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showPostView, setShowPostView] = useState(false);

  useEffect(() => {
    loadUserPosts();
    loadUserStats();
    checkFollowStatus();
  }, [profileUser.id]);

  // تحديث حالة المتابعة عند تغيير البيانات
  useEffect(() => {
    setIsFollowing(profileUser.isFollowed || false);
  }, [profileUser.isFollowed]);

  // تحديث حالة المتابعة من store
  useEffect(() => {
    checkFollowStatus();
  }, [state.follows, profileUser.id]);

  const checkFollowStatus = async () => {
    try {
      // تحقق من حالة المتابعة من store أولاً
      const isFollowingFromStore = state.follows?.some(
        (follow: any) => follow.followed_id === profileUser.id,
      );

      if (isFollowingFromStore !== undefined) {
        setIsFollowing(isFollowingFromStore);
        return;
      }

      // إذا لم نجد في store، تحقق من API
      const followingResponse = await networkAwareAPI.safeRequest(
        () => apiClient.getFollows("following"),
        { follows: [], total: 0 },
      );

      const isFollowingFromAPI =
        followingResponse.follows?.some(
          (follow: any) => follow.followed_id === profileUser.id,
        ) || false;

      setIsFollowing(isFollowingFromAPI);
      console.log(
        `🔍 Follow status for ${profileUser.name}: ${isFollowingFromAPI}`,
      );
    } catch (error) {
      console.error("Error checking follow status:", error);
      // العودة للقيمة الممررة
      setIsFollowing(profileUser.isFollowed || false);
    }
  };

  const loadUserStats = async () => {
    setIsLoadingStats(true);

    // Use safe network-aware API calls - they handle errors gracefully
    const followersResponse = await networkAwareAPI.safeRequest(
      () => apiClient.getFollows("followers"),
      { follows: [], total: 0 },
    );
    const followingResponse = await networkAwareAPI.safeRequest(
      () => apiClient.getFollows("following"),
      { follows: [], total: 0 },
    );

    setFollowerCount(followersResponse?.total || 0);
    setFollowingCount(followingResponse?.total || 0);
    console.log("📈 User stats loaded:", {
      followers: followersResponse?.total || 0,
      following: followingResponse?.total || 0,
    });

    setIsLoadingStats(false);
  };

  const loadUserPosts = async () => {
    setIsLoadingPosts(true);

    try {
      // Use safe network-aware API call - it handles errors gracefully
      const response = await networkAwareAPI.getPosts();

      const userSpecificPosts = (response?.posts || []).filter(
        (post) => post.user_id === profileUser.id,
      );
      setUserPosts(userSpecificPosts);
      console.log(
        `📝 Loaded ${userSpecificPosts.length} posts for user ${profileUser.name}`,
      );
    } catch (error) {
      console.error("Error loading user posts:", {
        message: error?.message || "Unknown error",
        type: error?.name || "Unknown type",
        isNetworkError:
          error?.message?.includes("fetch") || error?.name === "TypeError",
        isOnline: navigator.onLine,
        userId: profileUser.id,
      });

      // Fallback to empty array to prevent UI breaking
      setUserPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "ال���ن";
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "أمس";
    if (diffInDays < 7) return `منذ ${diffInDays} أ��ام`;

    return date.toLocaleDateString("ar-SA");
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠";
    if (level >= 51) return "🟡";
    if (level >= 21) return "🔹";
    return "��";
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "ذهبي";
    if (level >= 21) return "مح��رف";
    return "م��تدئ";
  };

  const handleFollowToggle = async () => {
    const previousState = isFollowing;

    try {
      setIsFollowing(!isFollowing);

      if (isFollowing) {
        await networkAwareAPI.safeRequest(() =>
          apiClient.unfollowUser(profileUser.id),
        );

        // حدف من store
        const updatedFollows =
          state.follows?.filter(
            (follow: any) => follow.followed_id !== profileUser.id,
          ) || [];
        store.setFollows(updatedFollows);

        onUnfollow?.();
      } else {
        await networkAwareAPI.safeRequest(() =>
          apiClient.followUser(profileUser.id),
        );

        // إضافة لـ store
        const newFollow = {
          id: Date.now().toString(),
          follower_id: currentUser.id,
          followed_id: profileUser.id,
          created_at: new Date().toISOString(),
        };
        const updatedFollows = [...(state.follows || []), newFollow];
        store.setFollows(updatedFollows);

        onFollow?.();
      }

      store.addNotification({
        id: Date.now().toString(),
        type: isFollowing ? "friend_request" : "new_follower",
        title: isFollowing ? "إلغاء ��لمتابعة" : "متاب��ة جديدة",
        message: isFollowing
          ? `تم إلغاء متابعة ${profileUser.name}`
          : `تتابع الآن ${profileUser.name}`,
        data: { userId: profileUser.id },
        read: false,
        created_at: new Date().toISOString(),
      });

      console.log(
        `✅ Successfully ${isFollowing ? "unfollowed" : "followed"} ${profileUser.name}`,
      );
    } catch (error) {
      setIsFollowing(previousState);
      console.error("Error toggling follow:", error);
    }
  };

  const handleLikePost = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      if (likedPosts.has(postId)) {
        await networkAwareAPI.safeRequest(() => apiClient.unlikePost(postId));
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setUserPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) }
              : post,
          ),
        );
      } else {
        await networkAwareAPI.safeRequest(() => apiClient.likePost(postId));
        setLikedPosts((prev) => new Set(prev).add(postId));
        setUserPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes: (post.likes || 0) + 1 }
              : post,
          ),
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // دالة بدء المحادثة
  const handleStartChat = () => {
    if (!profileUser?.id || !profileUser?.name) {
      console.error("معلومات المستخدم مفقودة");
      return;
    }

    // إنشاء معاملات URL للمحادثة
    const chatParams = new URLSearchParams({
      with: profileUser.id,
      name: profileUser.name,
      role: profileUser.role || "user",
    });

    // إضافة الصورة الرمزية إذ�� توفرت
    if (profileUser.avatar_url) {
      chatParams.set("avatar", profileUser.avatar_url);
    }

    // التنقل إلى صفحة المحادثة
    navigate(`/chat?${chatParams.toString()}`);

    console.log(`💬 فتح محادثة مع ${profileUser.name}`);

    // استدعاء دالة onStartChat إذا كانت متاحة
    if (onStartChat) {
      onStartChat(profileUser.id, profileUser.name);
    }
  };

  // إذا كانت صفحة عرض ال��نشور مفتوحة
  if (showPostView && selectedPost) {
    return (
      <PostViewPage
        post={selectedPost}
        user={currentUser}
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{profileUser.name}</h1>
            <p className="text-sm text-muted-foreground">
              {profileUser.role === "barber" ? "حلاق" : "عميل"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* معلومات الملف الشخصي */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileUser.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profileUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">{profileUser.name}</h2>
                  <span>{getLevelIcon(profileUser.level)}</span>
                  {profileUser.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      موثق
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{followerCount} متابع</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Scissors className="h-4 w-4" />
                    <span>{userPosts.length} منشور</span>
                  </div>
                  {profileUser.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{profileUser.rating}</span>
                    </div>
                  )}
                </div>

                {profileUser.distance && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{profileUser.distance} كم</span>
                  </div>
                )}
              </div>
            </div>

            {/* أزرار التفاعل */}
            {profileUser.id !== currentUser.id && (
              <div className="space-y-3">
                {/* الص�� الأول: متابعة ومحادثة */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "outline" : "default"}
                    className="flex-1"
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        إلغاء المتابعة
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        متابعة
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleStartChat}
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    محادثة
                  </Button>
                </div>

                {/* الصف الثاني: حجز موعد (للحلاقين فقط) */}
                {profileUser.role === "barber" && (
                  <Button
                    variant="outline"
                    onClick={onBooking}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    حجز موعد
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        {profileUser.role === "barber" && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts">المنشورات</TabsTrigger>
              <TabsTrigger value="info">ال��علومات</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="posts">
                {isLoadingPosts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-muted rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-card/50 border border-border/50 transition-transform hover:scale-105"
                        onClick={() => {
                          setSelectedPost(post);
                          setShowPostView(true);
                        }}
                      >
                        <img
                          src={post.image_url || "/placeholder.svg"}
                          alt="Post"
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />

                        {/* طبقة التمرير */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center gap-4 text-white">
                            <button
                              onClick={(e) => handleLikePost(post.id, e)}
                              className="flex items-center gap-1 hover:scale-110 transition-transform"
                            >
                              <Heart
                                className={`h-5 w-5 ${likedPosts.has(post.id) ? "fill-red-500 text-red-500" : "fill-white"}`}
                              />
                              <span className="text-sm font-medium">
                                {post.likes || 0}
                              </span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Edit className="h-5 w-5 fill-white" />
                              <span className="text-sm font-medium">0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="border-border/50 bg-card/50">
                    <CardContent className="p-8 text-center">
                      <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        لا توجد منشورات
                      </h3>
                      <p className="text-muted-foreground">
                        لم يقم هذا الحلاق بنشر أي أعمال بعد
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="info">
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>معلومات الحلاق</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الخبرة:</span>
                      <span className="font-medium">
                        {getLevelLabel(profileUser.level)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">النقاط:</span>
                      <span className="font-medium text-primary">
                        {profileUser.points}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">التقييم:</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {profileUser.rating || "0"}
                        </span>
                      </div>
                    </div>
                    {profileUser.distance && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">المسافة:</span>
                        <span className="font-medium">
                          {profileUser.distance} كم
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        حالة الحساب:
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-500 border-green-500/20"
                      >
                        {profileUser.is_verified ? "مو��ق" : "غير موثق"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Customer profile content */}
        {profileUser.role === "customer" && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>معلومات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد الحجوزات:</span>
                <span className="font-medium text-primary">
                  {profileUser.bookings || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تاريخ التسجيل:</span>
                <span className="font-medium">
                  {new Date(profileUser.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">حالة الحساب:</span>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  نشط
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
