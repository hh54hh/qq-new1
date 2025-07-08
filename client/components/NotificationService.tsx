import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore, AppNotification } from "@/lib/store";

export default function NotificationService() {
  const [state, store] = useAppStore();

  useEffect(() => {
    // Check for new notifications
    const unreadNotifications = state.notifications.filter((n) => !n.read);

    unreadNotifications.forEach((notification) => {
      showNotification(notification);
      store.markNotificationAsRead(notification.id);
    });
  }, [state.notifications]);

  const showNotification = (notification: AppNotification) => {
    const { type, title, message } = notification;

    switch (type) {
      case "booking_accepted":
        toast.success(title, {
          description: message,
          duration: 5000,
        });
        break;
      case "booking_rejected":
        toast.error(title, {
          description: message,
          duration: 5000,
        });
        break;
      case "new_booking":
        toast.info(title, {
          description: message,
          duration: 5000,
        });
        break;
      case "new_follower":
        toast.success(title, {
          description: message,
          duration: 5000,
        });
        break;
      case "friend_request":
        toast.info(title, {
          description: message,
          duration: 5000,
          action: notification.data?.requiresAction
            ? {
                label: "عرض",
                onClick: () => {
                  // يمكن إضافة منطق لفتح صفحة معينة أو modal
                  console.log("Friend request action clicked");
                },
              }
            : undefined,
        });
        break;
      default:
        toast(title, {
          description: message,
          duration: 3000,
        });
    }
  };

  // Request notification permission if not granted
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return null;
}
