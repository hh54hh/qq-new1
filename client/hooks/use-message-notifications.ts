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

    // Check for new messages with better error handling
    const checkForNewMessages = async () => {
      // لا تحقق إذا لم يكن هناك اتصال
      if (!isOnline) {
        console.log("📏 تخطي فحص الرسائل - لا يوجد اتصال");
        return;
      }

      try {
        const response = await networkAwareAPI.safeRequest(
          () => apiClient.getUnreadMessageCount(),
          { count: 0 },
        );
        const unreadCount = response?.count || 0;

        // إعادة تعيين عداد الأخطاء عند النجاح
        setConsecutiveErrors(0);

        // تحديث العدد المحفوظ
        if (unreadCount !== lastUnreadCount) {
          setLastUnreadCount(unreadCount);

          // إظهار إشعار عند وجود رسائل جديدة
          if (unreadCount > lastUnreadCount && unreadCount > 0) {
            console.log(`📩 لديك ${unreadCount} رسائل غير مقروءة`);
          }
        }
      } catch (error: any) {
        setConsecutiveErrors((prev) => prev + 1);

        // طباعة أقل للأخطاء المتكررة
        if (consecutiveErrors < 3) {
          console.warn(
            `⚠️ فشل فحص الرسائل (${consecutiveErrors + 1}/3):`,
            error.message,
          );
        } else if (consecutiveErrors === 3) {
          console.warn("😵 تم إيقاف طباعة أخطاء فحص الرسائل لتجنب الإزعاج");
        }

        // زيادة فترة الانتظار عند وجود أخطاء متكررة
        if (consecutiveErrors >= 3) {
          clearInterval(intervalRef.current!);

          // إعادة بدء الفحص بعد 30 ثانية
          setTimeout(() => {
            if (state.user && isOnline) {
              intervalRef.current = setInterval(checkForNewMessages, 30000); // 30 ثانية بدلاً من 10
            }
          }, 30000);
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
        const response = await apiClient.getUnreadMessageCount();
        setLastUnreadCount(response.count);
        return response.count;
      } catch (error: any) {
        console.warn("⚠️ فشل تحديث عدد الرسائل:", error.message);
        return lastUnreadCount; // إرجاع آخر عدد محفوظ
      }
    },
    lastUnreadCount,
  };
}
