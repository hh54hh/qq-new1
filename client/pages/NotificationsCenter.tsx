import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Check,
  X,
  Star,
  Calendar,
  UserPlus,
  MessageSquare,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { User } from "@shared/api";
import { AppNotification, useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationsCenterProps {
  user: User;
  onBack: () => void;
}

const notificationIcons = {
  booking_accepted: { icon: Check, color: "text-green-500" },
  booking_rejected: { icon: X, color: "text-red-500" },
  new_follower: { icon: UserPlus, color: "text-blue-500" },
  friend_request: { icon: UserPlus, color: "text-purple-500" },
  new_booking: { icon: Calendar, color: "text-primary" },
  new_rating: { icon: Star, color: "text-yellow-500" },
  achievement: { icon: Award, color: "text-golden-500" },
  reminder: { icon: Clock, color: "text-orange-500" },
  system: { icon: Bell, color: "text-gray-500" },
};

export default function NotificationsCenter({
  user,
  onBack,
}: NotificationsCenterProps) {
  const [state, store] = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Load notifications from API
      const response = await apiClient.getNotifications();
      const notifications = response.notifications as AppNotification[];

      // Clear existing notifications and add new ones
      if (state.notifications.length === 0) {
        notifications.forEach((notification) => {
          store.addNotification(notification);
        });
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      store.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      state.notifications
        .filter((n) => !n.read)
        .forEach((n) => store.markNotificationAsRead(n.id));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Delete from backend when available
      // await apiClient.deleteNotification(notificationId);

      // Remove from local state
      const updatedNotifications = state.notifications.filter(
        (notification) => notification.id !== notificationId,
      );

      // Update store
      store.setNotifications(updatedNotifications);

      // Show success message
      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم حذف ال��شعار",
        message: "تم حذف الإشعار بنجاح",
        data: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleAcceptFriendRequest = async (notification: AppNotification) => {
    try {
      const senderId = notification.data?.senderId;
      if (!senderId) return;

      // قبول طلب الصداقة (متابعة المستخدم)
      await apiClient.followUser(senderId);

      // تحديث الإشعار ليصبح مقروءاً
      store.markNotificationAsRead(notification.id);

      // إضافة إشعار جديد للتأكيد
      store.addNotification({
        id: Date.now().toString(),
        type: "new_follower",
        title: "تم قبول طلب المتابعة",
        message: `أصبحت تتابع ${notification.data?.senderName}`,
        data: { userId: senderId },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectFriendRequest = async (notification: AppNotification) => {
    try {
      // تحديث الإشعار ليصبح مقروءاً
      store.markNotificationAsRead(notification.id);

      // إضافة إشعار للتأكيد
      store.addNotification({
        id: Date.now().toString(),
        type: "system",
        title: "تم رفض طلب المتابعة",
        message: `رفضت طلب المتابعة من ${notification.data?.senderName}`,
        data: { userId: notification.data?.senderId },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const getFilteredNotifications = () => {
    switch (selectedTab) {
      case "unread":
        return state.notifications.filter((n) => !n.read);
      case "bookings":
        return state.notifications.filter((n) =>
          [
            "new_booking",
            "booking_accepted",
            "booking_rejected",
            "reminder",
          ].includes(n.type),
        );
      case "social":
        return state.notifications.filter((n) =>
          ["new_follower", "friend_request", "new_rating"].includes(n.type),
        );
      case "friend_requests":
        return state.notifications.filter((n) => n.type === "friend_request");
      default:
        return state.notifications;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };

  const getNotificationIcon = (type: string) => {
    const config =
      notificationIcons[type as keyof typeof notificationIcons] ||
      notificationIcons.system;
    const IconComponent = config.icon;
    return <IconComponent className={cn("h-5 w-5", config.color)} />;
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle different notification types
    switch (notification.type) {
      case "new_booking":
        // Navigate to bookings
        break;
      case "new_rating":
        // Navigate to ratings
        break;
      case "new_follower":
        // Navigate to followers
        break;
      default:
        break;
    }
  };

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">الإشعارات</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              قراءة الكل
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <Bell className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">
                {state.notifications.length}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="h-6 w-6 bg-red-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {unreadCount}
                </span>
              </div>
              <p className="text-lg font-bold text-foreground">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">غير مقروءة</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">
                {
                  state.notifications.filter(
                    (n) =>
                      n.created_at >
                      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">اليوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="unread">غير مقروءة</TabsTrigger>
            <TabsTrigger value="friend_requests">طلبات صداقة</TabsTrigger>
            <TabsTrigger value="bookings">حجوزات</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            <div className="space-y-3">
              {filteredNotifications.length > 0 ? (
                filteredNotifications
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((notification) => (
                    <Card
                      key={notification.id}
                      className={cn(
                        "border-border/50 cursor-pointer transition-colors",
                        notification.read
                          ? "bg-card/30"
                          : "bg-card/80 border-primary/20",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4
                                className={cn(
                                  "font-medium",
                                  notification.read
                                    ? "text-muted-foreground"
                                    : "text-foreground",
                                )}
                              >
                                {notification.title}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>

                            <p
                              className={cn(
                                "text-sm",
                                notification.read
                                  ? "text-muted-foreground"
                                  : "text-foreground",
                              )}
                            >
                              {notification.message}
                            </p>

                            {/* أزرار خاصة لطلبات الصداقة */}
                            {notification.type === "friend_request" &&
                              notification.data?.requiresAction && (
                                <div className="flex items-center gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptFriendRequest(notification);
                                    }}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500 text-red-500 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectFriendRequest(notification);
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    رفض
                                  </Button>
                                </div>
                              )}

                            {/* زر القراءة للإشعارات العادية */}
                            {!notification.read &&
                              notification.type !== "friend_request" && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    تم القراءة
                                  </Button>
                                </div>
                              )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      لا توجد إشعارات
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedTab === "unread"
                        ? "تمت قراءة جميع الإشعارات"
                        : "ستظهر الإشعارات الجديدة هنا"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
