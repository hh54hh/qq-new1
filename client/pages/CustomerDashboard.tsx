import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Star,
  Clock,
  Heart,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  User as UserIcon,
  Settings,
  ArrowRight,
} from "lucide-react";
import { User, UserRole, CreateBookingRequest } from "@shared/api";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { getBarberCache, CachedBarber } from "@/lib/barber-cache";
import { getUltraFastBarberCache } from "@/lib/ultra-fast-barber-cache";
import { BarberSkeletonGrid } from "@/components/BarberSkeleton";
import { UltraFastSkeletonGrid } from "@/components/UltraFastSkeleton";
import BookingPage from "./BookingPage";

import UserProfile from "./UserProfile";
import RatingPage from "./RatingPage";
import SearchPage from "./SearchPage";
import SettingsPage from "./SettingsPage";
import EditProfilePage from "./EditProfilePage";
import MessagesPage from "./MessagesPage";
import AdvancedSearchPage from "./AdvancedSearchPage";
import HomePageSimple from "./HomePageSimple";
import InstagramNewsFeed from "./InstagramNewsFeed";
import ExplorePageWithTabs from "./ExplorePageWithTabs";

import LocationBar from "@/components/LocationBar";
import { useLocation } from "@/hooks/use-location";

interface CustomerDashboardProps {
  user: User;
  activeTab: string;
  onLogout?: () => void;
}

export default function CustomerDashboard({
  user,
  activeTab,
  onLogout,
}: CustomerDashboardProps) {
  const [state, store] = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null);
  const [showBookingPage, setShowBookingPage] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<
    any | null
  >(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowedBarbers, setShowFollowedBarbers] = useState(false);
  const [showNearbyBarbers, setShowNearbyBarbers] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);

  const [allBarbers, setAllBarbers] = useState<CachedBarber[]>([]);
  const [filteredBarbers, setFilteredBarbers] = useState<CachedBarber[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(true);
  const [barbersFromCache, setBarbersFromCache] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Ultra-fast barber loading (<50ms response time)
  const loadBarbersUltraFast = async () => {
    const startTime = performance.now();
    console.log("ULTRA-FAST barber loading initiated for user:", user?.id);

    if (!user?.id) {
      console.log("No user ID, skipping barbers load");
      return;
    }

    try {
      // Get ultra-fast cache manager
      const ultraCache = await getUltraFastBarberCache(user.id);

      // Get instant data (memory/indexeddb/skeletons)
      const { barbers, source, loadTime } =
        await ultraCache.getInstantBarbers();

      console.log(`ULTRA-FAST load: ${loadTime.toFixed(1)}ms from ${source}`);

      // Show data immediately regardless of source
      setAllBarbers(barbers);
      setFilteredBarbers(barbers);
      setBarbersFromCache(source !== "skeleton");
      setShowSkeletons(source === "skeleton");
      setBarbersLoading(source === "skeleton");

      const totalTime = performance.now() - startTime;
      console.log(`TOTAL UI update time: ${totalTime.toFixed(1)}ms`);

      // If showing skeletons, expect real data soon
      if (source === "skeleton") {
        console.log("Skeletons shown, awaiting real data...");
      } else {
        console.log(`Real data displayed (${barbers.length} barbers)`);
      }
    } catch (error) {
      console.error("Ultra-fast loading failed:", error);

      // Immediate fallback - no delays
      setBarbersLoading(false);
      setShowSkeletons(false);
      setAllBarbers([]);
      setFilteredBarbers([]);
    }
  };

  // Explore page state
  const [exploreSearchQuery, setExploreSearchQuery] = useState("");
  const [exploreSortBy, setExploreSortBy] = useState("newest");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);

  // Profile page state
  const [profileFollowers, setProfileFollowers] = useState<any[]>([]);
  const [profileFollowing, setProfileFollowing] = useState<any[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [profileStats, setProfileStats] = useState({
    bookings: 0,
    followers: 0,
    following: 0,
  });
  const {
    location: userLocation,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useLocation();

  // Explore posts state - loaded from real API
  const [explorePosts, setExplorePosts] = useState<any[]>([]);

  // Debug logging
  useEffect(() => {
    console.log("🏠 CustomerDashboard mounted", {
      userId: user?.id,
      userRole: user?.role,
      activeTab,
      barbersCount: allBarbers.length,
    });
  }, []);

  // تهيئة follows عند تحميل الصفحة
  useEffect(() => {
    const initializeFollows = async () => {
      if (!user?.id) return;

      try {
        console.log("🔄 Initializing follows data...");
        const followingResponse = await apiClient.getFollows("following");
        const follows = followingResponse.follows || [];

        // تحديث store ببيانات المتابعة
        store.setFollows(follows);

        console.log(`✅ Initialized ${follows.length} follows in store`);
      } catch (error) {
        console.error("❌ Error initializing follows:", error);
        store.setFollows([]);
      }
    };

    initializeFollows();
  }, [user?.id]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredBarbers(
        allBarbers.filter((barber) =>
          barber.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    } else {
      setFilteredBarbers(allBarbers);
    }
  }, [searchQuery, allBarbers]);

  // Load explore posts from API
  useEffect(() => {
    const loadExplorePosts = async () => {
      console.log("=== Loading explore posts ===");
      console.log("Active tab:", activeTab);

      if (activeTab !== "search") {
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
            caption: "قصة شعر مميزة - أسلوب حد��ث",
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

  // Listen for posts updates from other components
  useEffect(() => {
    const handlePostsUpdate = () => {
      if (activeTab === "explore") {
        // Re-load explore posts when posts are updated
        const loadExplorePosts = async () => {
          try {
            console.log("Refreshing explore posts due to update event...");
            const postsResponse = await apiClient.getPosts();
            const posts = postsResponse.posts || [];
            setExplorePosts(posts);
            setFilteredPosts(posts);
          } catch (error) {
            console.error("Error refreshing explore posts:", error);
          }
        };
        loadExplorePosts();
      }
    };

    window.addEventListener("postsUpdated", handlePostsUpdate);
    return () => window.removeEventListener("postsUpdated", handlePostsUpdate);
  }, [activeTab]);

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

  // Load profile data when profile tab is active
  useEffect(() => {
    if (activeTab === "profile") {
      loadProfileData();
    }
  }, [activeTab]);

  // Load data on component mount with smart barber loading
  useEffect(() => {
    loadBookings();
    loadBarbersUltraFast();
    loadFriendRequests();
  }, [user.id]);

  // Listen for barber updates from background sync
  useEffect(() => {
    const handleBarbersUpdate = () => {
      console.log("Regular barbers updated from background sync");
      // Debounce updates to prevent excessive re-renders
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        loadBarbersFromCache();
      }, 300);
    };

    const handleUltraFastUpdate = async () => {
      console.log("ULTRA-FAST barbers update received");
      if (!user?.id) return;

      try {
        const ultraCache = await getUltraFastBarberCache(user.id);
        const { barbers, source } = await ultraCache.getInstantBarbers();

        if (source !== "skeleton" && barbers.length > 0) {
          // Filter out skeleton entries
          const realBarbers = barbers.filter(
            (barber) => !(barber as any)._isSkeleton,
          );

          if (realBarbers.length > 0) {
            setAllBarbers(realBarbers);
            setFilteredBarbers(realBarbers);
            setShowSkeletons(false);
            setBarbersLoading(false);
            console.log(
              "ULTRA-FAST update applied:",
              realBarbers.length,
              "barbers",
            );
          }
        }
      } catch (error) {
        console.warn("Failed to handle ultra-fast update:", error);
      }
    };

    window.addEventListener("barbersUpdated", handleBarbersUpdate);
    window.addEventListener("ultraFastBarbersUpdated", handleUltraFastUpdate);
    return () => {
      window.removeEventListener("barbersUpdated", handleBarbersUpdate);
      window.removeEventListener(
        "ultraFastBarbersUpdated",
        handleUltraFastUpdate,
      );
      clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up cache if user changes
      if (user?.id) {
        getBarberCache(user.id)
          .then((cache) => cache.destroy())
          .catch(console.warn);
      }
      clearTimeout(updateTimeoutRef.current);
    };
  }, [user?.id]);

  const loadFriendRequests = () => {
    // تحقق من أن الإشعارات لم يتم عرضها من قبل
    const NOTIFICATIONS_SHOWN_KEY = `friend_requests_shown_${user.id}`;
    const hasShownNotifications = localStorage.getItem(NOTIFICATIONS_SHOWN_KEY);

    // إذا ��م عرض ا��إشعارات من قبل، لا تعرضها مرة أخرى
    if (hasShownNotifications) {
      return;
    }

    // إضافة طلب��ت صداقة تجريبية للإشعارات (مرة واحدة فقط)
    const friendRequests = [
      {
        id: "friend_req_1",
        type: "friend_request" as const,
        title: "طلب صداقة جديد",
        message: "��حمد الحلاق يريد متابعتك",
        data: {
          senderId: "barber_1",
          senderName: "أحمد ا��حلاق",
          requiresAction: true,
        },
        read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: "friend_req_2",
        type: "friend_request" as const,
        title: "طلب ص��اقة جديد",
        message: "محمد العلي يريد متابعتك",
        data: {
          senderId: "barber_2",
          senderName: "محمد العلي",
          requiresAction: true,
        },
        read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // إضافة طل��ات الصداقة للإشعارات إذا لم تكن مو����دة
    friendRequests.forEach((request) => {
      const exists = state.notifications.some((n) => n.id === request.id);
      if (!exists) {
        store.addNotification(request);
      }
    });

    // حفظ أن الإشعارات تم عرضها
    localStorage.setItem(NOTIFICATIONS_SHOWN_KEY, "true");
  };

  // Smart barber loading with instant cache and background sync
  const loadBarbersWithSmartCache = async () => {
    console.log("🚀 Smart barber loading initiated for user:", user?.id);

    if (!user?.id) {
      console.log("�� No user ID, skipping barbers load");
      return;
    }

    try {
      setBarbersLoading(true);
      setShowSkeletons(true);

      // Get barber cache manager
      const barberCache = await getBarberCache(user.id);

      // Get instant cached data
      const { barbers, isFromCache, needsSync } =
        await barberCache.getBarbersWithInstantLoad();

      console.log(`📊 Barber loading results:`, {
        barbersCount: barbers.length,
        isFromCache,
        needsSync,
      });

      if (barbers.length > 0) {
        // Show cached data immediately (0ms delay)
        setAllBarbers(barbers);
        setFilteredBarbers(barbers);
        setBarbersFromCache(isFromCache);
        setShowSkeletons(false);
        setBarbersLoading(false);
        console.log("⚡ Instant barbers loaded from cache:", barbers.length);
      } else {
        // No cache available - show skeletons while loading
        console.log("📱 No cached data - showing skeletons while syncing");
        const skeletons = barberCache.generateSkeletonBarbers();
        setAllBarbers(skeletons);
        setFilteredBarbers(skeletons);
        setBarbersFromCache(false);

        // Load from cache after background sync (with timeout)
        setTimeout(() => {
          loadBarbersFromCache();
        }, 2000);
      }

      // Background sync will update data automatically via event listener
    } catch (error) {
      console.error("❌ Smart barber loading failed:", error);

      // Fallback to skeleton loading
      setShowSkeletons(true);
      setBarbersLoading(false);

      // Try to load from old method as last resort
      setTimeout(() => {
        loadBarbersLegacy();
      }, 1000);
    }
  };

  // Load barbers from cache only (used by background sync updates)
  const loadBarbersFromCache = useCallback(async () => {
    if (!user?.id) return;

    try {
      const barberCache = await getBarberCache(user.id);
      const cachedBarbers = await barberCache.getCachedBarbers();

      if (cachedBarbers.length > 0) {
        // Filter out skeleton entries
        const realBarbers = cachedBarbers.filter(
          (barber) => !(barber as any)._isSkeleton,
        );

        if (realBarbers.length > 0) {
          setAllBarbers(realBarbers);
          setFilteredBarbers(realBarbers);
          setShowSkeletons(false);
          setBarbersLoading(false);
          console.log("🔄 Barbers updated from cache:", realBarbers.length);
        }
      }
    } catch (error) {
      console.warn("Failed to load barbers from cache:", error);
    }
  }, [user?.id]);

  // Legacy barber loading (fallback)
  const loadBarbersLegacy = async () => {
    console.log("🔄 Fallback to legacy barber loading");

    if (!user?.id) return;

    try {
      // Load barbers and following data in parallel
      const [barbersResponse, followingResponse] = await Promise.all([
        apiClient.getBarbers(),
        apiClient.getFollows("following").catch(() => ({ follows: [] })),
      ]);

      const barbers = barbersResponse.barbers || [];
      const followingIds = new Set(
        (followingResponse.follows || []).map((f: any) => f.followed_id),
      );

      if (barbers.length > 0) {
        // Enhanced barbers with correct follow status
        const enhancedBarbers = barbers.map((barber: any) => ({
          ...barber,
          rating: barber.rating || 4.0,
          followers: barber.followers_count || 0,
          distance: 2.5,
          status: barber.status || "متاح",
          isFollowed: followingIds.has(barber.id), // Correct follow status
          price: barber.price || 30,
        }));

        setAllBarbers(enhancedBarbers);
        setFilteredBarbers(enhancedBarbers);

        console.log(
          `🔄 Loaded ${barbers.length} barbers, following ${followingIds.size} users`,
        );
      } else {
        setAllBarbers([]);
        setFilteredBarbers([]);
      }

      setShowSkeletons(false);
      setBarbersLoading(false);
    } catch (error) {
      console.error("Legacy barber loading failed:", error);
      setShowSkeletons(false);
      setBarbersLoading(false);
      setAllBarbers([]);
      setFilteredBarbers([]);
    }
  };

  const loadBookings = async () => {
    // Only load if user is logged in
    if (!user?.id) {
      return;
    }

    try {
      store.setLoading(true);
      const bookingsData = await apiClient.getBookings();
      store.setBookings(bookingsData.bookings || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      store.setLoading(false);
    }
  };

  const handleBookBarber = (barber: any) => {
    setSelectedBarber(barber);
    setShowBookingPage(true);
  };

  const handleBooking = async (
    bookingData: CreateBookingRequest & { message?: string },
  ) => {
    try {
      store.setLoading(true);
      const newBooking = await apiClient.createBooking(bookingData);
      store.addBooking(newBooking);

      // Add notification
      store.addNotification({
        id: Date.now().toString(),
        type: "new_booking",
        title: "تم إر��ال طلب الحجز",
        message: `ت�� إرسال طلب حجز إلى ${selectedBarber?.name}`,
        data: newBooking,
        read: false,
        created_at: new Date().toISOString(),
      });

      setShowBookingPage(false);
      setSelectedBarber(null);
    } catch (error) {
      console.error("Error creating booking:", error);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      store.setLoading(true);

      // Update booking status to cancelled
      await apiClient.updateBooking(bookingId, { status: "cancelled" });

      // Update booking in store
      store.updateBooking(bookingId, { status: "cancelled" });

      // Add notification
      store.addNotification({
        id: Date.now().toString(),
        type: "booking_rejected",
        title: "تم إلغاء الحجز",
        message: "تم إل��اء حجزك ��نجاح",
        data: { bookingId },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error canceling booking:", error);
    } finally {
      store.setLoading(false);
    }
  };

  const handleToggleFollow = async (barberId: string, isFollowed: boolean) => {
    try {
      // Update UI immediately for better user experience
      const updateBarberFollow = (barbers: any[]) =>
        barbers.map((barber) =>
          barber.id === barberId
            ? { ...barber, isFollowed: !isFollowed }
            : barber,
        );

      setFilteredBarbers(updateBarberFollow(filteredBarbers));
      setAllBarbers(updateBarberFollow(allBarbers));

      // Make the API call to update database
      let followResult;
      if (isFollowed) {
        await apiClient.unfollowUser(barberId);
        // Remove from store follows
        const followToRemove = state.follows.find(
          (f) => f.followed_id === barberId,
        );
        if (followToRemove) {
          store.removeFollow(followToRemove.id);
        }
      } else {
        followResult = await apiClient.followUser(barberId);
        // Add to store follows
        const newFollow = followResult || {
          id: Date.now().toString(),
          follower_id: user.id,
          followed_id: barberId,
          created_at: new Date().toISOString(),
        };
        store.addFollow(newFollow);
      }

      // Add notification for successful follow/unfollow
      store.addNotification({
        id: Date.now().toString(),
        type: isFollowed ? "friend_request" : "new_follower",
        title: isFollowed ? "إلغاء ال��تابعة" : "متابع�� ج��يدة",
        message: isFollowed
          ? `تم إلغاء متابعة ${allBarbers.find((b) => b.id === barberId)?.name || "الحلاق"}`
          : `تتابع الآن ${allBarbers.find((b) => b.id === barberId)?.name || "الحلاق"}`,
        data: { barberId },
        read: false,
        created_at: new Date().toISOString(),
      });

      // Update cache with new follow status
      try {
        const barberCache = await getBarberCache(user.id);
        await barberCache.updateFollowStatus(barberId, !isFollowed);
      } catch (error) {
        console.warn("Failed to update follow status in cache:", error);
      }

      // Reload barbers from cache to get updated follow status
      setTimeout(() => {
        loadBarbersFromCache();
      }, 500);
    } catch (error) {
      // Handle 409 conflict gracefully - data already exists/doesn't exist
      if (
        error instanceof Error &&
        (error.message.includes("البيانات موجودة بالفعل") ||
          error.message.includes("تتابع هذا المستخدم بالفع��") ||
          error.message.includes("Already following") ||
          error.message.includes("409"))
      ) {
        // Conflict error - state is already correct, no need to revert
        console.log("Follow state already correct on server");
      } else {
        console.error("Error toggling follow:", error);

        // Revert the UI state since API call failed
        const revertBarberFollow = (barbers: any[]) =>
          barbers.map((barber) =>
            barber.id === barberId
              ? { ...barber, isFollowed: isFollowed } // Revert to original state
              : barber,
          );

        setFilteredBarbers(revertBarberFollow);
        setAllBarbers(revertBarberFollow);

        // Show error notification
        store.addNotification({
          id: Date.now().toString(),
          type: "friend_request",
          title: "خطأ في المتابعة",
          message:
            "حدث خط�� ���ثناء تحديث حالة المتابعة، يرجى ا��محاولة مرة أخرى",
          data: { barberId },
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  const handleViewProfile = (barber: any) => {
    setSelectedProfile({
      ...barber,
      role: "barber",
      status: "active",
      is_verified: true,
      created_at: new Date().toISOString(),
    });
    setShowProfile(true);
  };

  const handleRateBooking = (booking: any) => {
    setSelectedBookingForRating(booking);
    setShowRating(true);
  };

  const handleAdvancedSearch = () => {
    setShowAdvancedSearch(true);
  };

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
      return `��نذ ${diffInDays} ${diffInDays === 1 ? "يوم" : "أيام"}`;
    }
  };

  const handleBookNow = (barber: any) => {
    setSelectedPost(null);
    handleBookBarber({
      ...barber,
      rating: barber.level / 20,
      distance: userLocation ? 2.5 : null,
      price: 30,
      status: "متاح",
      isFollowed: false,
    });
  };

  const loadProfileData = async () => {
    try {
      // ت��ميل الإحصا��يات
      const bookingsData = await apiClient.getBookings();

      // تحميل المتابعين والمتابعين
      const [followersResponse, followingResponse] = await Promise.all([
        apiClient.getFollows("followers"),
        apiClient.getFollows("following"),
      ]);

      const followersData = followersResponse.follows || [];
      const followingData = followingResponse.follows || [];

      // تحميل بيانات المستخدمين الكاملة للمتابعين والمتابعين
      const [enrichedFollowers, enrichedFollowing] = await Promise.all([
        enrichFollowData(followersData, "follower_id"),
        enrichFollowData(followingData, "followed_id"),
      ]);

      setProfileFollowers(enrichedFollowers);
      setProfileFollowing(enrichedFollowing);
      setProfileStats({
        bookings: bookingsData.bookings?.length || 0,
        followers: followersData.length,
        following: followingData.length,
      });
    } catch (error) {
      console.error("Error loading profile data:", error);
      setProfileStats({
        bookings: state.bookings.length,
        followers: 0,
        following: 0,
      });
    }
  };

  // دالة مساعدة لإثراء بيانات المتابعة بمعلومات المستخدمين
  const enrichFollowData = async (followData: any[], userIdField: string) => {
    if (!followData.length) return followData;

    try {
      // استخراج معرفات المستخدمين
      const userIds = followData.map((f) => f[userIdField]);

      // تحميل بيانات المستخدمين من مصادر متعددة
      const [barbersResponse, usersResponse] = await Promise.all([
        apiClient.getBarbers().catch(() => ({ barbers: [] })),
        apiClient.getAllUsers().catch(() => ({ users: [] })),
      ]);

      // دمج جميع المستخدمين
      const allUsers = [
        ...(barbersResponse.barbers || []),
        ...(usersResponse.users || []),
      ];

      // إنشاء خريطة للمستخدمين
      const usersMap = new Map();
      allUsers.forEach((user) => {
        if (user.id) {
          usersMap.set(user.id, user);
        }
      });

      console.log(
        `📊 Enriching ${followData.length} follow records with user data`,
      );
      console.log(`�� Found ${allUsers.length} users in system`);

      // إثراء بيانات المتابعة
      const enrichedData = followData.map((follow) => {
        const userId = follow[userIdField];
        const userData = usersMap.get(userId);

        if (userData) {
          return {
            ...follow,
            [userIdField === "follower_id" ? "follower" : "followed"]: {
              id: userData.id,
              name: userData.name || "مستخدم مجهول",
              avatar_url: userData.avatar_url || "",
              role: userData.role || "customer",
              is_verified: userData.is_verified || false,
              level: userData.level || 0,
            },
          };
        } else {
          // بيانات احتياطية إذا لم نجد المستخدم
          console.warn(`⚠️ User not found: ${userId}`);
          return {
            ...follow,
            [userIdField === "follower_id" ? "follower" : "followed"]: {
              id: userId,
              name: `مستخدم ${userId.slice(-4)}`,
              avatar_url: "",
              role: "customer",
              is_verified: false,
              level: 0,
            },
          };
        }
      });

      const foundUsers = enrichedData.filter((f) => {
        const userField =
          userIdField === "follower_id" ? "follower" : "followed";
        return (
          f[userField] &&
          f[userField].name !== `مستخدم ${f[userIdField].slice(-4)}`
        );
      }).length;

      console.log(
        `✅ Successfully enriched ${foundUsers}/${followData.length} follow records`,
      );

      return enrichedData;
    } catch (error) {
      console.error("Error enriching follow data:", error);
      // إرجاع البيانات كما هي مع بيانات احتياطية
      return followData.map((follow) => {
        const userId = follow[userIdField];
        return {
          ...follow,
          [userIdField === "follower_id" ? "follower" : "followed"]: {
            id: userId,
            name: `مستخدم ${userId.slice(-4)}`,
            avatar_url: "",
            role: "customer",
            is_verified: false,
            level: 0,
          },
        };
      });
    }
  };

  const handleUnfollowFromProfile = async (userId: string) => {
    try {
      await apiClient.unfollowUser(userId);

      // إزالة من Store
      const followToRemove = state.follows.find(
        (f) => f.followed_id === userId,
      );
      if (followToRemove) {
        store.removeFollow(followToRemove.id);
      }

      // تحديث القائمة المحلية
      setProfileFollowing((prev) =>
        prev.filter((f) => f.followed_id !== userId),
      );
      setProfileStats((prev) => ({ ...prev, following: prev.following - 1 }));

      store.addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        title: "إلغاء ا��متابعة",
        message: "تم إلغاء المتابعة ب��جاح",
        data: { userId },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error unfollowing:", error);
    }
  };

  // Utility functions
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "����";
    if (level >= 51) return "🟡";
    if (level >= 21) return "🔹";
    return "🔸";
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "��هبي";
    if (level >= 21) return "محترف";
    return "مبتدئ";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "متاح":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "��شغول":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "accepted":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "��ا�����تظا��";
      case "accepted":
        return "��ق��و��";
      case "rejected":
        return "مرفوض";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

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

  // Show all followed barbers
  if (showFollowedBarbers) {
    const followedBarbers = filteredBarbers.filter(
      (barber) => barber.isFollowed,
    );

    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFollowedBarbers(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              الحلاقين ال��تابعين ({followedBarbers.length})
            </h1>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {followedBarbers.map((barber) => (
            <Card
              key={`all-followed-${barber.id}`}
              className="border-border/50 bg-card/50"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => {
                      setShowFollowedBarbers(false);
                      handleViewProfile(barber);
                    }}
                  >
                    <AvatarImage src={barber.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {barber.name ? barber.name.charAt(0) : "ح"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                        onClick={() => {
                          setShowFollowedBarbers(false);
                          handleViewProfile(barber);
                        }}
                      >
                        {barber.name}
                      </h4>
                      <span className="text-sm">
                        {getLevelIcon(barber.level)}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getLevelLabel(barber.level)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{barber.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{barber.distance} كم</span>
                      </div>
                      <Badge
                        className={cn("text-xs", getStatusColor(barber.status))}
                      >
                        {barber.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleFollow(barber.id, barber.isFollowed)
                      }
                    >
                      إلغاء المت��ب��ة
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        setShowFollowedBarbers(false);
                        handleBookBarber(barber);
                      }}
                    >
                      ح��ز
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {followedBarbers.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  لا تت��بع أي حلاق
                </h3>
                <p className="text-muted-foreground">
                  ا��دأ بمتابعة الحلاقين لرؤ��ت��م ه��ا
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show all bookings
  if (showAllBookings) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAllBookings(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              جميع الحجوزات ({state.bookings.length})
            </h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {state.bookings.map((booking) => (
            <Card key={booking.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">
                      {booking.barber?.name || "الحلاق"}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(booking.datetime)}</span>
                    </div>
                    {(booking as any).message && (
                      <p className="text-sm text-muted-foreground">
                        "الرسالة: {(booking as any).message}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      className={cn(
                        "text-xs",
                        getBookingStatusColor(booking.status),
                      )}
                    >
                      {getBookingStatusLabel(booking.status)}
                    </Badge>
                    {booking.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        إلغاء
                      </Button>
                    )}
                    {booking.status === "cancelled" && (
                      <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                        ملغي
                      </Badge>
                    )}
                    {booking.status === "completed" && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleRateBooking(booking)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        تقييم
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {state.bookings.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  لا توجد حجوزات
                </h3>
                <p className="text-muted-foreground mb-4">
                  احجز موعدك الأول مع أحد الحلاقين
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => {
                    setShowAllBookings(false);
                    // Scroll to nearby barbers after a short delay
                    setTimeout(() => {
                      const nearbySection = document.querySelector(
                        '[data-section="nearby-barbers"]',
                      );
                      if (nearbySection) {
                        nearbySection.scrollIntoView({ behavior: "smooth" });
                      }
                    }, 100);
                  }}
                >
                  احجز الآن
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show all nearby barbers
  if (showNearbyBarbers) {
    const nearbyBarbers = filteredBarbers.filter(
      (barber) => !barber.isFollowed,
    );

    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNearbyBarbers(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              الحلاقين القريبين ({nearbyBarbers.length})
            </h1>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {nearbyBarbers.map((barber) => (
            <Card
              key={`all-nearby-${barber.id}`}
              className="border-border/50 bg-card/50"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => {
                      setShowNearbyBarbers(false);
                      handleViewProfile(barber);
                    }}
                  >
                    <AvatarImage src={barber.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {barber.name ? barber.name.charAt(0) : "ح"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                        onClick={() => {
                          setShowNearbyBarbers(false);
                          handleViewProfile(barber);
                        }}
                      >
                        {barber.name}
                      </h4>
                      <span className="text-sm">
                        {getLevelIcon(barber.level)}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getLevelLabel(barber.level)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{barber.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{barber.distance} كم</span>
                      </div>
                      <Badge
                        className={cn("text-xs", getStatusColor(barber.status))}
                      >
                        {barber.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleFollow(barber.id, barber.isFollowed)
                      }
                    >
                      متابعة
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        setShowNearbyBarbers(false);
                        handleBookBarber(barber);
                      }}
                    >
                      حجز
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {nearbyBarbers.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  ����� توجد ����اقين قريبين
                </h3>
                <p className="text-muted-foreground">
                  جاري ��لبحث عن حلاقين في منطقت��
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show booking page
  if (showBookingPage && selectedBarber) {
    return (
      <BookingPage
        barber={selectedBarber}
        onBook={handleBooking}
        onBack={() => {
          setShowBookingPage(false);
          setSelectedBarber(null);
        }}
      />
    );
  }

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
        onBooking={() => {
          setShowProfile(false);
          setSelectedBarber(selectedProfile);
          setShowBookingPage(true);
        }}
        onFollow={() => {
          // Reload barbers to reflect follow status changes
          setTimeout(() => {
            loadBarbersFromCache();
          }, 500);
        }}
        onUnfollow={() => {
          // Reload barbers to reflect follow status changes
          setTimeout(() => {
            loadBarbersFromCache();
          }, 500);
        }}
      />
    );
  }

  // Show rating page
  if (showRating && selectedBookingForRating) {
    return (
      <RatingPage
        user={user}
        booking={selectedBookingForRating}
        onBack={() => {
          setShowRating(false);
          setSelectedBookingForRating(null);
        }}
        onComplete={() => {
          // Refresh bookings to update status
          loadBookings();
        }}
      />
    );
  }

  // Show advanced search
  if (showAdvancedSearch) {
    return (
      <AdvancedSearchPage
        user={user}
        onBack={() => setShowAdvancedSearch(false)}
        onSelectBarber={(barber) => {
          setShowAdvancedSearch(false);
          handleViewProfile(barber);
        }}
      />
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
          // User is already updated in store by EditProfilePage
          setShowEditProfile(false);
        }}
      />
    );
  }

  const renderHome = () => {
    const followedBarbers = filteredBarbers.filter(
      (barber) => barber.isFollowed,
    );
    const nearbyBarbers = filteredBarbers.filter(
      (barber) => !barber.isFollowed,
    );

    return (
      <div className="w-full max-w-full overflow-hidden p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Location & Welcome Section */}
        <div className="space-y-4">
          {/* Location Bar */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {isLoadingLocation ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                  <span className="text-sm text-primary">
                    جاري ��حديد الموقع...
                  </span>
                </div>
              ) : userLocation ? (
                <div className="text-center">
                  <span className="text-sm font-medium text-primary">
                    {userLocation.address}
                  </span>
                  <div className="text-xs text-primary/80 mt-0.5">
                    موقعك الحالي • ��قة عالية
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    لم يتم تحديد الموقع
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary p-0 h-auto ml-2"
                    onClick={requestLocation}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Welcome */}
          <div className="text-center py-4 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              مرحباً {user.name}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              ابحث عن أفضل ا��حلاقين واحجز موعدك
            </p>
          </div>
        </div>

        {/* Quick Actions & Bookings Section */}
        <div className="space-y-4">
          {/* Recent Bookings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                حجو��اتي الأخيرة
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm text-primary"
                onClick={() => setShowAllBookings(true)}
              >
                عرض الكل
              </Button>
            </div>

            {/* Show last 2 bookings */}
            {state.bookings.length > 0 ? (
              <div className="space-y-3">
                {state.bookings.slice(0, 2).map((booking) => (
                  <Card
                    key={booking.id}
                    className="border-border/50 bg-card/50"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground text-sm sm:text-base">
                            {booking.barber?.name || "الحلاق"}
                          </h4>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(booking.datetime)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            className={cn(
                              "text-xs",
                              getBookingStatusColor(booking.status),
                            )}
                          >
                            {getBookingStatusLabel(booking.status)}
                          </Badge>
                          {booking.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              إلغاء
                            </Button>
                          )}
                          {booking.status === "completed" && (
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-xs"
                              onClick={() => handleRateBooking(booking)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              تقييم
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {/* Show All Bookings Button */}
                {state.bookings.length > 2 && (
                  <Card className="border-border/50 bg-card/50">
                    <CardContent className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm text-primary w-full"
                        onClick={() => setShowAllBookings(true)}
                      >
                        عرض جميع الحجوزات ({state.bookings.length})
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-6 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium text-foreground mb-2">
                    لا توجد حجوزات
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    احجز موعدك الأول مع أحد الحلاقين
                  </p>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => {
                      // Scroll to nearby barbers section
                      const nearbySection = document.querySelector(
                        '[data-section="nearby-barbers"]',
                      );
                      if (nearbySection) {
                        nearbySection.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    احجز الآن
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Followed Barbers Section */}
        {followedBarbers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                الحلا��ين المتابعين
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setShowFollowedBarbers(true)}
              >
                عر�� الكل ({followedBarbers.length})
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {followedBarbers.slice(0, 4).map((barber) => (
                <Card
                  key={`followed-${barber.id}`}
                  className="border-border/50 bg-card/50"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                        onClick={() => handleViewProfile(barber)}
                      >
                        <AvatarImage src={barber.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {barber.name ? barber.name.charAt(0) : "ح"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors text-sm truncate"
                            onClick={() => handleViewProfile(barber)}
                          >
                            {barber.name}
                          </h4>
                          <span className="text-xs">
                            {getLevelIcon(barber.level)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{barber.rating}</span>
                          </div>
                          <Badge
                            className={cn(
                              "text-xs",
                              getStatusColor(barber.status),
                            )}
                          >
                            {barber.status}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-xs shrink-0"
                        onClick={() => handleBookBarber(barber)}
                      >
                        حجز
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Barbers Section */}
        <div className="space-y-4" data-section="nearby-barbers">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              الحلاقين القريبين
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => setShowNearbyBarbers(true)}
            >
              عرض الكل
            </Button>
          </div>

          {/* Ultra-Fast Loading State */}
          {(showSkeletons || (barbersLoading && allBarbers.length === 0)) && (
            <UltraFastSkeletonGrid count={6} variant="barber" />
          )}

          {/* No Barbers Message - Only show if not loading and no skeletons */}
          {!barbersLoading && !showSkeletons && nearbyBarbers.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  جاري البحث عن حلاقين
                </h3>
                <p className="text-muted-foreground mb-4">
                  يتم تحديث قائمة الحلاقين في الخلفية...
                </p>
                {barbersFromCache && (
                  <div className="text-xs text-muted-foreground">
                    📱 البيانات المحفوظة متاحة
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Barbers List - Show if not loading skeletons */}
          {!showSkeletons &&
            !barbersLoading &&
            nearbyBarbers.slice(0, 3).map((barber) => (
              <Card key={barber.id} className="border-border/50 bg-card/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar
                      className="h-10 w-10 sm:h-12 sm:w-12 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      onClick={() => handleViewProfile(barber)}
                    >
                      <AvatarImage src={barber.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm sm:text-base">
                        {barber.name ? barber.name.charAt(0) : "ح"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors text-sm sm:text-base truncate"
                          onClick={() => handleViewProfile(barber)}
                        >
                          {barber.name}
                        </h4>
                        <span className="text-xs sm:text-sm">
                          {getLevelIcon(barber.level)}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getLevelLabel(barber.level)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{barber.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="whitespace-nowrap">
                            {barber.distance} كم
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{barber.followers}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Badge
                        className={cn("text-xs", getStatusColor(barber.status))}
                      >
                        {barber.status}
                      </Badge>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-xs sm:text-sm"
                        onClick={() => handleBookBarber(barber)}
                      >
                        حجز
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Suggestions Section */}
        {nearbyBarbers.length > 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                اقتراحات مميزة
              </h3>
              <Badge variant="outline" className="text-xs">
                جديد
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nearbyBarbers.slice(3, 6).map((barber) => (
                <Card
                  key={`suggested-${barber.id}`}
                  className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-primary/20 text-primary"
                    >
                      مُقترح
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <Avatar
                        className="h-12 w-12 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleViewProfile(barber)}
                      >
                        <AvatarImage src={barber.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {barber.name ? barber.name.charAt(0) : "ح"}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h4
                          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors text-sm truncate"
                          onClick={() => handleViewProfile(barber)}
                        >
                          {barber.name}
                        </h4>
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{barber.rating}</span>
                          <span>•</span>
                          <span>{barber.distance} كم</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() =>
                            handleToggleFollow(barber.id, barber.isFollowed)
                          }
                        >
                          متابعة
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-xs"
                          onClick={() => handleBookBarber(barber)}
                        >
                          حجز
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredBarbers.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا توجد حلا���ين قريبين
              </h3>
              <p className="text-muted-foreground mb-4">
                سنعرض لك الحلاقين ا��متاحين في من��قت�� قريباً
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                تحد��ث الموقع
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Filter posts to show only featured content
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

  const renderSearch = () => (
    <div className="p-4 space-y-4">
      {/* شريط البح�� */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={exploreSearchQuery}
          onChange={(e) => setExploreSearchQuery(e.target.value)}
          placeholder="ابحث ��ن حلاق..."
          className="pr-10 text-right"
        />
      </div>

      {/* فلتر الترتيب */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">ترتيب حسب:</span>
        <Select value={exploreSortBy} onValueChange={setExploreSortBy}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">⏱ ا��أحدث</SelectItem>
            <SelectItem value="rating">⭐ الأفض��</SelectItem>
            <SelectItem value="distance">📍 الأقر��</SelectItem>
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
                {getLevelIcon(post.user?.level || 1)}
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
            لا ��وجد منشورات مميزة
          </h3>
          <p className="text-muted-foreground">
            {exploreSearchQuery
              ? "جر�� البحث بكلمة أخرى من المنشورات ال����يزة"
              : "لا توجد منشورات مميزة متا��ة حالياً"}
          </p>
        </div>
      )}

      {/* Modal تفاصيل المنشور */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-md mx-auto">
          {selectedPost && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="sr-only">تفاصيل المنشور</DialogTitle>
              </DialogHeader>

              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={selectedPost.image_url}
                  alt={selectedPost.caption}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPost.user.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedPost.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">
                      {selectedPost.user.name}
                    </h4>
                    <span>{getLevelIcon(selectedPost.user.level)}</span>
                    <Badge variant="secondary" className="text-xs">
                      موثق
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeAgo(selectedPost.created_at)}
                  </p>
                </div>
              </div>

              {selectedPost.caption && (
                <p className="text-sm text-foreground">
                  {selectedPost.caption}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {selectedPost.likes} إعجا��
                </span>
              </div>

              <Button
                onClick={() => handleBookNow(selectedPost.user)}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                احجز الآن
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderBookings = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-foreground">حجوزاتي</h2>

      <div className="space-y-4">
        {state.bookings.map((booking) => (
          <Card key={booking.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    {booking.barber?.name || "الحلاق"}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.datetime)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge
                    className={cn(
                      "text-xs",
                      getBookingStatusColor(booking.status),
                    )}
                  >
                    {getBookingStatusLabel(booking.status)}
                  </Badge>
                  {booking.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      إلغاء
                    </Button>
                  )}
                  {booking.status === "cancelled" && (
                    <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      ملغي
                    </Badge>
                  )}
                  {booking.status === "completed" && (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleRateBooking(booking)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      تقييم
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {state.bookings.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                لا ��وجد حجوزات
              </h3>
              <p className="text-muted-foreground mb-4">
                احجز موعدك الأ��ل مع أحد الحل��قين
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                احجز الآن
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (showFollowers) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFollowers(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold">
              ال��تابعين ({profileFollowers.length})
            </h2>
          </div>

          <div className="space-y-3">
            {profileFollowers.map((follower) => (
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
                          `مستخدم ${follower.follower_id.slice(-4)}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {follower.follower?.role === "barber"
                          ? "حلاق"
                          : "��بون"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      ��رض الملف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {profileFollowers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا يوجد متا��عين حالياً</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (showFollowing) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFollowing(false)}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold">
              المتابَعين ({profileFollowing.length})
            </h2>
          </div>

          <div className="space-y-3">
            {profileFollowing.map((follow) => (
              <Card
                key={follow.followed_id}
                className="border-border/50 bg-card/50"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={follow.followed?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {follow.followed?.name?.charAt(0) || "ح"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {follow.followed?.name ||
                          `مستخ��م ${follow.followed_id.slice(-4)}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {follow.followed?.role === "barber" ? "حلاق" : "زبون"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleUnfollowFromProfile(follow.followed_id)
                      }
                    >
                      إلغاء المتا��عة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {profileFollowing.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا تتابع أحداً حالياً</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-6">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-6">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">
                  {user.name ? user.name.charAt(0) : "م"}
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
                <Badge variant="outline" className="text-xs sm:text-sm">
                  زبون
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {profileStats.bookings}
                </p>
                <p className="text-sm text-muted-foreground">ح����وز��ت</p>
              </div>
              <div
                className="cursor-pointer"
                onClick={() => setShowFollowers(true)}
              >
                <p className="text-2xl font-bold text-primary">
                  {profileStats.followers}
                </p>
                <p className="text-sm text-muted-foreground">متابعين</p>
              </div>
              <div
                className="cursor-pointer"
                onClick={() => setShowFollowing(true)}
              >
                <p className="text-2xl font-bold text-primary">
                  {profileStats.following}
                </p>
                <p className="text-sm text-muted-foreground">متابع</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
            الإعدا��ا��
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleAdvancedSearch}
          >
            <Search className="h-4 w-4" />
            البحث المتقدم
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setShowEditProfile(true)}
          >
            <UserIcon className="h-4 w-4" />
            تع��يل ��لملف الشخصي
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start gap-3"
            onClick={onLogout}
          >
            ��سجيل خروج
          </Button>
        </div>
      </div>
    );
  };

  switch (activeTab) {
    case "homepage":
      return (
        <div>
          {/* Debug button in development */}
          {import.meta.env.DEV && (
            <div className="p-2 bg-yellow-100 border-b">
              <button
                onClick={() => (window.location.href = "/test-newsfeed")}
                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded"
              >
                🧪 اختبار InstagramNewsFeed
              </button>
            </div>
          )}
          <InstagramNewsFeed
            user={user}
            onUserClick={(selectedUser) => {
              setSelectedProfile(selectedUser);
              setShowProfile(true);
            }}
          />
        </div>
      );
    case "home":
      return renderHome();
    case "search":
      return (
        <ExplorePageWithTabs
          user={user}
          onUserClick={(selectedUser) => {
            setSelectedProfile(selectedUser);
            setShowProfile(true);
          }}
        />
      );
    case "bookings":
      return renderBookings();
    case "messages":
      return <MessagesPage user={user} onBack={() => window.history.back()} />;
    case "profile":
      return renderProfile();
    default:
      return renderHome();
  }
}
