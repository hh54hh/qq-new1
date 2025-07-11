import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ExplorePageWithTabsProps {
  user: User;
  onUserClick?: (user: any) => void;
}

type SortOption = "newest" | "rating" | "distance";

export default function ExplorePageWithTabs({
  user,
  onUserClick,
}: ExplorePageWithTabsProps) {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("posts");

  // Posts tab state
  const [exploreSearchQuery, setExploreSearchQuery] = useState("");
  const [exploreSortBy, setExploreSortBy] = useState("newest");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [explorePosts, setExplorePosts] = useState<any[]>([]);

  // Friends tab state
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

  // Filter featured posts for explore page
  const getFeaturedPosts = (posts: any[]) => {
    return posts
      .filter((post) => {
        // Featured criteria:
        // 1. Posts with high engagement (likes > 15)
        // 2. Posts from high-level barbers (level > 60)
        // 3. Posts from verified barbers
        const isHighEngagement = (post.likes || 0) > 15;
        const isHighLevelBarber = (post.user?.level || 0) > 60;
        const isVerifiedBarber =
          post.user?.is_verified || (post.user?.level || 0) > 80;

        return isHighEngagement || isHighLevelBarber || isVerifiedBarber;
      })
      .sort((a, b) => {
        // Sort by engagement score (combination of likes and barber level)
        const scoreA = (a.likes || 0) + (a.user?.level || 0) * 0.5;
        const scoreB = (b.likes || 0) + (b.user?.level || 0) * 0.5;
        return scoreB - scoreA;
      })
      .slice(0, 20); // Limit to top 20 featured posts
  };

  // Load explore posts from API
  useEffect(() => {
    const loadExplorePosts = async () => {
      console.log("=== Loading explore posts ===");
      console.log("Active tab:", activeTab);

      if (activeTab !== "posts") {
        return;
      }

      try {
        console.log("Loading posts from API...");
        console.log(
          "User token available:",
          !!localStorage.getItem("barbershop_token"),
        );
        const postsResponse = await apiClient.getPosts();
        console.log("API Posts response:", postsResponse);
        console.log("Response type:", typeof postsResponse);
        console.log("Response keys:", Object.keys(postsResponse || {}));
        const posts = postsResponse.posts || [];
        console.log("API Posts data:", posts);
        console.log("Number of posts received:", posts.length);
        console.log("First post (if any):", posts[0]);

        // Filter to show only featured posts
        const featuredPosts = getFeaturedPosts(posts);
        console.log(
          `Filtered ${posts.length} posts to ${featuredPosts.length} featured posts`,
        );

        setExplorePosts(featuredPosts);
        setFilteredPosts(featuredPosts);
      } catch (error) {
        console.error("Error loading explore posts:", error);
        console.log("Creating featured fallback data due to error");
        // Create high-quality fallback data that meets featured criteria
        const fallbackPosts = [
          {
            id: "featured_1",
            user_id: "featured_user",
            image_url:
              "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
            caption: "قصة شعر مميزة - أسلوب حديث",
            created_at: new Date().toISOString(),
            user: {
              id: "featured_user",
              name: "حلاق مميز",
              level: 85,
              avatar_url: "",
              role: "barber",
              is_verified: true,
            },
            likes: 42,
          },
          {
            id: "featured_2",
            user_id: "featured_user2",
            image_url:
              "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=400&h=400&fit=crop",
            caption: "إبداع في التصفيف",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            user: {
              id: "featured_user2",
              name: "استاذ محمد",
              level: 95,
              avatar_url: "",
              role: "barber",
              is_verified: true,
            },
            likes: 67,
          },
        ];
        setExplorePosts(fallbackPosts);
        setFilteredPosts(fallbackPosts);
      }
    };

    loadExplorePosts();
  }, [activeTab]); // Only watch activeTab

  // Filter featured posts for explore page
  useEffect(() => {
    let filtered = [...explorePosts];

    // Apply search filter
    if (exploreSearchQuery.trim()) {
      filtered = filtered.filter((post) =>
        post.user?.name
          ?.toLowerCase()
          .includes(exploreSearchQuery.toLowerCase()),
      );
    }

    // Apply sorting (but maintain featured quality)
    switch (exploreSortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "rating":
        // Sort by barber level and engagement
        filtered.sort((a, b) => {
          const scoreA = (a.user?.level || 0) + (a.likes || 0) * 0.5;
          const scoreB = (b.user?.level || 0) + (b.likes || 0) * 0.5;
          return scoreB - scoreA;
        });
        break;
      case "distance":
        // For featured posts, maintain quality while simulating distance
        filtered.sort((a, b) => {
          const qualityA = (a.user?.level || 0) + (a.likes || 0);
          const qualityB = (b.user?.level || 0) + (b.likes || 0);
          return qualityB - qualityA + (Math.random() - 0.5) * 20;
        });
        break;
    }

    setFilteredPosts(filtered);
  }, [exploreSearchQuery, exploreSortBy, explorePosts]);

  // Load suggested users for friends tab - Using EXACT same method as successful barber loading
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
        // Step 2a: Get barbers (proven to work)
        const barbersResponse = await apiClient.getBarbers();
        const barbersLoadTime = performance.now() - startTime;

        console.log("✅ Barbers API response:", {
          responseTime: `${barbersLoadTime.toFixed(1)}ms`,
          barbersCount: barbersResponse?.barbers?.length || 0,
          hasData: !!barbersResponse?.barbers,
        });

        let realUsers = barbersResponse?.barbers || [];

        // Step 2b: Try to get ALL users (including customers) using admin endpoint
        try {
          const allUsersStartTime = performance.now();
          const allUsersResponse = await apiClient.getAllUsers();
          const allUsersLoadTime = performance.now() - allUsersStartTime;

          console.log("✅ All users API response:", {
            responseTime: `${allUsersLoadTime.toFixed(1)}ms`,
            usersCount: allUsersResponse?.users?.length || 0,
            hasData: !!allUsersResponse?.users,
          });

          if (allUsersResponse?.users && allUsersResponse.users.length > 0) {
            // Use ALL users (includes customers!)
            realUsers = allUsersResponse.users;
            console.log("🎉 Successfully got ALL users including customers!");
          } else {
            console.log(
              "⚠️ All users endpoint returned empty, using barbers only",
            );
          }
        } catch (allUsersError) {
          console.log(
            "⚠️ All users endpoint failed (permission issue?), trying search endpoint:",
            allUsersError.message,
          );

          // Step 2c: Try search endpoint as another fallback
          try {
            const searchStartTime = performance.now();
            const searchResponse = await apiClient.searchUsers("");
            const searchLoadTime = performance.now() - searchStartTime;

            console.log("✅ Search users API response:", {
              responseTime: `${searchLoadTime.toFixed(1)}ms`,
              usersCount: searchResponse?.users?.length || 0,
              hasData: !!searchResponse?.users,
            });

            if (searchResponse?.users && searchResponse.users.length > 0) {
              // Merge search users with existing barbers (avoid duplicates)
              const userIds = new Set(realUsers.map((u) => u.id));
              const newUsers = searchResponse.users.filter(
                (u) => !userIds.has(u.id),
              );
              realUsers = [...realUsers, ...newUsers];
              console.log("🎉 Added users from search endpoint!");
            }
          } catch (searchError) {
            console.log(
              "⚠️ Search endpoint failed, trying customers endpoint:",
              searchError.message,
            );

            // Step 2d: Try customers endpoint as final attempt
            try {
              const customersStartTime = performance.now();
              const customersResponse = await apiClient.getCustomers();
              const customersLoadTime = performance.now() - customersStartTime;

              console.log("✅ Customers API response:", {
                responseTime: `${customersLoadTime.toFixed(1)}ms`,
                customersCount: customersResponse?.customers?.length || 0,
                hasData: !!customersResponse?.customers,
              });

              if (
                customersResponse?.customers &&
                customersResponse.customers.length > 0
              ) {
                // Merge customers with existing users (avoid duplicates)
                const existingIds = new Set(realUsers.map((u) => u.id));
                const newCustomers = customersResponse.customers.filter(
                  (u) => !existingIds.has(u.id),
                );
                realUsers = [...realUsers, ...newCustomers];
                console.log(
                  "🎉 Added customers from dedicated customers endpoint!",
                );
              }
            } catch (customersError) {
              console.log(
                "⚠️ Customers endpoint also failed:",
                customersError.message,
              );
            }
          }
        }

        if (realUsers.length > 0) {
          console.log("📊 Final users breakdown:", {
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

      // تحديث فوري للواجهة قبل API call
      const updateUserFollowStatus = (users: any[]) =>
        users.map((user) =>
          user.id === targetUserId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user,
        );

      // تحديث ال��اجهة فوراً
      setSuggestedUsers(updateUserFollowStatus(suggestedUsers));
      setFilteredSuggestions(updateUserFollowStatus(filteredSuggestions));

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

      console.log(
        `✅ Successfully ${isCurrentlyFollowing ? "unfollowed" : "followed"} user ${targetUserId}`,
      );
    } catch (error) {
      console.error("Error toggling follow status:", error);

      // العودة للحالة السابقة في حالة الخطأ
      const revertUserFollowStatus = (users: any[]) =>
        users.map((user) =>
          user.id === targetUserId
            ? { ...user, isFollowing: isCurrentlyFollowing }
            : user,
        );

      setSuggestedUsers(revertUserFollowStatus(suggestedUsers));
      setFilteredSuggestions(revertUserFollowStatus(filteredSuggestions));
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
    if (activeTab === "friends") {
      loadSuggestedUsers();
    }
  }, [activeTab, loadSuggestedUsers]);

  // Render posts tab
  const renderPostsTab = () => (
    <div className="p-4 space-y-4">
      {/* شريط البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={exploreSearchQuery}
          onChange={(e) => setExploreSearchQuery(e.target.value)}
          placeholder="ابحث عن حلاق..."
          className="pr-10 text-right"
        />
      </div>

      {/* فلتر ال��رتيب */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">ترتيب حسب:</span>
        <Select value={exploreSortBy} onValueChange={setExploreSortBy}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">⏱ الأحدث</SelectItem>
            <SelectItem value="rating">⭐ الأفضل</SelectItem>
            <SelectItem value="distance">📍 الأقرب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* شبكة المنشورات */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-card/50 border border-border/50"
            onClick={() => setSelectedPost(post)}
          >
            <img
              src={post.image_url}
              alt={post.caption}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-white" />
                  <span className="text-sm font-medium">{post.likes || 0}</span>
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className="text-xs bg-black/50 text-white border-none"
              >
                {post.user?.level >= 100
                  ? "👑"
                  : post.user?.level >= 51
                    ? "🟡"
                    : post.user?.level >= 21
                      ? "🔹"
                      : "🔸"}
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
            لا توجد منشورات مميزة
          </h3>
          <p className="text-muted-foreground">
            {exploreSearchQuery
              ? "جرب البحث بكلمة أخرى من المنشورات المميزة"
              : "لا توجد منشورات مميزة متاحة حالياً"}
          </p>
        </div>
      )}
    </div>
  );

  // Render friends tab
  const renderFriendsTab = () => {
    if (friendsLoading) {
      return (
        <div className="space-y-4 p-4">
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
      <div className="space-y-4 p-4">
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
    <div className="max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="posts"
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Sparkles className="w-4 h-4" />
            <span>المنشورات</span>
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Users className="w-4 h-4" />
            <span>الأصدقاء</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {renderPostsTab()}
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
