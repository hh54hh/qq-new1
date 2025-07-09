import { useState, useEffect, useCallback } from "react";

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  installPrompt: any;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  notificationPermission: NotificationPermission;
}

interface PWAHookReturn extends PWAState {
  installApp: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  updateApp: () => void;
  isUpdateAvailable: boolean;
  clearCache: () => Promise<void>;
  syncData: () => Promise<void>;
  getStorageUsage: () => Promise<StorageEstimate | null>;
}

export function usePWA(): PWAHookReturn {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    installPrompt: null,
    swRegistration: null,
    updateAvailable: false,
    notificationPermission: "default",
  });

  // تحقق من حالة التثبيت
  const checkInstallStatus = useCallback(() => {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIOSInstalled = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isIOSInstalled;

    setState((prev) => ({ ...prev, isInstalled }));
    return isInstalled;
  }, []);

  // تهيئة PWA
  useEffect(() => {
    let cleanup: (() => void)[] = [];

    const initialize = async () => {
      // حالة التثبيت
      checkInstallStatus();

      // حالة الإشعارات
      if ("Notification" in window) {
        setState((prev) => ({
          ...prev,
          notificationPermission: Notification.permission,
        }));
      }

      // Service Worker
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          setState((prev) => ({ ...prev, swRegistration: registration }));

          // مراقبة التحديثات
          const handleUpdate = () => {
            setState((prev) => ({ ...prev, updateAvailable: true }));
          };

          registration.addEventListener("updatefound", handleUpdate);
          cleanup.push(() =>
            registration.removeEventListener("updatefound", handleUpdate),
          );

          // تحقق من وجود SW في انتظار التفعيل
          if (registration.waiting) {
            setState((prev) => ({ ...prev, updateAvailable: true }));
          }
        } catch (error) {
          console.warn("Service Worker registration failed:", error);
        }
      }

      // مراقبة حالة الشبكة
      const handleOnline = () =>
        setState((prev) => ({ ...prev, isOnline: true }));
      const handleOffline = () =>
        setState((prev) => ({ ...prev, isOnline: false }));

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      cleanup.push(() => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      });

      // مراقبة Install Prompt
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setState((prev) => ({ ...prev, installPrompt: e }));
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      cleanup.push(() =>
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        ),
      );

      // مراقبة تغييرات التثبيت
      const handleAppInstalled = () => {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          installPrompt: null,
        }));
      };

      window.addEventListener("appinstalled", handleAppInstalled);
      cleanup.push(() =>
        window.removeEventListener("appinstalled", handleAppInstalled),
      );
    };

    initialize();

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [checkInstallStatus]);

  // تثبيت التطبيق
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) return false;

    try {
      state.installPrompt.prompt();
      const result = await state.installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setState((prev) => ({
          ...prev,
          installPrompt: null,
          isInstalled: true,
        }));
        return true;
      }
    } catch (error) {
      console.error("App installation failed:", error);
    }

    return false;
  }, [state.installPrompt]);

  // طلب إذن الإشعارات
  const requestNotificationPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!("Notification" in window)) return "denied";

      try {
        const permission = await Notification.requestPermission();
        setState((prev) => ({ ...prev, notificationPermission: permission }));

        // إذا تم الموافقة، قم بتسجيل Push Notifications
        if (permission === "granted" && state.swRegistration?.pushManager) {
          await subscribeToPushNotifications(state.swRegistration);
        }

        return permission;
      } catch (error) {
        console.error("Notification permission request failed:", error);
        return "denied";
      }
    }, [state.swRegistration]);

  // تحديث التطبيق
  const updateApp = useCallback(() => {
    if (state.swRegistration?.waiting) {
      state.swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });

      // إعادة تحميل الصفحة بعد قليل
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [state.swRegistration]);

  // مسح التخزين المؤقت
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // مسح Local Storage (اختياري)
      const shouldClearStorage = confirm(
        "هل تريد أيضاً مسح البيانات المحفوظة محلياً؟",
      );
      if (shouldClearStorage) {
        localStorage.clear();
        sessionStorage.clear();
      }

      // إشعار Service Worker
      if (state.swRegistration) {
        const messageChannel = new MessageChannel();
        state.swRegistration.active?.postMessage({ type: "CLEAR_CACHE" }, [
          messageChannel.port2,
        ]);
      }

      console.log("Cache cleared successfully");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw error;
    }
  }, [state.swRegistration]);

  // مزامنة البيانات
  const syncData = useCallback(async (): Promise<void> => {
    if (!state.swRegistration || !state.isOnline) return;

    try {
      // تسجيل Background Sync
      if (
        state.swRegistration?.sync &&
        "sync" in window.ServiceWorkerRegistration.prototype
      ) {
        await state.swRegistration.sync.register("background-sync-bookings");
        await state.swRegistration.sync.register("background-sync-messages");
        await state.swRegistration.sync.register("background-sync-posts");
      }

      console.log("Background sync registered");
    } catch (error) {
      console.error("Background sync registration failed:", error);
    }
  }, [state.swRegistration, state.isOnline]);

  // الحصول على معلومات استخدام التخزين
  const getStorageUsage =
    useCallback(async (): Promise<StorageEstimate | null> => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          return await navigator.storage.estimate();
        } catch (error) {
          console.error("Failed to get storage estimate:", error);
        }
      }
      return null;
    }, []);

  return {
    ...state,
    installApp,
    requestNotificationPermission,
    updateApp,
    isUpdateAvailable: state.updateAvailable,
    clearCache,
    syncData,
    getStorageUsage,
  };
}

// مساعدات
async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  if (!registration.pushManager) return;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.VITE_VAPID_PUBLIC_KEY ||
          "BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLSjL4k5UfrvIWD1KpIYMXKjjqONq8JRNfqJBtJUV8Rvo1P2Q7FN9E",
      ),
    });

    // إرسال الاشتراك للخادم
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify(subscription),
    });

    console.log("Push notifications subscribed");
  } catch (error) {
    console.error("Push subscription failed:", error);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Hook للحصول على معلومات Storage
export function useStorageInfo() {
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const getStorageInfo = async () => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 0;
          const percentage = quota > 0 ? (usage / quota) * 100 : 0;

          setStorageInfo({ usage, quota, percentage });
        } catch (error) {
          console.error("Failed to get storage info:", error);
        }
      }
    };

    getStorageInfo();

    // تحديث كل 30 ثانية
    const interval = setInterval(getStorageInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  return storageInfo;
}

// Hook لمراقبة حالة الشبكة
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // معلومات الاتص��ل إذا متوفرة
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || "unknown");

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || "unknown");
      };

      connection.addEventListener("change", handleConnectionChange);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}
