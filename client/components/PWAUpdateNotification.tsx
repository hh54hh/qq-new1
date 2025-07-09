import React, { useState, useEffect } from "react";
import { RefreshCw, X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePWA } from "@/hooks/use-pwa";

export default function PWAUpdateNotification() {
  const { toast } = useToast();
  const {
    isUpdateAvailable,
    updateApp,
    installApp,
    installPrompt,
    isInstalled,
    isOnline,
  } = usePWA();

  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable && !dismissed) {
      setShowUpdateNotification(true);
    }
  }, [isUpdateAvailable, dismissed]);

  useEffect(() => {
    if (installPrompt && !isInstalled && !dismissed) {
      // إظهار بانر التثبيت بعد تأخير
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000); // 5 ثوانٍ

      return () => clearTimeout(timer);
    }
  }, [installPrompt, isInstalled, dismissed]);

  const handleUpdate = async () => {
    try {
      updateApp();
      toast({
        title: "🔄 جاري تحديث التطبيق",
        description: "سيتم إعادة تحميل التطبيق بالإصدار الجديد",
      });
    } catch (error) {
      toast({
        title: "❌ فشل في التحديث",
        description: "حدث خطأ أثناء تحديث التطبيق",
        variant: "destructive",
      });
    }
  };

  const handleInstall = async () => {
    try {
      const success = await installApp();
      if (success) {
        setShowInstallBanner(false);
        toast({
          title: "🎉 تم تثبيت التطبيق!",
          description: "يمكنك الآن الوصول للتطبيق من الشاشة الرئيسية",
        });
      }
    } catch (error) {
      toast({
        title: "❌ فشل في التثبيت",
        description: "حدث خطأ أثناء تثبيت التطبيق",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = (type: "update" | "install") => {
    if (type === "update") {
      setShowUpdateNotification(false);
    } else {
      setShowInstallBanner(false);
    }
    setDismissed(true);

    // إعادة تعيين الحالة بعد ساعة
    setTimeout(
      () => {
        setDismissed(false);
      },
      60 * 60 * 1000,
    );
  };

  // إشعار التحديث
  if (showUpdateNotification) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
        <Card className="border-golden-200 bg-golden-50/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <RefreshCw className="h-6 w-6 text-golden-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-golden-900">
                  تحديث متاح
                </h3>
                <p className="text-xs text-golden-700 mt-1">
                  إصدار جديد من التطبيق متاح للتحميل
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    className="text-xs bg-golden-600 hover:bg-golden-700 text-white"
                  >
                    <RefreshCw className="w-3 h-3 ml-1" />
                    تحديث الآن
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss("update")}
                    className="text-xs text-golden-600 hover:bg-golden-100"
                  >
                    لاحقاً
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss("update")}
                className="flex-shrink-0 w-6 h-6 p-0 text-golden-400 hover:text-golden-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // بانر التثبيت
  if (showInstallBanner) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
        <Card className="border-blue-200 bg-blue-50/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-blue-900">
                  تثبيت التطبيق
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  أضف حلاقة إلى الشاشة الرئيسية للوصول السريع
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-3 h-3 ml-1" />
                    تثبيت
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss("install")}
                    className="text-xs text-blue-600 hover:bg-blue-100"
                  >
                    تجاهل
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss("install")}
                className="flex-shrink-0 w-6 h-6 p-0 text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Status bar component للإشارة لحالة الاتصال
export function PWAStatusBar() {
  const { isOnline } = usePWA();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true);
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline && showOfflineMessage) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          غير متصل بالإنترنت - يعمل التطبيق في الوضع المحلي
        </div>
      </div>
    );
  }

  return null;
}
