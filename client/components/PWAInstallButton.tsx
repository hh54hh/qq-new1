import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor } from "lucide-react";
import { usePWA } from "@/hooks/use-pwa";

interface PWAInstallButtonProps {
  className?: string;
  showText?: boolean;
}

export function PWAInstallButton({
  className,
  showText = true,
}: PWAInstallButtonProps) {
  const { isInstalled, installPrompt, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  // إخفاء الزر إذا كان التطبيق مثبت بالفعل
  if (isInstalled) {
    return null;
  }

  // إخفاء الزر إذا لم يكن Install Prompt متوفر
  if (!installPrompt) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        console.log("✅ تم تثبيت التطبيق بنجاح");
      }
    } catch (error) {
      console.error("❌ فشل في تثبيت التطبيق:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  return (
    <Button
      onClick={handleInstall}
      disabled={isInstalling}
      className={className}
      size="sm"
      variant="outline"
    >
      {isMobile ? (
        <Smartphone className="h-4 w-4 mr-2" />
      ) : (
        <Monitor className="h-4 w-4 mr-2" />
      )}
      {isInstalling ? "جاري التثبيت..." : showText ? "تثبيت التطبيق" : ""}
      {!isInstalling && <Download className="h-4 w-4 mr-1" />}
    </Button>
  );
}

// مكون للإشعار بإمكانية التثبيت
export function PWAInstallPrompt() {
  const { isInstalled, installPrompt } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // إظهار الإشعار بعد 5 ثوان إذا لم يكن التطبيق مثبت
    const timer = setTimeout(() => {
      if (!isInstalled && installPrompt) {
        setShowPrompt(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isInstalled, installPrompt]);

  if (!showPrompt || isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground">
              تثبيت التطبيق
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              اثبت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
            </p>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <PWAInstallButton className="flex-1" showText={true} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrompt(false)}
          >
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}
