import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";

interface LocationBarProps {
  className?: string;
  compact?: boolean;
}

export default function LocationBar({
  className = "",
  compact = false,
}: LocationBarProps) {
  const { location, isLoading, requestLocation } = useLocation();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <MapPin className="h-3 w-3 text-primary shrink-0" />
        {isLoading ? (
          <div className="animate-pulse h-3 w-16 bg-muted rounded"></div>
        ) : location ? (
          <span className="text-xs text-primary font-medium truncate">
            {location.address}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">غير محدد</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20 ${className}`}
    >
      <div className="flex items-center justify-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm text-primary">جاري تحديد الموقع...</span>
          </div>
        ) : location ? (
          <div className="text-center">
            <span className="text-sm font-medium text-primary">
              {location.address}
            </span>
            <div className="text-xs text-primary/80 mt-0.5">
              موقعك الحالي • دقة عالية
            </div>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              لم يتم تحديد الموقع
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary p-0 h-auto ml-2"
              onClick={requestLocation}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
