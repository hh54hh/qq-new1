import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Wifi, WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";

export default function PWAInstallPrompt() {
  const { canInstall, isInstalled, isOnline, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt after 30 seconds if can install and not dismissed
    const timer = setTimeout(() => {
      if (canInstall && !dismissed && !isInstalled) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [canInstall, dismissed, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      setDismissed(true);
    }
  }, []);

  if (!showPrompt || !canInstall || isInstalled) return null;

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-medium z-50">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            غير متصل بالإنترنت - تعمل في وضع أوفلاين
          </div>
        </div>
      )}

      {/* Online Indicator */}
      {isOnline && (
        <div className="fixed top-16 left-4 right-4 z-40">
          <div className="bg-green-500 text-white text-center py-1 text-xs rounded-md opacity-75">
            <div className="flex items-center justify-center gap-1">
              <Wifi className="h-3 w-3" />
              متصل
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">ثبت التطبيق</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  احصل على تجربة أفضل وأسرع مع إشعارات فورية
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="text-xs px-3 py-1 h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    تثبيت
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="text-xs px-3 py-1 h-8"
                  >
                    لاحقاً
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
