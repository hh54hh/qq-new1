import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getChatCache } from "@/lib/chat-cache";

interface HomePageProps {
  user: User;
  onUserClick?: (user: any) => void;
}

export default function HomePage({ user, onUserClick }: HomePageProps) {
  const [state, store] = useAppStore();
  const [activeTab, setActiveTab] = useState("news");

  // News tab state
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Friends tab state
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

  // Load news posts from followed users only
  const loadNewsPosts = useCallback(async () => {
    if (!user?.id) return;

    setNewsLoading(true);
    try {
      console.log("Loading news posts from followed users...");

      // Try to load from cache first
      const cacheKey = `news_posts_${user.id}`;
      const cachedPosts = localStorage.getItem(cacheKey);

      if (cachedPosts) {
        try {
          const parsed = JSON.parse(cachedPosts);
          // Check if cache is less than 5 minutes old
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            console.log("Loading news posts from cache");
            setNewsPosts(parsed.data);
            setNewsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse cached news posts");
        }
      }

      // Get user's following list first
      const followingResponse = await apiClient.getFollows("following");
      const followingIds =
        followingResponse.follows?.map((f: any) => f.following_id) || [];

      if (followingIds.length === 0) {
        console.log("User is not following anyone, showing empty news feed");
        setNewsPosts([]);
        // Cache empty result
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: [],
            timestamp: Date.now(),
          }),
        );
        return;
      }

      // Get posts from all users (we'll filter client-side for now)
      const postsResponse = await apiClient.getPosts();
      const allPosts = postsResponse.posts || [];

      // Get all users to map user data to posts
      const usersResponse = await apiClient.getBarbers();
      const allUsers = usersResponse.barbers || [];

      // Create a user lookup map for faster access
      const userMap = new Map();
      allUsers.forEach((user: any) => {
        userMap.set(user.id, user);
      });

      // Enrich posts with user data and filter by followed users
      const enrichedPosts = allPosts.map((post: any) => ({
        ...post,
        author:
          post.user || userMap.get(post.user_id) || userMap.get(post.author_id),
        // Fallback user info if not found
        user_name:
          post.user?.name ||
          userMap.get(post.user_id)?.name ||
          userMap.get(post.author_id)?.name ||
          "مستخدم مجهول",
      }));

      // Filter posts to show only from followed users
      const newsFeeds = enrichedPosts.filter(
        (post: any) =>
          followingIds.includes(post.user_id) ||
          followingIds.includes(post.author_id),
      );

      // Sort by creation date (newest first)
      newsFeeds.sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.createdAt || "").getTime() -
          new Date(a.created_at || a.createdAt || "").getTime(),
      );

      console.log(
        `Found ${newsFeeds.length} posts from ${followingIds.length} followed users`,
      );

      // Cache the results
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: newsFeeds,
          timestamp: Date.now(),
        }),
      );

      setNewsPosts(newsFeeds);
    } catch (error) {
      console.error("Error loading news posts:", error);
      // Try to load from cache as fallback
      const cacheKey = `news_posts_${user.id}`;
      const cachedPosts = localStorage.getItem(cacheKey);
      if (cachedPosts) {
        try {
          const parsed = JSON.parse(cachedPosts);
          console.log("Loading news posts from cache as fallback");
          setNewsPosts(parsed.data);
          return;
        } catch (e) {
          console.warn("Failed to parse cached news posts fallback");
        }
      }
      setNewsPosts([]);
    } finally {
      setNewsLoading(false);
    }
  }, [user?.id]);

  // Load suggested users for friends tab
  const loadSuggestedUsers = useCallback(async () => {
    if (!user?.id) return;

    setFriendsLoading(true);
    try {
      console.log("Loading user suggestions...");

      // Get current following list to exclude them
      const followingResponse = await apiClient.getFollows("following");
      const followingIds =
        followingResponse.follows?.map((f: any) => f.following_id) || [];

      // Get all users from barbers endpoint (includes customers too, despite the name)
      const barbersResponse = await apiClient.getBarbers();
      const allUsers = barbersResponse.barbers || [];

      console.log(
        "All users received:",
        allUsers.length,
        allUsers.map((u) => ({ id: u.id, name: u.name, role: u.role })),
      );

      // Filter suggestions: exclude self and already followed users
      const suggestions = allUsers.filter(
        (suggestedUser: any) =>
          suggestedUser.id !== user.id &&
          !followingIds.includes(suggestedUser.id),
      );

      console.log(
        "Filtered suggestions:",
        suggestions.length,
        suggestions.map((u) => ({ id: u.id, name: u.name, role: u.role })),
      );

      // Prioritize by activity and level (include all roles)
      suggestions.sort((a: any, b: any) => {
        // Verified users first
        if (a.is_verified && !b.is_verified) return -1;
        if (b.is_verified && !a.is_verified) return 1;

        // Barbers second (but don't exclude others)
        if (a.role === "barber" && b.role !== "barber") return -1;
        if (b.role === "barber" && a.role !== "barber") return 1;

        // Then by level (higher first)
        return (b.level || 0) - (a.level || 0);
      });

      console.log(`Found ${suggestions.length} user suggestions`);
      setSuggestedUsers(suggestions.slice(0, 50)); // Limit to 50 suggestions
      setFilteredSuggestions(suggestions.slice(0, 50));
    } catch (error) {
      console.error("Error loading user suggestions:", error);
      setSuggestedUsers([]);
      setFilteredSuggestions([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [user?.id]);

  // Handle follow/unfollow actions
  const handleFollowToggle = async (
    targetUserId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    try {
      console.log(
        `Attempting to ${isCurrentlyFollowing ? "unfollow" : "follow"} user: ${targetUserId}`,
      );

      if (isCurrentlyFollowing) {
        await apiClient.unfollowUser(targetUserId);
        console.log(`Successfully unfollowed user: ${targetUserId}`);

        // Update the store to remove from follows
        const updatedFollows =
          state.follows?.filter(
            (follow: any) => follow.followed_id !== targetUserId,
          ) || [];
        store.setFollows(updatedFollows);
      } else {
        const followResult = await apiClient.followUser(targetUserId);
        console.log(
          `Successfully followed user: ${targetUserId}`,
          followResult,
        );

        // Update the store to add to follows
        const newFollow = {
          id: Date.now().toString(), // temporary ID
          follower_id: user.id,
          followed_id: targetUserId,
          created_at: new Date().toISOString(),
        };
        const updatedFollows = [...(state.follows || []), newFollow];
        store.setFollows(updatedFollows);
      }

      // Refresh the current data
      if (activeTab === "friends") {
        await loadSuggestedUsers();
      }

      // If on news tab, refresh posts as well to show new content
      if (activeTab === "news") {
        await loadNewsPosts();
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
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

  // Handle post interactions (like, comment, etc.)
  const handlePostLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await apiClient.unlikePost(postId);
      } else {
        await apiClient.likePost(postId);
      }

      // Update local state
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
            است��شف الأصدقاء
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {newsPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            {/* Post Header */}
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
                      console.log("Opening profile for user:", userToShow);
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

            {/* Post Content */}
            <CardContent className="pt-0">
              {/* Post Text */}
              {post.content && (
                <p className="text-sm mb-3 leading-relaxed">{post.content}</p>
              )}

              {/* Post Image */}
              {post.image_url && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img
                    src={post.image_url}
                    alt="منشور"
                    className="w-full h-auto max-h-96 object-cover cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  />
                </div>
              )}

              {/* Post Actions */}
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
                    className="text-muted-foreground hover:text-blue-500 transition-colors"
                    onClick={() => setSelectedPost(post)}
                  >
                    <MessageCircle className="w-4 h-4 ml-1" />
                    <span>{post.comments_count || 0}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-green-500 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
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

  const renderFriendsTab = () => {
    if (friendsLoading) {
      return (
        <div className="space-y-4">
          {/* Search skeleton */}
          <div className="h-10 bg-muted rounded animate-pulse"></div>

          {/* User suggestions skeleton */}
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
            <p className="text-muted-foreground">
              {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد اقتراحات متاحة"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map((suggestedUser) => {
              // Check if currently following this user
              const isFollowing = state.follows?.some(
                (follow: any) => follow.followed_id === suggestedUser.id,
              );

              console.log(
                `User ${suggestedUser.name} (${suggestedUser.id}) - Following status:`,
                isFollowing,
                {
                  userFollows: state.follows?.map((f) => ({
                    following_id: f.following_id,
                    followed_id: f.followed_id,
                  })),
                },
              );

              return (
                <Card
                  key={suggestedUser.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* User Info */}
                      <div
                        className="flex items-center space-x-3 space-x-reverse cursor-pointer flex-1 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => {
                          if (onUserClick) {
                            console.log(
                              "Opening profile for suggested user:",
                              suggestedUser,
                            );
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

                            {/* Show rating for barbers */}
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

                      {/* Follow Button */}
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

      {/* Post Detail Dialog */}
      <Dialog
        open={selectedPost !== null}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3 space-x-reverse">
                  <Avatar>
                    <AvatarImage
                      src={
                        selectedPost.author?.avatar_url || "/placeholder.svg"
                      }
                    />
                    <AvatarFallback>
                      {selectedPost.author?.name?.charAt(0) ||
                        selectedPost.user_name?.charAt(0) ||
                        "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedPost.author?.name ||
                        selectedPost.user_name ||
                        "مستخدم مجهول"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(
                        selectedPost.created_at || selectedPost.createdAt || "",
                      ).toLocaleDateString("ar")}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Post Content */}
                {selectedPost.content && (
                  <p className="text-sm leading-relaxed">
                    {selectedPost.content}
                  </p>
                )}

                {/* Post Image */}
                {selectedPost.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={selectedPost.image_url}
                      alt="منشور"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {/* Post Stats */}
                <div className="flex items-center justify-between py-3 border-t border-b">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-muted-foreground hover:text-red-500 transition-colors",
                        selectedPost.isLiked && "text-red-500",
                      )}
                      onClick={async () => {
                        await handlePostLike(
                          selectedPost.id,
                          selectedPost.isLiked || false,
                        );
                        // Update the selectedPost state to reflect the change
                        setSelectedPost((prev) =>
                          prev
                            ? {
                                ...prev,
                                isLiked: !prev.isLiked,
                                likes: prev.isLiked
                                  ? (prev.likes || 1) - 1
                                  : (prev.likes || 0) + 1,
                              }
                            : null,
                        );
                      }}
                    >
                      <Heart
                        className={cn(
                          "w-5 h-5 ml-1 transition-all",
                          selectedPost.isLiked && "fill-current scale-110",
                        )}
                      />
                      <span className="font-medium">
                        {selectedPost.likes || 0} إعجاب
                      </span>
                    </Button>

                    <div className="flex items-center text-muted-foreground">
                      <MessageCircle className="w-5 h-5 ml-1" />
                      <span>{selectedPost.comments_count || 0} تعليق</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 ml-1" />
                    مشاركة
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="space-y-3">
                  <h4 className="font-semibold">التعليقات</h4>
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>لا توجد تعليقات حتى الآن</p>
                    <p className="text-xs">كن أول من يعلق على هذا المنشور</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
