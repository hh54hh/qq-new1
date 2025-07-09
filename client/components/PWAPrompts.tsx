import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Download,
  Smartphone,
  X,
  RefreshCw,
  Wifi,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePWA } from "@/hooks/use-pwa";

// PWA Installation Prompt
interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({
  onInstall,
  onDismiss,
}: PWAInstallPromptProps) {
  const { installApp, isInstalled, installPrompt } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem("pwa-install-dismissed");
    if (hasBeenDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt if PWA is installable and not already installed
    if (installPrompt && !isInstalled && !dismissed) {
      // Delay showing the prompt to not be intrusive
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [installPrompt, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
      onInstall?.();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
    onDismiss?.();
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <Card className="border-golden-200 bg-gradient-to-r from-golden-50 to-golden-100 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-golden-500 rounded-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg text-golden-900">
                  تثبيت التطبيق
                </CardTitle>
                <p className="text-sm text-golden-700">
                  احصل على تجربة أفضل مع التطبيق المثبت
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-golden-600 hover:bg-golden-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="p-2 bg-white rounded-lg mb-1">
                <Wifi className="h-4 w-4 text-golden-600 mx-auto" />
              </div>
              <p className="text-xs text-golden-700">يعمل بدون إنترنت</p>
            </div>
            <div className="text-center">
              <div className="p-2 bg-white rounded-lg mb-1">
                <Zap className="h-4 w-4 text-golden-600 mx-auto" />
              </div>
              <p className="text-xs text-golden-700">فتح سريع</p>
            </div>
            <div className="text-center">
              <div className="p-2 bg-white rounded-lg mb-1">
                <Shield className="h-4 w-4 text-golden-600 mx-auto" />
              </div>
              <p className="text-xs text-golden-700">آمن ومحمي</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-golden-500 hover:bg-golden-600 text-white"
            >
              <Smartphone className="ml-2 h-4 w-4" />
              تثبيت الآن
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="border-golden-300 text-golden-700 hover:bg-golden-100"
            >
              لاحقاً
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// PWA Update Notification
export function PWAUpdateNotification() {
  const { updateApp, isUpdateAvailable } = usePWA();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable]);

  const handleUpdate = () => {
    updateApp();
    setShowNotification(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">تحديث متوفر</h3>
                <p className="text-sm text-blue-700">
                  إصدار جديد من التطبيق متاح الآن
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                تحديث
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8 text-blue-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// PWA Status Bar (shows connection and app status)
export function PWAStatusBar() {
  const { isOnline } = usePWA();
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Show status briefly when connection changes
    if (!isOnline) {
      setShowStatus(true);
    } else {
      // Show online status briefly then hide
      setShowStatus(true);
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showStatus) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "px-4 py-2 text-center text-sm font-medium",
        "transition-all duration-300",
        "safe-area-top",
        isOnline
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white animate-pulse",
      )}
    >
      {isOnline ? "🌐 متصل بالإنترنت" : "📡 غير متصل - يعمل في الوضع المحلي"}
    </div>
  );
}

// Advanced PWA Installation Dialog
interface PWAInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PWAInstallDialog({
  open,
  onOpenChange,
}: PWAInstallDialogProps) {
  const { installApp, isInstalled } = usePWA();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      onOpenChange(false);
    }
  };

  if (isInstalled) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-golden-500" />
            تثبيت تطبيق حلاقة
          </DialogTitle>
          <DialogDescription>
            احصل على أفضل تجربة مع التطبيق المثبت على جهازك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Wifi className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">عمل بدون إنترنت</p>
                <p className="text-xs text-muted-foreground">
                  استخدم التطبيق حتى بدون اتصال
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">فتح سريع</p>
                <p className="text-xs text-muted-foreground">
                  تحميل فوري للتطبيق
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium text-sm">أمان عالي</p>
                <p className="text-xs text-muted-foreground">
                  تشفير وحماية البيانات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Smartphone className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-sm">تجربة أصلية</p>
                <p className="text-xs text-muted-foreground">
                  يبدو كتطبيق حقيقي
                </p>
              </div>
            </div>
          </div>

          {/* Installation steps */}
          <div className="space-y-2">
            <h4 className="font-medium">خطوات التثبيت:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. اضغط على "تثبيت الآن"</li>
              <li>2. اختر "تثبيت" في النافذة المنبثقة</li>
              <li>3. ستجد التطبيق في الشاشة الرئيسية</li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleInstall} className="flex-1" size="lg">
              <Download className="ml-2 h-4 w-4" />
              تثبيت الآن
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="lg"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating Install Button
export function FloatingInstallButton() {
  const { installPrompt, isInstalled } = usePWA();
  const [showDialog, setShowDialog] = useState(false);

  if (!installPrompt || isInstalled) return null;

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className={cn(
          "fixed bottom-20 right-4 z-40",
          "h-14 w-14 rounded-full",
          "bg-golden-500 hover:bg-golden-600",
          "text-white shadow-xl",
          "animate-bounce",
        )}
        size="icon"
      >
        <Download className="h-6 w-6" />
      </Button>

      <PWAInstallDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
}

// Custom hook for managing PWA prompts
export function usePWAPrompts() {
  const [installPromptShown, setInstallPromptShown] = useState(false);
  const [updatePromptShown, setUpdatePromptShown] = useState(false);

  const showInstallPrompt = () => setInstallPromptShown(true);
  const hideInstallPrompt = () => setInstallPromptShown(false);
  const showUpdatePrompt = () => setUpdatePromptShown(true);
  const hideUpdatePrompt = () => setUpdatePromptShown(false);

  return {
    installPromptShown,
    updatePromptShown,
    showInstallPrompt,
    hideInstallPrompt,
    showUpdatePrompt,
    hideUpdatePrompt,
  };
}

// PWA Onboarding Component
interface PWAOnboardingProps {
  onComplete: () => void;
}

export function PWAOnboarding({ onComplete }: PWAOnboardingProps) {
  const [step, setStep] = useState(0);
  const { installApp, requestNotificationPermission, isInstalled } = usePWA();

  const steps = [
    {
      title: "مرحباً بك في تطبيق حلاقة!",
      description: "دعنا نساعدك في إعداد التطبيق للحصول على أفضل تجربة",
      icon: "👋",
    },
    {
      title: "تثبيت التطبيق",
      description: "قم بتثبيت التطبيق للوصول السريع والعمل بدون إنترنت",
      icon: "📱",
      action: installApp,
      actionText: "تثبيت الآن",
    },
    {
      title: "تفعيل الإشعارات",
      description: "احصل على تنبيهات للحجوزات والرسائل الجديدة",
      icon: "🔔",
      action: requestNotificationPermission,
      actionText: "تفعيل الإشعارات",
    },
    {
      title: "كل شيء جاهز!",
      description: "يمكنك الآن الاستمتاع بجميع ميزات التطبيق",
      icon: "🎉",
    },
  ];

  const currentStep = steps[step];

  const handleNext = async () => {
    if (currentStep.action) {
      await currentStep.action();
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="text-4xl mb-2">{currentStep.icon}</div>
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index <= step ? "bg-golden-500" : "bg-muted",
                )}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleNext} className="flex-1">
              {currentStep.actionText ||
                (step === steps.length - 1 ? "إنهاء" : "التالي")}
            </Button>
            <Button variant="outline" onClick={handleSkip}>
              تخطي
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
