import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Star,
  Clock,
  UserPlus,
  UserMinus,
  Search,
  TrendingUp,
  Sparkles,
  Users,
  Scissors,
} from "lucide-react";
import { User, UserRole } from "@shared/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";

interface HomePageProps {
  user: User;
  onUserClick?: (user: any) => void;
}

export default function HomePageSimple({ user, onUserClick }: HomePageProps) {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("news");

  // News tab state
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Friends tab state
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

  // Create quality user suggestions
  const createQualitySuggestions = useCallback(() => {
    return [
      {
        id: "quality-barber-1",
        name: "أحمد الخبير",
        email: "ahmed.expert@example.com",
        role: "barber",
        avatar_url: "/placeholder.svg",
        shop_name: "حلاقة النجوم",
        location: "الرياض",
        level: 85,
        rating: 4.9,
        status: "active",
        is_verified: true,
        points: 1500,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-customer-1",
        name: "محمد العميل",
        email: "mohamed.client@example.com",
        role: "customer",
        avatar_url: "/placeholder.svg",
        location: "جدة",
        level: 30,
        status: "active",
        is_verified: false,
        points: 300,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-barber-2",
        name: "سعد الماهر",
        email: "saad.skilled@example.com",
        role: "barber",
        avatar_url: "/placeholder.svg",
        shop_name: "صالون الفخامة",
        location: "الدمام",
        level: 70,
        rating: 4.7,
        status: "active",
        is_verified: true,
        points: 1000,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-customer-2",
        name: "خالد الزبون",
        email: "khalid.customer@example.com",
        role: "customer",
        avatar_url: "/placeholder.svg",
        location: "مكة المكرمة",
        level: 20,
        status: "active",
        is_verified: false,
        points: 200,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-barber-3",
        name: "عبدالله المتميز",
        email: "abdullah.special@example.com",
        role: "barber",
        avatar_url: "/placeholder.svg",
        shop_name: "حلاقة الملك",
        location: "المدينة المنورة",
        level: 95,
        rating: 5.0,
        status: "active",
        is_verified: true,
        points: 2000,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-customer-3",
        name: "فيصل المميز",
        email: "faisal.premium@example.com",
        role: "customer",
        avatar_url: "/placeholder.svg",
        location: "الطائف",
        level: 45,
        status: "active",
        is_verified: true,
        points: 450,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-barber-4",
        name: "ياسر الحرفي",
        email: "yasser.craftsman@example.com",
        role: "barber",
        avatar_url: "/placeholder.svg",
        shop_name: "ورشة الإبداع",
        location: "أبها",
        level: 65,
        rating: 4.6,
        status: "active",
        is_verified: true,
        points: 900,
        created_at: new Date().toISOString(),
      },
      {
        id: "quality-customer-4",
        name: "نايف العضو",
        email: "naif.member@example.com",
        role: "customer",
        avatar_url: "/placeholder.svg",
        location: "تبوك",
        level: 35,
        status: "active",
        is_verified: false,
        points: 350,
        created_at: new Date().toISOString(),
      },
    ];
  }, []);

  // Load news posts from followed users
  const loadNewsPosts = useCallback(async () => {
    if (!user?.id) return;

    setNewsLoading(true);
    try {
      console.log("🔄 Loading news posts...");

      // Get following list
      let followingIds = [];
      try {
        const followingResponse = await apiClient.getFollows("following");
        followingIds =
          followingResponse.follows?.map((f: any) => f.followed_id) || [];
      } catch (error) {
        console.warn("Could not get following list:", error.message);
      }

      if (followingIds.length === 0) {
        console.log("User is not following anyone, showing empty news feed");
        setNewsPosts([]);
        return;
      }

      // Get posts
      const postsResponse = await apiClient.getPosts();
      const allPosts = postsResponse.posts || [];

      // Get users for author data
      let allUsers = [];
      try {
        const barbersResponse = await apiClient.getBarbers();
        allUsers = barbersResponse.barbers || [];
      } catch (error) {
        console.warn("Could not get users for posts:", error.message);
      }

      // Create user lookup map
      const userMap = new Map();
      allUsers.forEach((user: any) => {
        userMap.set(user.id, user);
      });

      // Enrich posts with user data and filter by followed users
      const enrichedPosts = allPosts.map((post: any) => ({
        ...post,
        author:
          post.user || userMap.get(post.user_id) || userMap.get(post.author_id),
        user_name:
          post.user?.name ||
          userMap.get(post.user_id)?.name ||
          userMap.get(post.author_id)?.name ||
          "مستخدم مجهول",
      }));

      // Filter posts from followed users
      const newsFeeds = enrichedPosts.filter(
        (post: any) =>
          followingIds.includes(post.user_id) ||
          followingIds.includes(post.author_id),
      );

      // Sort by date (newest first)
      newsFeeds.sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.createdAt || "").getTime() -
          new Date(a.created_at || a.createdAt || "").getTime(),
      );

      console.log(
        `✅ Found ${newsFeeds.length} posts from ${followingIds.length} followed users`,
      );
      setNewsPosts(newsFeeds);
    } catch (error) {
      console.error("Error loading news posts:", error);
      setNewsPosts([]);
    } finally {
      setNewsLoading(false);
    }
  }, [user?.id]);

  // Load suggested users - Using EXACT same method as successful barber loading
  const loadSuggestedUsers = useCallback(async () => {
    if (!user?.id) return;

    setFriendsLoading(true);
    console.log(
      "🔄 Loading user suggestions using proven barber loading method...",
    );

    try {
      // Step 1: Get following list (same as working code)
      let followingIds = [];
      try {
        const followingResponse = await apiClient.getFollows("following");
        followingIds =
          followingResponse.follows?.map((f: any) => f.followed_id) || [];
        console.log("📋 Following list:", followingIds.length, "users");
      } catch (error) {
        console.warn("⚠️ Could not get following list:", error.message);
      }

      // Step 2: Get real users using EXACT same method as working barber loading
      console.log("📡 Fetching users using proven getBarbers method...");
      const startTime = performance.now();

      try {
        // Use the exact same API call that works for barbers
        const response = await apiClient.getBarbers();
        const loadTime = performance.now() - startTime;

        console.log("✅ API response received:", {
          responseTime: `${loadTime.toFixed(1)}ms`,
          usersCount: response?.barbers?.length || 0,
          hasData: !!response?.barbers,
        });

        const realUsers = response?.barbers || [];

        if (realUsers.length > 0) {
          console.log("📊 Real users breakdown:", {
            total: realUsers.length,
            customers: realUsers.filter((u) => u.role === "customer").length,
            barbers: realUsers.filter((u) => u.role === "barber").length,
            admins: realUsers.filter((u) => u.role === "admin").length,
          });

          // Normalize user structure (add missing fields for UI compatibility)
          const normalizedUsers = realUsers.map((user: any) => ({
            ...user,
            shop_name: user.shop_name || user.business_name || "",
            rating: user.rating || 0,
            location: user.location || user.address || "",
          }));

          // Filter out self and already followed users
          const suggestions = normalizedUsers.filter(
            (suggestedUser: any) =>
              suggestedUser.id !== user.id &&
              !followingIds.includes(suggestedUser.id),
          );

          // Sort exactly like the working barber code
          suggestions.sort((a: any, b: any) => {
            // Verified users first
            if (a.is_verified && !b.is_verified) return -1;
            if (b.is_verified && !a.is_verified) return 1;

            // Barbers second
            if (a.role === "barber" && b.role !== "barber") return -1;
            if (b.role === "barber" && a.role !== "barber") return 1;

            // Then by level
            return (b.level || 0) - (a.level || 0);
          });

          console.log("✅ Final suggestions processed:", {
            total: suggestions.length,
            customers: suggestions.filter((u) => u.role === "customer").length,
            barbers: suggestions.filter((u) => u.role === "barber").length,
          });

          setSuggestedUsers(suggestions);
          setFilteredSuggestions(suggestions);
          return; // Success - exit function
        } else {
          console.log("⚠️ API returned empty users array");
        }
      } catch (error) {
        console.error("❌ API call failed:", error);
      }

      // If we reach here, API failed or returned empty - show message
      console.log("📝 No real users available - API may be down or empty");
      setSuggestedUsers([]);
      setFilteredSuggestions([]);
    } catch (error) {
      console.error("❌ Critical error in loadSuggestedUsers:", error);
      setSuggestedUsers([]);
      setFilteredSuggestions([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [user?.id]);

  // Handle follow/unfollow
  const handleFollowToggle = async (
    targetUserId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    try {
      console.log(
        `${isCurrentlyFollowing ? "Unfollowing" : "Following"} user:`,
        targetUserId,
      );

      if (isCurrentlyFollowing) {
        await apiClient.unfollowUser(targetUserId);
        const updatedFollows =
          state.follows?.filter(
            (follow: any) => follow.followed_id !== targetUserId,
          ) || [];
        store.setFollows(updatedFollows);
      } else {
        await apiClient.followUser(targetUserId);
        const newFollow = {
          id: Date.now().toString(),
          follower_id: user.id,
          followed_id: targetUserId,
          created_at: new Date().toISOString(),
        };
        const updatedFollows = [...(state.follows || []), newFollow];
        store.setFollows(updatedFollows);
      }

      // Refresh data
      if (activeTab === "friends") {
        await loadSuggestedUsers();
      }
      if (activeTab === "news") {
        await loadNewsPosts();
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  };

  // Handle post like
  const handlePostLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }

      setNewsPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !currentlyLiked,
                likes: currentlyLiked
                  ? (post.likes || 1) - 1
                  : (post.likes || 0) + 1,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error toggling post like:", error);
    }
  };

  // Filter suggestions based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSuggestions(suggestedUsers);
    } else {
      const filtered = suggestedUsers.filter(
        (user: any) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredSuggestions(filtered);
    }
  }, [searchQuery, suggestedUsers]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "news") {
      loadNewsPosts();
    } else if (activeTab === "friends") {
      loadSuggestedUsers();
    }
  }, [activeTab, loadNewsPosts, loadSuggestedUsers]);

  // Render news tab
  const renderNewsTab = () => {
    if (newsLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (newsPosts.length === 0) {
      return (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد أخبار حتى الآن</h3>
          <p className="text-muted-foreground">
            ابدأ بمتابعة بعض الحلاقين لرؤية منشوراتهم هنا
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setActiveTab("friends")}
          >
            استكشف الأصدقاء
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {newsPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center space-x-3 space-x-reverse cursor-pointer hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors"
                  onClick={() => {
                    if (onUserClick) {
                      const userToShow = post.author || {
                        id: post.user_id || post.author_id,
                        name: post.user_name || "مستخدم مجهول",
                        avatar_url: post.author?.avatar_url,
                        role: post.author?.role || "customer",
                      };
                      onUserClick(userToShow);
                    }
                  }}
                >
                  <Avatar>
                    <AvatarImage
                      src={post.author?.avatar_url || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {post.author?.name?.charAt(0) ||
                        post.user_name?.charAt(0) ||
                        "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {post.author?.name || post.user_name || "مستخدم مجهول"}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(
                          post.created_at || post.createdAt || "",
                        ).toLocaleDateString("ar")}
                      </span>
                      {post.author?.role === "barber" && (
                        <>
                          <span>•</span>
                          <Badge
                            variant="secondary"
                            className="text-xs px-1 py-0"
                          >
                            حلاق
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {post.content && (
                <p className="text-sm mb-3 leading-relaxed">{post.content}</p>
              )}
              {post.image_url && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img
                    src={post.image_url}
                    alt="منشور"
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-muted-foreground hover:text-red-500 transition-colors",
                      post.isLiked && "text-red-500",
                    )}
                    onClick={() =>
                      handlePostLike(post.id, post.isLiked || false)
                    }
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4 ml-1 transition-all",
                        post.isLiked && "fill-current scale-110",
                      )}
                    />
                    <span className="font-medium">{post.likes || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <MessageCircle className="w-4 h-4 ml-1" />
                    <span>{post.comments_count || 0}</span>
                  </Button>
                </div>
                {(post.author?.location || post.location) && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 ml-1" />
                    <span className="truncate max-w-32">
                      {post.author?.location || post.location}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render friends tab
  const renderFriendsTab = () => {
    if (friendsLoading) {
      return (
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded animate-pulse"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="ابحث عن أشخاص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Suggestions Header */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">اقتراحات لك</h3>
        </div>

        {/* User Suggestions */}
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              {searchQuery
                ? "لا توجد نتائج للبحث"
                : "لا توجد اقتراحات متاحة حالياً"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mb-3">
                افتح Developer Console (F12) لمراقبة عملية جلب البيانات
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearchQuery("");
                loadSuggestedUsers();
              }}
            >
              إعادة تحميل البيانات
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map((suggestedUser) => {
              const isFollowing = state.follows?.some(
                (follow: any) => follow.followed_id === suggestedUser.id,
              );

              return (
                <Card
                  key={suggestedUser.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center space-x-3 space-x-reverse cursor-pointer flex-1 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => {
                          if (onUserClick) {
                            onUserClick(suggestedUser);
                          }
                        }}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={suggestedUser.avatar_url || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {suggestedUser.name?.charAt(0) || "؟"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <p className="font-semibold text-sm truncate">
                              {suggestedUser.name || "مستخدم مجهول"}
                            </p>

                            {suggestedUser.role === "barber" && (
                              <Badge variant="secondary" className="text-xs">
                                <Scissors className="w-3 h-3 ml-1" />
                                حلاق
                              </Badge>
                            )}

                            {(suggestedUser.level || 0) > 50 && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 ml-1" />
                                {suggestedUser.level}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            {suggestedUser.shop_name && (
                              <span className="truncate max-w-36">
                                {suggestedUser.shop_name}
                              </span>
                            )}

                            {suggestedUser.location && (
                              <>
                                {suggestedUser.shop_name && (
                                  <span className="mx-1">•</span>
                                )}
                                <MapPin className="w-3 h-3 ml-1" />
                                <span className="truncate max-w-24">
                                  {suggestedUser.location}
                                </span>
                              </>
                            )}

                            {suggestedUser.role === "barber" &&
                              suggestedUser.rating && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Star className="w-3 h-3 ml-1 fill-yellow-400 text-yellow-400" />
                                  <span>{suggestedUser.rating.toFixed(1)}</span>
                                </>
                              )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={() =>
                          handleFollowToggle(suggestedUser.id, isFollowing)
                        }
                        className="shrink-0"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="w-4 h-4 ml-1" />
                            إلغاء المتابعة
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 ml-1" />
                            متابعة
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="news"
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Sparkles className="w-4 h-4" />
            <span>الأخبار</span>
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Users className="w-4 h-4" />
            <span>الأصدقاء</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {renderNewsTab()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="friends">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {renderFriendsTab()}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
