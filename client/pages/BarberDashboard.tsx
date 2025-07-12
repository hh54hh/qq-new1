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
  TrendingUp,
  Award,
  Settings,
  User as UserIcon,
  Scissors,
  ArrowRight,
  Eye,
  Upload,
  FileImage,
} from "lucide-react";
import { User, Booking } from "@shared/api";
import {
  getUserDisplayRole,
  getServiceCategoryIcon,
} from "@shared/service-categories";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import FriendsPage from "./FriendsPage";
import UserProfile from "./UserProfile";
import ServicesManagement from "./ServicesManagement";
import WorkingHours from "./WorkingHours";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Followers system state
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);

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
    if (level >= 21) return "مح��رف";
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
    if (diffInHours < 24) return `منذ ${diffInHours} سا��ة`;
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
          message: `ت�� قبول حجز ${booking.user?.name || "ا��عميل"}`,
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
            <p className="text-sm text-muted-foreground">نقا��</p>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              طلبات الحجز الجديدة
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm text-primary"
              onClick={() => setShowAllRequests(true)}
            >
              عرض الكل
            </Button>
          </div>
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
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا ت��جد طلبات جديدة
              </h3>
              <p className="text-muted-foreground">
                سيظهر هنا طلبات الحج�� ا��جديدة من العملاء
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
          {/* Image Upload with Preview */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">
              الصورة
            </label>

            {selectedImage && imagePreviewUrl ? (
              /* Image Preview Section - Facebook Style */
              <div className="space-y-4">
                {/* Preview Notice */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    هذه معاينة للصورة قبل النشر
                  </p>
                </div>

                {/* Post Preview Container */}
                <Card className="bg-background border border-border/50">
                  <CardContent className="p-4">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{user.name}</p>
                          {user.is_verified && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">الآن</p>
                      </div>
                    </div>

                    {/* Image Preview - Full Width with Proper Aspect Ratio */}
                    <div className="relative w-full overflow-hidden rounded-lg bg-muted">
                      <img
                        src={imagePreviewUrl}
                        alt="معاينة الصورة"
                        className="w-full h-auto object-contain max-h-96"
                        style={{ aspectRatio: "auto" }}
                      />
                    </div>

                    {/* Caption Preview */}
                    {newPostCaption.trim() && (
                      <div className="mt-4">
                        <p className="text-sm text-foreground">
                          {newPostCaption}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Image Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    تغيير الصورة
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreviewUrl(null);
                    }}
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                    إزالة الصورة
                  </Button>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                    <FileImage className="w-3 h-3" />
                    {selectedImage.name} (
                    {(selectedImage.size / 1024 / 1024).toFixed(1)} MB)
                  </div>
                </div>
              </div>
            ) : (
              /* Upload Section */
              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-border transition-colors">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-lg">
                      اختر صورة رائعة
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      اعرض عملك بأفضل جودة ممكنة
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      رفع صورة
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, GIF - حتى 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden File Input */}
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
                    "image/webp",
                  ];
                  if (!validTypes.includes(file.type)) {
                    store.addNotification({
                      id: Date.now().toString(),
                      type: "system",
                      title: "نوع ملف غير مدعوم",
                      message: "يرجى اخت��ار صورة بصيغة JPG, PNG, GIF أو WebP",
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

                  // Create preview URL
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    if (e.target?.result) {
                      setImagePreviewUrl(e.target.result as string);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
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
              إطار ا��منشور
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
    <div className="w-full max-w-full overflow-hidden p-3 sm:p-4 space-y-4 sm:space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {user.name}
              </h3>
              <p
                className="text-sm sm:text-base text-muted-foreground truncate"
                title={user.email}
              >
                {user.email}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm flex items-center gap-1"
                >
                  <span>
                    {getServiceCategoryIcon(user.service_category || "barber")}
                  </span>
                  <span>{getUserDisplayRole(user)}</span>
                </Badge>
                <Badge className="bg-golden-500/10 text-golden-500 border-golden-500/20 text-xs sm:text-sm">
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
            إدارة ال��دمات
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
            الت��ليلات والإحصائيات
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
        <h2 className="text-lg font-bold">المتا��عين ({followerCount})</h2>
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

  // Show all requests page
  if (showAllRequests) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAllRequests(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              جميع طلبات الحجز
            </h1>
          </div>
        </div>
        <div className="p-4">{renderRequests()}</div>
      </div>
    );
  }

  switch (activeTab) {
    case "home":
      return renderHome();
    case "friends":
      return <FriendsPage user={user} />;

    case "messages":
      return <MessagesPage user={user} onBack={() => window.history.back()} />;
    case "new-post":
      return renderNewPost();
    case "profile":
      return renderProfile();
    default:
      return renderHome();
  }
}
