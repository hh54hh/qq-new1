import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Check,
  X,
  Star,
  Users,
  Camera,
  Image as ImageIcon,
  Calendar,
  MessageCircle,
  TrendingUp,
  Award,
  Settings,
  User as UserIcon,
  Scissors,
} from "lucide-react";
import { User, Booking } from "@shared/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import FriendsPage from "./FriendsPage";
import UserProfile from "./UserProfile";
import ServicesManagement from "./ServicesManagement";
import WorkingHours from "./WorkingHours";
import AnalyticsDashboard from "./AnalyticsDashboard";
import SettingsPage from "./SettingsPage";
import EditProfilePage from "./EditProfilePage";
import MessagesPage from "./MessagesPage";

interface BarberDashboardProps {
  user: User;
  activeTab: string;
  onLogout?: () => void;
}

export default function BarberDashboard({
  user,
  activeTab,
  onLogout,
}: BarberDashboardProps) {
  const [state, store] = useAppStore();
  const [newPostCaption, setNewPostCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Followers system state
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      // Try to upload using API client
      const response = await apiClient.uploadImage(file);
      return response.url;
    } catch (error) {
      // Fallback to base64 if upload API not available
      console.warn(
        "Image upload API not available, using base64 fallback:",
        error,
      );
      return await convertToBase64(file);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        console.log("Image converted to base64");
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read image file"));
      };
      reader.readAsDataURL(file);
    });
  };
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showServicesManagement, setShowServicesManagement] = useState(false);
  const [showWorkingHours, setShowWorkingHours] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState<any | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadBarberData();
    loadFollowersData();
  }, [user.id]);

  const loadFollowersData = async () => {
    try {
      // Load followers and following data
      const [followersResponse, followingResponse] = await Promise.all([
        apiClient.getFollows("followers"),
        apiClient.getFollows("following"),
      ]);

      const followersData = followersResponse.follows || [];
      const followingData = followingResponse.follows || [];

      setFollowers(followersData);
      setFollowing(followingData);
      setFollowerCount(followersData.length);
      setFollowingCount(followingData.length);
    } catch (error) {
      console.error("Error loading followers data:", error);
      setFollowers([]);
      setFollowing([]);
      setFollowerCount(0);
      setFollowingCount(0);
    }
  };

  const loadBarberData = async () => {
    // Only load if user is logged in
    if (!user?.id) {
      return;
    }

    try {
      store.setLoading(true);

      // Load data sequentially to prevent network overload
      try {
        const bookingsData = await apiClient.getBookings();
        store.setBookings(bookingsData.bookings || []);
      } catch (error) {
        console.error("Error loading bookings:", error);
        store.setBookings([]);
      }

      try {
        const postsData = await apiClient.getPosts(user.id);
        store.setPosts(postsData.posts || []);
      } catch (error) {
        console.error("Error loading posts:", error);
        store.setPosts([]);
      }
    } catch (error) {
      console.error("Error loading barber data:", error);
    } finally {
      store.setLoading(false);
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

  // Show profile page
  if (showProfile && selectedProfile) {
    return (
      <UserProfile
        profileUser={selectedProfile}
        currentUser={user}
        onBack={() => {
          setShowProfile(false);
          setSelectedProfile(null);
        }}
        onMessage={() => {
          setShowProfile(false);
          setMessageTargetUser(selectedProfile);
          setShowMessages(true);
        }}
      />
    );
  }

  // Show services management
  if (showServicesManagement) {
    return (
      <ServicesManagement
        user={user}
        onBack={() => setShowServicesManagement(false)}
      />
    );
  }

  // Show working hours
  if (showWorkingHours) {
    return (
      <WorkingHours user={user} onBack={() => setShowWorkingHours(false)} />
    );
  }

  // Show analytics
  if (showAnalytics) {
    return (
      <AnalyticsDashboard user={user} onBack={() => setShowAnalytics(false)} />
    );
  }

  // Show settings
  if (showSettings) {
    return <SettingsPage user={user} onBack={() => setShowSettings(false)} />;
  }

  // Show edit profile
  if (showEditProfile) {
    return (
      <EditProfilePage
        user={user}
        onBack={() => setShowEditProfile(false)}
        onSave={(updatedUser) => {
          setShowEditProfile(false);
        }}
      />
    );
  }

  // Show messages
  if (showMessages) {
    return (
      <MessagesPage
        user={user}
        targetUser={messageTargetUser}
        onBack={() => {
          setShowMessages(false);
          setMessageTargetUser(null);
        }}
      />
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "منذ دقائق";
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await apiClient.updateBooking(bookingId, { status: "accepted" });
      store.updateBooking(bookingId, { status: "accepted" });

      // Add notification
      const booking = state.bookings.find((b) => b.id === bookingId);
      if (booking) {
        store.addNotification({
          id: Date.now().toString(),
          type: "booking_accepted",
          title: "تم قبول الحجز",
          message: `تم قبول حجز ${booking.user?.name || "العميل"}`,
          data: booking,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await apiClient.updateBooking(bookingId, { status: "rejected" });
      store.updateBooking(bookingId, { status: "rejected" });

      // Add notification
      const booking = state.bookings.find((b) => b.id === bookingId);
      if (booking) {
        store.addNotification({
          id: Date.now().toString(),
          type: "booking_rejected",
          title: "تم رفض الحجز",
          message: `تم رفض حج�� ${booking.user?.name || "العميل"}`,
          data: booking,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedImage || !newPostCaption.trim()) return;

    try {
      store.setLoading(true);

      // Upload image to get real URL
      const imageUrl = await uploadImage(selectedImage);

      const postData = {
        user_id: user.id,
        image_url: imageUrl,
        caption: newPostCaption,
        frame_style: getLevelLabel(user.level),
      };

      const newPost = await apiClient.createPost(postData);

      // Ensure the post has complete user data
      const enrichedPost = {
        ...newPost,
        user: user, // Add complete user data
        likes: 0, // Initialize likes
      };

      store.addPost(enrichedPost);

      setNewPostCaption("");
      setSelectedImage(null);

      // Force refresh posts in other components by dispatching event
      window.dispatchEvent(new CustomEvent("postsUpdated"));

      // Update user points for creating post
      const updatedUser = { ...user, points: user.points + 5 };
      store.setUser(updatedUser);

      // Add success notification
      store.addNotification({
        id: Date.now().toString(),
        type: "success",
        title: "تم نشر المنشور",
        message: "تم نشر عملك بنجاح وحصلت على 5 نقاط",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      store.setLoading(false);
    }
  };

  const handleViewProfile = (customer: any) => {
    setSelectedProfile({
      ...customer,
      role: "customer",
      status: "active",
      is_verified: true,
      created_at: new Date().toISOString(),
    });
    setShowProfile(true);
  };

  const renderHome = () => (
    <div className="p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{user.points}</p>
            <p className="text-sm text-muted-foreground">نقاط</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-golden-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
              {getLevelIcon(user.level)}
              {getLevelLabel(user.level)}
            </p>
            <p className="text-sm text-muted-foreground">المستوى</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Booking Requests */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            طلبات الحجز الجديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.bookings
            .filter((b) => b.status === "pending")
            .slice(0, 2)
            .map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <Avatar
                  className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() =>
                    booking.user && handleViewProfile(booking.user)
                  }
                >
                  <AvatarImage src={booking.user?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {booking.user?.name ? booking.user.name.charAt(0) : "ع"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-foreground text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() =>
                      booking.user && handleViewProfile(booking.user)
                    }
                  >
                    {booking.user?.name || "عميل"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(booking.datetime)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleAcceptBooking(booking.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => handleRejectBooking(booking.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

          {state.bookings.filter((b) => b.status === "pending").length ===
            0 && (
            <p className="text-center text-muted-foreground py-4">
              لا توجد طلبات جديدة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            آخر منشوراتك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.posts.slice(0, 2).map((post) => (
            <div key={post.id} className="flex gap-3">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <p className="text-sm text-foreground mb-1">{post.caption}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <span>{formatRelativeTime(post.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderRequests = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-foreground">طلبات الحجز</h2>

      <div className="space-y-4">
        {state.bookings
          .filter((b) => b.status === "pending")
          .map((booking) => (
            <Card key={booking.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.user?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {booking.user?.name ? booking.user.name.charAt(0) : "ع"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">
                        {booking.user?.name || "عميل"}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        جديد
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(booking.datetime)}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAcceptBooking(booking.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectBooking(booking.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        رفض
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {state.bookings.filter((b) => b.status === "pending").length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا توجد طلبات جديدة
              </h3>
              <p className="text-muted-foreground">
                سيظهر هنا طلبات الحجز الجديدة من العملاء
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Accepted Bookings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          المواعيد المؤكدة
        </h3>

        {state.bookings
          .filter((b) => b.status === "accepted")
          .map((booking) => (
            <Card key={booking.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.user?.avatar_url} />
                      <AvatarFallback className="bg-green-500/10 text-green-500">
                        {booking.user?.name ? booking.user.name.charAt(0) : "ع"}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-medium text-foreground">
                        {booking.user?.name || "عميل"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.datetime)}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    مؤكد
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );

  const renderNewPost = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-foreground">منشور جديد</h2>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6 space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              الصورة
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              {selectedImage ? (
                <div className="space-y-2">
                  <div className="w-32 h-32 mx-auto bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedImage.name}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedImage(null)}
                  >
                    تغيير الصورة
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-foreground font-medium">اختر صورة</p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, GIF - حتى 10MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    رفع صورة
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file type
                        const validTypes = [
                          "image/jpeg",
                          "image/jpg",
                          "image/png",
                          "image/gif",
                        ];
                        if (!validTypes.includes(file.type)) {
                          store.addNotification({
                            id: Date.now().toString(),
                            type: "system",
                            title: "نوع ملف غير مدعوم",
                            message: "يرجى اختيار صورة بصيغة JPG, PNG أو GIF",
                            data: null,
                            read: false,
                            created_at: new Date().toISOString(),
                          });
                          return;
                        }

                        // Validate file size (10MB limit)
                        const maxSize = 10 * 1024 * 1024; // 10MB
                        if (file.size > maxSize) {
                          store.addNotification({
                            id: Date.now().toString(),
                            type: "system",
                            title: "حجم الملف كبير جداً",
                            message: "يرجى اختيار صورة بحجم أقل من 10 ميجابايت",
                            data: null,
                            read: false,
                            created_at: new Date().toISOString(),
                          });
                          return;
                        }

                        setSelectedImage(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">الوصف</label>
            <Textarea
              value={newPostCaption}
              onChange={(e) => setNewPostCaption(e.target.value)}
              placeholder="اكتب وصفاً ل��ملك..."
              className="min-h-[100px] text-right"
              dir="rtl"
            />
          </div>

          {/* Frame Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              إطار المنشور
            </label>
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <span>{getLevelIcon(user.level)}</span>
                <span className="text-sm font-medium">
                  {getLevelLabel(user.level)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                إطار {getLevelLabel(user.level)} - يتم تطبيقه تلقائياً حسب
                مستواك
              </p>
            </div>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleCreatePost}
            disabled={!selectedImage || !newPostCaption.trim()}
          >
            نشر
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="p-4 space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">حلاق</Badge>
                <Badge className="bg-golden-500/10 text-golden-500 border-golden-500/20">
                  {getLevelIcon(user.level)} {getLevelLabel(user.level)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{user.points}</p>
              <p className="text-sm text-muted-foreground">نق��ط</p>
            </div>
            <div
              className="cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
              onClick={() => setShowFollowers(true)}
            >
              <p className="text-2xl font-bold text-primary">{followerCount}</p>
              <p className="text-sm text-muted-foreground">متابع��ن</p>
            </div>
            <div
              className="cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
              onClick={() => setShowFollowing(true)}
            >
              <p className="text-2xl font-bold text-primary">
                {followingCount}
              </p>
              <p className="text-sm text-muted-foreground">متابَعين</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {state.posts.length}
              </p>
              <p className="text-sm text-muted-foreground">منشورات</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">منشوراتي</h3>

        <div className="grid grid-cols-3 gap-2">
          {state.posts.map((post) => (
            <div
              key={post.id}
              className="aspect-square bg-muted rounded-lg overflow-hidden"
            >
              <img
                src={post.image_url}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          {Array.from({ length: Math.max(0, 6 - state.posts.length) }).map(
            (_, i) => (
              <div
                key={i}
                className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center"
              >
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            ),
          )}
        </div>
      </div>

      {/* Business Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">إدارة الأعمال</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setShowServicesManagement(true)}
          >
            <Scissors className="h-4 w-4" />
            إدارة الخدمات
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setShowWorkingHours(true)}
          >
            <Clock className="h-4 w-4" />
            أوقات العمل
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setShowAnalytics(true)}
          >
            <TrendingUp className="h-4 w-4" />
            التحليلات والإحصائيات
          </Button>
        </div>
      </div>

      {/* Settings and Logout */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => setShowEditProfile(true)}
        >
          <UserIcon className="h-4 w-4" />
          تعديل الملف الشخ��ي
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-start gap-3"
          onClick={onLogout}
        >
          تسجيل خروج
        </Button>
      </div>
    </div>
  );

  const renderFollowers = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFollowers(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold">المتابعين ({followerCount})</h2>
      </div>

      <div className="space-y-3">
        {followers.map((follower) => (
          <Card
            key={follower.follower_id}
            className="border-border/50 bg-card/50"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follower.follower?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {follower.follower?.name?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">
                    {follower.follower?.name ||
                      `مستخ��م ${follower.follower_id.slice(-4)}`}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {follower.follower?.role === "barber" ? "حلاق" : "زبون"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {followers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا يوجد متابعين حتى الآن</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFollowing = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFollowing(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold">المتابَعين ({followingCount})</h2>
      </div>

      <div className="space-y-3">
        {following.map((follow) => (
          <Card
            key={follow.followed_id}
            className="border-border/50 bg-card/50"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follow.followed?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {follow.followed?.name?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">
                    {follow.followed?.name ||
                      `مستخدم ${follow.followed_id.slice(-4)}`}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {follow.followed?.role === "barber" ? "حلاق" : "زبون"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnfollow(follow.followed_id)}
                >
                  إلغاء المتابعة
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {following.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا تتاب�� أحد حتى الآن</p>
          </div>
        )}
      </div>
    </div>
  );

  const handleUnfollow = async (userId: string) => {
    try {
      await apiClient.unfollowUser(userId);

      // Remove from local state
      setFollowing((prev) => prev.filter((f) => f.followed_id !== userId));
      setFollowingCount((prev) => prev - 1);

      // Update store
      const followToRemove = state.follows.find(
        (f) => f.followed_id === userId,
      );
      if (followToRemove) {
        store.removeFollow(followToRemove.id);
      }

      // Add notification
      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "إلغاء المتابعة",
        message: "تم إلغاء المتابعة بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error unfollowing:", error);
    }
  };

  // Handle showing followers/following
  if (showFollowers) {
    return renderFollowers();
  }

  if (showFollowing) {
    return renderFollowing();
  }

  switch (activeTab) {
    case "home":
      return renderHome();
    case "friends":
      return <FriendsPage user={user} />;
    case "requests":
      return renderRequests();
    case "new-post":
      return renderNewPost();
    case "profile":
      return renderProfile();
    default:
      return renderHome();
  }
}
