import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";

export function useMessageNotifications() {
  const [state, store] = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!state.user) return;

    // Check for new messages every 10 seconds
    const checkForNewMessages = async () => {
      try {
        const response = await apiClient.getUnreadMessageCount();
        const unreadCount = response.count;

        // Store unread count in state if needed
        // You can extend the store to include unread message count

        // If there are new unread messages, could trigger a notification
        if (unreadCount > 0) {
          console.log(`You have ${unreadCount} unread messages`);
        }
      } catch (error) {
        console.error("Error checking for new messages:", error);
      }
    };

    // Initial check
    checkForNewMessages();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(checkForNewMessages, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.user]);

  return {
    // Can return functions to manually trigger checks or manage notifications
    refreshUnreadCount: async () => {
      try {
        const response = await apiClient.getUnreadMessageCount();
        return response.count;
      } catch (error) {
        console.error("Error refreshing unread count:", error);
        return 0;
      }
    },
  };
}
