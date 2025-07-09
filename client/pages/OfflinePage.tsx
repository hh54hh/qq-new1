import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  Monitor,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OfflinePageProps {
  onRetry?: () => void;
}

export default function OfflinePage({ onRetry }: OfflinePageProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // التعامل مع Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

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

  const getCachedData = () => {
    // محاولة الحصول على البيانات المخزنة محلياً
    const cached = localStorage.getItem("app_cache_info");
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  };

  const cachedData = getCachedData();

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
          {cachedData && (
            <Card>
              <CardHeader>
                <CardTitle>البيانات المتاحة محلياً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الحجوزات:</span>
                    <span className="ml-2 font-medium">
                      {cachedData.bookings || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الرسائل:</span>
                    <span className="ml-2 font-medium">
                      {cachedData.messages || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحلاقين:</span>
                    <span className="ml-2 font-medium">
                      {cachedData.barbers || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">آخر تحديث:</span>
                    <span className="ml-2 font-medium text-xs">
                      {cachedData.lastUpdate
                        ? new Date(cachedData.lastUpdate).toLocaleDateString(
                            "ar",
                          )
                        : "غير متوفر"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  عرض البيانات المحفوظة
                </Button>
              </CardContent>
            </Card>
          )}
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
