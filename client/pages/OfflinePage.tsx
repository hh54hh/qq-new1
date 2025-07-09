import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  Monitor,
  Download,
  Database,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import offlineAPI from "@/lib/offline-api";
import { getOfflineStorage } from "@/lib/offline-storage";

interface OfflinePageProps {
  onRetry?: () => void;
}

interface StorageInfo {
  totalSize: number;
  storesSizes: Record<string, number>;
  itemCounts: Record<string, number>;
}

export default function OfflinePage({ onRetry }: OfflinePageProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Start syncing when coming online
      offlineAPI.syncPendingActions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // التعامل مع Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Load storage information
    loadStorageInfo();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const loadStorageInfo = async () => {
    try {
      setLoadingStorage(true);
      const storage = await getOfflineStorage();
      const info = await storage.getStorageInfo();

      // Get item counts for each store
      const stores = [
        "bookings",
        "messages",
        "barbershops",
        "services",
        "notifications",
        "users",
      ];
      const itemCounts: Record<string, number> = {};

      for (const store of stores) {
        try {
          const data = await storage.getAllData(store);
          itemCounts[store] = data.length;
        } catch {
          itemCounts[store] = 0;
        }
      }

      setStorageInfo({
        ...info,
        itemCounts,
      });
    } catch (error) {
      console.error("Failed to load storage info:", error);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // محاولة الاتصال
      await fetch("/api/ping", { method: "HEAD" });
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.warn("Still offline");
    } finally {
      setRetrying(false);
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        setInstallPrompt(null);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const clearOfflineData = async () => {
    if (confirm("هل تريد حقاً مسح جميع البيانات المحفوظة محلياً؟")) {
      try {
        await offlineAPI.clearOfflineData();
        await loadStorageInfo();
        alert("تم مسح البيانات بنجاح");
      } catch (error) {
        alert("فشل في مسح البيانات");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-4">
      <div className="container mx-auto max-w-2xl pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {isOnline ? (
              <Wifi className="h-16 w-16 text-green-500" />
            ) : (
              <WifiOff className="h-16 w-16 text-red-500 animate-pulse" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isOnline ? "استعادة الاتصال..." : "غير متصل بالإنترنت"}
          </h1>

          <p className="text-muted-foreground">
            {isOnline
              ? "يتم الآن استعادة الاتصال بالخوادم"
              : "يبدو أنك غير متصل بالإنترنت. يمكنك الاستمرار في تصفح البيانات المحفوظة."}
          </p>

          <Badge
            variant={isOnline ? "default" : "destructive"}
            className="mt-3"
          >
            {isOnline ? "متصل" : "غير متصل"}
          </Badge>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 mb-8">
          {/* اتصال وإعادة المحاولة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                استعادة الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                تحقق من اتصالك بالإنترنت وجرب مرة أخرى
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex-1"
                >
                  {retrying && (
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  {retrying ? "جاري المحاولة..." : "المحاولة مرة أخرى"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                >
                  الصفحة الرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* تثبيت التطبيق */}
          {installPrompt && (
            <Card className="border-golden-200 bg-golden-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden-600">
                  <Download className="h-5 w-5" />
                  تثبيت التطبيق
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  قم بتثبيت التطبيق على جهازك للوصول السريع حتى بدون انترنت
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <Button
                    onClick={handleInstallApp}
                    variant="outline"
                    className="border-golden-200 text-golden-600 hover:bg-golden-50"
                  >
                    تثبيت الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* البيانات المحفوظة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                البيانات المحفوظة محلياً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStorage ? (
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    جاري تحميل معلومات التخزين...
                  </p>
                </div>
              ) : storageInfo ? (
                <div className="space-y-4">
                  {/* إحصائيات البيانات */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">الحجوزات:</span>
                      <span className="ml-2 font-medium">
                        {storageInfo.itemCounts.bookings || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الرسائل:</span>
                      <span className="ml-2 font-medium">
                        {storageInfo.itemCounts.messages || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحلاقين:</span>
                      <span className="ml-2 font-medium">
                        {storageInfo.itemCounts.barbershops || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الخدمات:</span>
                      <span className="ml-2 font-medium">
                        {storageInfo.itemCounts.services || 0}
                      </span>
                    </div>
                  </div>

                  {/* معلومات التخزين */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        استخدام التخزين
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>الحجم الإجمالي</span>
                        <span>{formatBytes(storageInfo.totalSize)}</span>
                      </div>
                      <Progress
                        value={Math.min(
                          (storageInfo.totalSize / (1024 * 1024 * 10)) * 100,
                          100,
                        )}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        من أصل ~10 MB مساحة تخزين متوقعة
                      </p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => (window.location.href = "/dashboard")}
                    >
                      عرض البيانات
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadStorageInfo}
                      disabled={loadingStorage}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loadingStorage ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearOfflineData}
                    >
                      مسح
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    لا توجد بيانات محفوظة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* نصائح */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">
              نصائح للاستخدام بدون انترنت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• يمكنك عرض الحجوزات والرسائل المحفوظة مسبقاً</li>
              <li>• البيانات الجديدة ستتم مزامنتها عند عودة الاتصال</li>
              <li>• قم بتثبيت التطبيق للحصول على تجربة أفضل</li>
              <li>• تأكد من اتصال Wi-Fi أو بيانات الهاتف</li>
            </ul>
          </CardContent>
        </Card>

        {/* معلومات تقنية */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>حالة Service Worker: نشط</p>
          <p>إصدار التطبيق: 1.2.0</p>
        </div>
      </div>
    </div>
  );
}
