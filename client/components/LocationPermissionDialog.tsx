import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, AlertTriangle } from "lucide-react";
import { useLocation } from "@/hooks/use-location";

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (hasLocation: boolean) => void;
}

export default function LocationPermissionDialog({
  open,
  onOpenChange,
  onComplete,
}: LocationPermissionDialogProps) {
  const [step, setStep] = useState<"request" | "loading" | "error" | "success">(
    "request",
  );
  const { requestLocation, isLoading, error } = useLocation();

  const handleAllowLocation = async () => {
    setStep("loading");
    console.log("LocationPermissionDialog: Requesting location...");

    // Check permissions state if available
    try {
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        console.log("Current permission state:", permission.state);
      }
    } catch (e) {
      console.log("Permissions API not available:", e);
    }

    const location = await requestLocation();
    console.log("LocationPermissionDialog: Location result:", location);

    if (location) {
      setStep("success");
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.(true);
      }, 1500);
    } else {
      setStep("error");
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.(false);
  };

  const handleRetry = () => {
    setStep("request");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "request" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">
                السماح بالوصول للموقع
              </DialogTitle>
              <DialogDescription className="text-center">
                نحتاج للوصول إلى موقعك لإظهار أقرب الحلاقين إليك وحساب المسافات
                بدقة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Navigation className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">
                    العثور على أقرب الحلاقين
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    سنعرض لك الحلاقين المتاحين بالقرب منك
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">حساب المسافات</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    معرفة المسافة الدقيقة بينك وبين كل حلاق
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                تخطي الآن
              </Button>
              <Button onClick={handleAllowLocation} className="flex-1">
                السماح بالوصول
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "loading" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
              <DialogTitle className="text-xl">جاري تحديد الموقع</DialogTitle>
              <DialogDescription className="text-center">
                يرجى الانتظار بينما نحصل على موقعك الحالي...
              </DialogDescription>
            </DialogHeader>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-400/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-xl text-green-600">
                تم تحديد الموقع بنجاح
              </DialogTitle>
              <DialogDescription className="text-center">
                يمكنك الآن رؤية أقرب الحل��قين إليك!
              </DialogDescription>
            </DialogHeader>
          </>
        )}

        {step === "error" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="text-xl">لم يتم تحديد الموقع</DialogTitle>
              <DialogDescription className="text-center">
                {error || "حدث خطأ في تحديد موقعك"}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">للحل، تأكد من:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• تفعيل خدمات الموقع في الجهاز (الإعدادات)</li>
                <li>• السماح للمتصفح بالوصول للموقع</li>
                <li>• إعادة تحديث الصفحة والمحاولة مرة أخرى</li>
                <li>• التأكد من وجود ات��ال إنترنت جيد</li>
                <li>
                  • في بعض المتصفحات، يجب النقر على أيقونة القفل بجانب العنوان
                </li>
              </ul>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                تخطي
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                إعادة المحاولة
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
