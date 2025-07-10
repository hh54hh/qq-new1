import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // إظهار رسالة "تم الاتصال" لثوانٍ قليلة
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300",
        isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white",
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>تم استعادة الاتصال بالإنترنت</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>لا يوجد اتصال بالإنترنت - يتم العمل في وضع عدم الاتصال</span>
          </>
        )}
      </div>
    </div>
  );
}
