import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import networkAwareAPI from "@/lib/api-wrapper";
import { useNetworkStatus } from "@/lib/chat-storage";

export function useMessageNotifications() {
  const [state, store] = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastUnreadCount, setLastUnreadCount] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (!state.user) return;

    // Check for new messages with improved error handling
    const checkForNewMessages = async () => {
      // لا تحقق إذا لم يكن هناك اتصال
      if (!isOnline) {
        return;
      }

      // استخدام safeRequest للتعامل مع الأخطاء بشكل لطيف
      const response = await networkAwareAPI.safeRequest(
        () => apiClient.getUnreadMessageCount(),
        { count: 0 },
      );

      const unreadCount = response?.count || 0;

      // إعادة تعيين عداد الأخطاء عند الحصول على استجاب��
      setConsecutiveErrors(0);

      // تحديث العدد المحفوظ
      if (unreadCount !== lastUnreadCount) {
        setLastUnreadCount(unreadCount);

        // إظهار إشعار عند وجود رسائل جديدة
        if (unreadCount > lastUnreadCount && unreadCount > 0) {
          console.log(`📩 لديك ${unreadCount} رسائل غير مقروءة`);
        }
      }
    };

    // Initial check
    checkForNewMessages();

    // بدء الفحص الدوري فقط عند وجود اتصال
    if (isOnline) {
      intervalRef.current = setInterval(checkForNewMessages, 15000); // 15 ثانية
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.user]);

  return {
    // Can return functions to manually trigger checks or manage notifications
    refreshUnreadCount: async () => {
      if (!isOnline) {
        console.log("📏 تخطي تحديث عدد الرسائل - لا يوجد اتصال");
        return lastUnreadCount; // إرجاع آخر عدد محفوظ
      }

      try {
        const response = await networkAwareAPI.safeRequest(
          () => apiClient.getUnreadMessageCount(),
          { count: 0 },
        );
        setLastUnreadCount(response?.count || 0);
        return response.count;
      } catch (error: any) {
        console.warn("⚠️ فشل تحديث عدد الرسائل:", error.message);
        return lastUnreadCount; // إرجاع آخر عدد محفوظ
      }
    },
    lastUnreadCount,
  };
}
