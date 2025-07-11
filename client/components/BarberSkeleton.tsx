import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarberSkeletonProps {
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export function BarberSkeleton({
  variant = "default",
  className,
}: BarberSkeletonProps) {
  if (variant === "compact") {
    return (
      <Card className={cn("border-border/50 bg-card/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Avatar Skeleton */}
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Name Skeleton */}
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
                {/* Level Icon Skeleton */}
                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {/* Rating Skeleton */}
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-muted-foreground/50" />
                  <div className="h-3 bg-muted rounded animate-pulse w-6" />
                </div>
                {/* Status Skeleton */}
                <div className="h-4 bg-muted rounded animate-pulse w-12" />
              </div>
            </div>

            {/* Button Skeleton */}
            <div className="h-8 w-12 bg-muted rounded animate-pulse shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card
        className={cn(
          "border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden",
          className,
        )}
      >
        {/* Featured Badge Skeleton */}
        <div className="absolute top-2 right-2">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>

        <CardContent className="p-4">
          <div className="text-center space-y-3">
            {/* Avatar Skeleton */}
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse mx-auto" />

            <div>
              {/* Name Skeleton */}
              <div className="h-4 bg-muted rounded animate-pulse w-20 mx-auto mb-2" />
              {/* Rating Skeleton */}
              <div className="flex items-center justify-center gap-1 text-xs">
                <Star className="h-3 w-3 text-muted-foreground/50" />
                <div className="h-3 bg-muted rounded animate-pulse w-8" />
                <span className="text-muted-foreground/50">•</span>
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
              </div>
            </div>

            {/* Buttons Skeleton */}
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
              <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn("border-border/50 bg-card/50", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Avatar Skeleton */}
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-muted rounded-full animate-pulse shrink-0" />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Name Skeleton */}
              <div className="h-4 bg-muted rounded animate-pulse w-24" />
              {/* Level Icon Skeleton */}
              <div className="h-3 w-3 bg-muted rounded animate-pulse" />
              {/* Badge Skeleton */}
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
              {/* Rating Skeleton */}
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-muted-foreground/50" />
                <div className="h-3 bg-muted rounded animate-pulse w-6" />
              </div>
              {/* Distance Skeleton */}
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground/50" />
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
              </div>
              {/* Followers Skeleton */}
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground/50" />
                <div className="h-3 bg-muted rounded animate-pulse w-8" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {/* Status Badge Skeleton */}
            <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            {/* Button Skeleton */}
            <div className="h-8 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BarberSkeletonGridProps {
  count?: number;
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export function BarberSkeletonGrid({
  count = 6,
  variant = "default",
  className,
}: BarberSkeletonGridProps) {
  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
        {Array.from({ length: count }, (_, index) => (
          <BarberSkeleton key={index} variant="compact" />
        ))}
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3", className)}>
        {Array.from({ length: count }, (_, index) => (
          <BarberSkeleton key={index} variant="featured" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, index) => (
        <BarberSkeleton key={index} variant="default" />
      ))}
    </div>
  );
}

export default BarberSkeleton;
