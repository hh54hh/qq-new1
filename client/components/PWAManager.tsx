import React, { useState, useEffect } from "react";
import {
  Download,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PWAManagerProps {
  className?: string;
}

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  installPrompt: any;
  notificationPermission: NotificationPermission;
  updateAvailable: boolean;
}

export default function PWAManager({ className }: PWAManagerProps) {
  const { toast } = useToast();
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    swRegistration: null,
    installPrompt: null,
    notificationPermission: "default",
    updateAvailable: false,
  });

  const [settings, setSettings] = useState({
    autoSync: true,
    notifications: false,
    backgroundSync: true,
    offlineMode: true,
  });

  useEffect(() => {
    initializePWA();
    setupEventListeners();

    return cleanup;
  }, []);

  const initializePWA = async () => {
    // تحقق من Service Worker
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        setPwaState((prev) => ({ ...prev, swRegistration: registration }));

        // تحقق من التحديثات
        registration.addEventListener("updatefound", () => {
          setPwaState((prev) => ({ ...prev, updateAvailable: true }));
        });
      } catch (error) {
        console.warn("Service Worker not available:", error);
      }
    }

    // تحقق من حالة التثبيت
    checkInstallationStatus();

    // تحقق من إذن الإشعارات
    if ("Notification" in window) {
      setPwaState((prev) => ({
        ...prev,
        notificationPermission: Notification.permission,
      }));
    }

    // تحديد الإعدادات المحفوظة
    loadSettings();
  };

  const setupEventListeners = () => {
    // مراقبة حالة الشبكة
    const handleOnline = () => {
      setPwaState((prev) => ({ ...prev, isOnline: true }));
      toast({
        title: "🌐 تم استعادة الاتصال",
        description: "يتم الآن مزامنة البيانات المعلقة",
      });
      syncPendingData();
    };

    const handleOffline = () => {
      setPwaState((prev) => ({ ...prev, isOnline: false }));
      toast({
        title: "📡 انقطع الاتصال",
        description: "التطبيق يعمل الآن في الوضع غير المتصل",
        variant: "destructive",
      });
    };

    // مراقبة Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPwaState((prev) => ({ ...prev, installPrompt: e }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  };

  const cleanup = () => {
    // تنظيف المستمعين عند إلغاء المكون
  };

  const checkInstallationStatus = () => {
    // تحقق من وضع standalone (مثبت)
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIOSInstalled = (window.navigator as any).standalone === true;

    setPwaState((prev) => ({
      ...prev,
      isInstalled: isStandalone || isIOSInstalled,
    }));
  };

  const loadSettings = () => {
    const saved = localStorage.getItem("pwa_settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem("pwa_settings", JSON.stringify(newSettings));
  };

  const handleInstallApp = async () => {
    if (pwaState.installPrompt) {
      pwaState.installPrompt.prompt();
      const result = await pwaState.installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setPwaState((prev) => ({
          ...prev,
          installPrompt: null,
          isInstalled: true,
        }));
        toast({
          title: "🎉 تم تثبيت التطبيق بنجاح!",
          description: "يمكنك الآن الوصول للتطبيق من الشاشة الرئيسية",
        });
      }
    }
  };

  const handleEnableNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setPwaState((prev) => ({ ...prev, notificationPermission: permission }));

      if (permission === "granted") {
        saveSettings({ ...settings, notifications: true });

        // تسجيل Push Notifications إذا متوفر
        if (pwaState.swRegistration?.pushManager) {
          try {
            await subscribeToPushNotifications();
          } catch (error) {
            console.warn("Push subscription failed:", error);
          }
        }

        toast({
          title: "🔔 تم تفعيل الإشعارات",
          description: "ستتلقى الآن إشعارات عن الحجوزات والرسائل الجديدة",
        });
      }
    }
  };

  const subscribeToPushNotifications = async () => {
    if (!pwaState.swRegistration?.pushManager) return;

    try {
      const subscription = await pwaState.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || "",
        ),
      });

      // إرسال subscription للخادم
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.warn("Push subscription failed:", error);
    }
  };

  const handleUpdateApp = async () => {
    if (pwaState.swRegistration?.waiting) {
      pwaState.swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  const syncPendingData = async () => {
    if (
      pwaState.swRegistration &&
      pwaState.swRegistration.sync &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        await pwaState.swRegistration.sync!.register(
          "background-sync-bookings",
        );
        await pwaState.swRegistration.sync!.register(
          "background-sync-messages",
        );
      } catch (error) {
        console.warn("Background sync registration failed:", error);
      }
    }
  };

  const clearAppData = async () => {
    if (confirm("هل تريد حقاً مسح جميع البيانات المحفوظة؟")) {
      try {
        // مسح التخزين المؤقت
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName)),
          );
        }

        // مسح Local Storage
        localStorage.clear();
        sessionStorage.clear();

        toast({
          title: "🗑️ تم مسح البيانات",
          description: "سيتم إعادة تحميل التطبيق الآن",
        });

        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error("Failed to clear app data:", error);
      }
    }
  };

  return (
    <div className={className}>
      {/* شريط الحالة */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={pwaState.isOnline ? "default" : "destructive"}>
          {pwaState.isOnline ? (
            <>
              <Wifi className="w-3 h-3 ml-1" /> متصل
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 ml-1" /> غير متصل
            </>
          )}
        </Badge>

        {pwaState.isInstalled && (
          <Badge variant="secondary">
            <Smartphone className="w-3 h-3 ml-1" /> مثبت
          </Badge>
        )}

        {pwaState.updateAvailable && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpdateApp}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 ml-1" />
            تحديث متاح
          </Button>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {!pwaState.isInstalled && pwaState.installPrompt && (
          <Button
            onClick={handleInstallApp}
            className="text-xs"
            variant="outline"
          >
            <Download className="w-3 h-3 ml-1" />
            تثبيت التطبيق
          </Button>
        )}

        {pwaState.notificationPermission !== "granted" && (
          <Button
            onClick={handleEnableNotifications}
            className="text-xs"
            variant="outline"
          >
            <Bell className="w-3 h-3 ml-1" />
            تفعيل الإشعارات
          </Button>
        )}
      </div>

      {/* إعدادات PWA */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            <Settings className="w-4 h-4 ml-2" />
            إعدادات التطبيق
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعدادات التطبيق</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">المزامنة التلقائية</label>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, autoSync: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">الإشعارات</label>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">المزامنة في الخلفية</label>
              <Switch
                checked={settings.backgroundSync}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, backgroundSync: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">الوضع غير المتصل</label>
              <Switch
                checked={settings.offlineMode}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, offlineMode: checked })
                }
              />
            </div>

            <hr />

            <Button
              variant="destructive"
              size="sm"
              onClick={clearAppData}
              className="w-full"
            >
              مسح جميع البيانات المحفوظة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// مساعدات
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
