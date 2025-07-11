import { cn } from "@/lib/utils";

// Skeleton for individual conversation items
export function ConversationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      {/* Avatar skeleton */}
      <div className="relative">
        <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          {/* Time skeleton */}
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          {/* Name skeleton */}
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        {/* Message skeleton */}
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton for multiple conversations
export function ConversationsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton for individual message bubbles
export function MessageSkeleton({
  isOwn = false,
  className,
}: {
  isOwn?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isOwn ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      {/* Avatar skeleton (only for other user) */}
      {!isOwn && (
        <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
      )}

      {/* Message bubble skeleton */}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 space-y-1",
          isOwn ? "bg-primary/20" : "bg-muted",
        )}
      >
        {/* Message text skeleton */}
        <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
        {/* Timestamp skeleton */}
        <div className="h-3 w-12 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton for multiple messages
export function MessagesListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="px-4 py-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
}

// Skeleton for chat header
export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Back button skeleton */}
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        {/* Avatar skeleton */}
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
        {/* User info skeleton */}
        <div>
          <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
      {/* Action buttons skeleton */}
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton for empty state
export function EmptyChatSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="h-16 w-16 bg-muted rounded-full animate-pulse mb-4" />
      <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-muted rounded animate-pulse" />
    </div>
  );
}
