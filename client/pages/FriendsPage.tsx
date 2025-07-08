import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  UserMinus,
  Check,
  X,
  Search,
  Users,
  Heart,
  MessageCircle,
} from "lucide-react";
import { User, FriendRequest, FriendRequestStatus } from "@shared/api";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";

interface FriendsPageProps {
  user: User;
}

// No mock data - using real database data only

export default function FriendsPage({ user }: FriendsPageProps) {
  const [state, store] = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("requests");

  // Real data state
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  // Load real data from API
  useEffect(() => {
    const loadFriendRequests = async () => {
      // Only load if user is logged in
      if (!user?.id) {
        setFriendRequests([]);
        return;
      }

      try {
        const response = await apiClient.getFriendRequests();
        setFriendRequests(response.requests || []);
      } catch (error) {
        console.error("Error loading friend requests:", error);
        // Show empty list if API fails
        setFriendRequests([]);
      }
    };

    loadFriendRequests();
    loadFollowData();
  }, [user?.id]);

  const loadFollowData = async () => {
    if (!user?.id) return;

    try {
      // Load followers and following in parallel
      const [followersResponse, followingResponse] = await Promise.all([
        apiClient.getFollows("followers"),
        apiClient.getFollows("following"),
      ]);

      // Update store with follows data
      if (followingResponse.follows) {
        store.setFollows(followingResponse.follows);
      }

      // Get real user data for followers and following
      const followers = followersResponse.follows || [];
      const following = followingResponse.follows || [];

      // Get actual user details for followers
      const followersData = await Promise.all(
        followers.map(async (follow) => {
          try {
            // In a real implementation, you'd fetch user details from the API
            // For now, we'll use the follow data and try to get user info if available
            return {
              id: follow.follower_id,
              name:
                follow.follower?.name ||
                `مستخدم ${follow.follower_id.slice(-4)}`,
              avatar_url: follow.follower?.avatar_url || "/placeholder.svg",
              level: follow.follower?.level || 1,
              points: follow.follower?.points || 0,
              isFollowed: false,
              isOnline: false, // Would be determined by real online status
            };
          } catch (error) {
            return {
              id: follow.follower_id,
              name: `مستخدم ${follow.follower_id.slice(-4)}`,
              avatar_url: "/placeholder.svg",
              level: 1,
              points: 0,
              isFollowed: false,
              isOnline: false,
            };
          }
        }),
      );

      // Get actual user details for following
      const followingData = await Promise.all(
        following.map(async (follow) => {
          try {
            return {
              id: follow.followed_id,
              name:
                follow.followed?.name ||
                `مستخدم ${follow.followed_id.slice(-4)}`,
              avatar_url: follow.followed?.avatar_url || "/placeholder.svg",
              level: follow.followed?.level || 1,
              points: follow.followed?.points || 0,
              isFollowed: true,
              isOnline: false,
            };
          } catch (error) {
            return {
              id: follow.followed_id,
              name: `مستخدم ${follow.followed_id.slice(-4)}`,
              avatar_url: "/placeholder.svg",
              level: 1,
              points: 0,
              isFollowed: true,
              isOnline: false,
            };
          }
        }),
      );

      // Use real data from API
      setFollowers(followersData);
      setFollowing(followingData);
    } catch (error) {
      console.error("Error loading follow data:", error);
      // Keep empty arrays on error
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠";
    if (level >= 51) return "🟡";
    if (level >= 21) return "🔹";
    return "🔸";
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "ذهبي";
    if (level >= 21) return "محترف";
    return "مبتدئ";
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiClient.respondToFriendRequest(requestId, "accepted");

      // Update local state
      setFriendRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "accepted" } : req,
        ),
      );

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم قبول طلب الصداقة",
        message: "تم قبول طلب الصداقة بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "خطأ في قبول طلب الصداقة",
        message: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiClient.respondToFriendRequest(requestId, "rejected");

      // Remove from local state
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));

      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم رفض طلب الصداقة",
        message: "تم رفض طلب الصداقة",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "خطأ في رفض طلب الصداقة",
        message: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await apiClient.unfollowUser(userId);

      // Remove from store follows
      const followToRemove = state.follows.find(
        (f) => f.followed_id === userId,
      );
      if (followToRemove) {
        store.removeFollow(followToRemove.id);
      }

      // Update local state
      setFollowing((prev) => prev.filter((user) => user.id !== userId));

      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "تم إلغاء المتابعة",
        message: "تم إلغاء متابعة المستخدم بنجاح",
        data: { userId },
        read: false,
        created_at: new Date().toISOString(),
      });

      // Reload follow data to sync with server
      setTimeout(() => {
        loadFollowData();
      }, 500);
    } catch (error) {
      console.error("Error unfollowing user:", error);

      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "خطأ في إلغاء المتابعة",
        message: "حدث خطأ أثناء إلغاء المتابعة، يرجى المحاولة مرة أخرى",
        data: { userId },
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleFollowBack = async (userId: string) => {
    try {
      const followResult = await apiClient.followUser(userId);

      // Add to store follows
      const newFollow = followResult || {
        id: Date.now().toString(),
        follower_id: user.id,
        followed_id: userId,
        created_at: new Date().toISOString(),
      };
      store.addFollow(newFollow);

      // Update local state
      setFollowers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isFollowingBack: true } : user,
        ),
      );

      store.addNotification({
        id: Date.now().toString(),
        type: "new_follower",
        title: "تمت المتابعة",
        message: "تمت متابعة المستخدم بنجاح",
        data: { userId },
        read: false,
        created_at: new Date().toISOString(),
      });

      // Reload follow data to sync with server
      setTimeout(() => {
        loadFollowData();
      }, 500);
    } catch (error) {
      console.error("Error following back user:", error);

      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "خطأ في المتابعة",
        message: "حدث خطأ أثناء المتابعة، يرجى المحاولة مرة أخرى",
        data: { userId },
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  };

  const pendingRequests = friendRequests.filter(
    (req) => req.status === "pending",
  );

  const renderRequests = () => (
    <div className="space-y-4">
      {pendingRequests.length > 0 ? (
        pendingRequests.map((request) => (
          <Card key={request.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.sender.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {request.sender.name?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {request.sender.name || "مستخدم"}
                    </h4>
                    {request.sender.role === "barber" && (
                      <>
                        <span>{getLevelIcon(request.sender.level)}</span>
                        <Badge variant="outline" className="text-xs">
                          {getLevelLabel(request.sender.level)}
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">ي��يد متابعتك</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id)}
                    className="h-8 px-3"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(request.id)}
                    className="h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    رفض
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا توجد طلبات صداقة
            </h3>
            <p className="text-muted-foreground">
              ستظهر هنا طلبات المتابعة ا��جديدة
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFollowers = () => (
    <div className="space-y-4">
      {followers.length > 0 ? (
        followers.map((follower) => (
          <Card key={follower.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follower.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {follower.name?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <h4 className="font-medium text-foreground">
                    {follower.name || "مستخدم"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {follower.role === "customer" ? "زبون" : "حلاق"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!follower.isFollowingBack ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFollowBack(follower.id)}
                    >
                      متابعة
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      يتابعك
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا يوجد متابعين
            </h3>
            <p className="text-muted-foreground">
              ابدأ بالتفاعل مع الآخرين لكسب المتابعين
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFollowing = () => (
    <div className="space-y-4">
      {following.length > 0 ? (
        following.map((followingUser) => (
          <Card key={followingUser.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={followingUser.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {followingUser.name?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {followingUser.name || "مستخدم"}
                    </h4>
                    {followingUser.role === "barber" && followingUser.level && (
                      <>
                        <span>{getLevelIcon(followingUser.level)}</span>
                        <Badge variant="outline" className="text-xs">
                          {getLevelLabel(followingUser.level)}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {followingUser.role === "customer" ? "زبون" : "حلاق"}
                    </span>
                    {followingUser.isFollowingBack && (
                      <Badge variant="outline" className="text-xs">
                        يتابعك أيضاً
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnfollow(followingUser.id)}
                  >
                    <UserMinus className="h-3 w-3 mr-1" />
                    إلغاء الم��ابعة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا تتابع أحداً
            </h3>
            <p className="text-muted-foreground mb-4">
              ابحث عن ال��لا��ين وابدأ بمتابعتهم
            </p>
            <Button variant="outline">استكشف الحلاقين</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="��بحث عن أصدقاء..."
          className="pr-10 text-right"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {pendingRequests.length}
            </p>
            <p className="text-sm text-muted-foreground">طلبات جديدة</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {followers.length}
            </p>
            <p className="text-sm text-muted-foreground">متابعين</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {following.length}
            </p>
            <p className="text-sm text-muted-foreground">��تابع</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="relative">
            طلبات الصداقة
            {pendingRequests.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followers">المتابعين</TabsTrigger>
          <TabsTrigger value="following">المتابَعين</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="requests">{renderRequests()}</TabsContent>
          <TabsContent value="followers">{renderFollowers()}</TabsContent>
          <TabsContent value="following">{renderFollowing()}</TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
