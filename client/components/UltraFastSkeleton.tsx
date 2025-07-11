import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UltraFastSkeletonProps {
  variant?: "barber" | "compact" | "featured";
  className?: string;
}

export function UltraFastSkeleton({
  variant = "barber",
  className,
}: UltraFastSkeletonProps) {
  if (variant === "compact") {
    return (
      <Card
        className={cn("border-border/50 bg-card/50 animate-pulse", className)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-r from-muted to-muted/80 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-20" />
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-16" />
            </div>
            <div className="h-8 w-12 bg-gradient-to-r from-muted to-muted/80 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card
        className={cn(
          "border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 animate-pulse",
          className,
        )}
      >
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="h-12 w-12 bg-gradient-to-r from-muted to-muted/80 rounded-full mx-auto" />
            <div className="space-y-2">
              <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-20 mx-auto" />
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-16 mx-auto" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-gradient-to-r from-muted to-muted/80 rounded" />
              <div className="flex-1 h-8 bg-gradient-to-r from-muted to-muted/80 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default barber variant - optimized for performance
  return (
    <Card
      className={cn("border-border/50 bg-card/50 animate-pulse", className)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Avatar with gradient for smooth animation */}
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-muted via-muted/90 to-muted/80 rounded-full shrink-0" />

          <div className="flex-1 min-w-0 space-y-1">
            {/* Name and badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-4 bg-gradient-to-r from-muted via-muted/90 to-muted/80 rounded w-24" />
              <div className="h-3 w-3 bg-gradient-to-r from-muted to-muted/80 rounded" />
              <div className="h-5 w-16 bg-gradient-to-r from-muted to-muted/80 rounded" />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-6" />
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-12" />
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-8" />
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {/* Status badge */}
            <div className="h-5 w-12 bg-gradient-to-r from-muted to-muted/80 rounded" />
            {/* Action button */}
            <div className="h-8 w-12 bg-gradient-to-r from-muted to-muted/80 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UltraFastSkeletonGridProps {
  count?: number;
  variant?: "barber" | "compact" | "featured";
  className?: string;
}

export function UltraFastSkeletonGrid({
  count = 6,
  variant = "barber",
  className,
}: UltraFastSkeletonGridProps) {
  // Use useMemo equivalent - static array generation for performance
  const skeletons = Array.from({ length: count }, (_, index) => (
    <UltraFastSkeleton key={`ultra-skeleton-${index}`} variant={variant} />
  ));

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
        {skeletons}
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3", className)}>
        {skeletons}
      </div>
    );
  }

  return <div className={cn("space-y-3", className)}>{skeletons}</div>;
}

export default UltraFastSkeleton;
