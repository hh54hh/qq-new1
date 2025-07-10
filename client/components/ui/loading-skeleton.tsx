import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Barber Card Skeleton
export function BarberCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[180px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  );
}

// Booking Card Skeleton
export function BookingCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-[200px]" />
        <Skeleton className="h-3 w-[160px]" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[80%]" />
      </div>
    </div>
  );
}

// Message Skeleton
export function MessageSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-3 w-[60px]" />
        </div>
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
  );
}

// Search Result Skeleton
export function SearchResultSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border/50">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-5 w-[80px] rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-3" />
            ))}
            <Skeleton className="h-3 w-[40px] ml-2" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-3 w-[50px]" />
          </div>
          <div className="flex gap-1 mt-2">
            <Skeleton className="h-5 w-[60px] rounded-full" />
            <Skeleton className="h-5 w-[70px] rounded-full" />
            <Skeleton className="h-5 w-[50px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Grid Skeleton (for dashboard cards)
export function DashboardCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-8 w-[60px]" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// List Skeleton (generic)
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[160px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
