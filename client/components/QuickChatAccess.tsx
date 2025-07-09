import React, { useState, useEffect } from "react";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import chatManager from "@/lib/chat-manager";

interface QuickChatAccessProps {
  currentUserId: string;
  onNavigateToMessages: () => void;
  className?: string;
}

export default function QuickChatAccess({
  currentUserId,
  onNavigateToMessages,
  className,
}: QuickChatAccessProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUnreadCount();

    // Listen for new messages
    const unsubscribe = chatManager.on("message:new", () => {
      loadUnreadCount();
    });

    // Listen for read messages
    const unsubscribeRead = chatManager.on("conversation:read", () => {
      loadUnreadCount();
    });

    return () => {
      unsubscribe();
      unsubscribeRead();
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await chatManager.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.warn("Failed to load unread count:", error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Use instant navigation for better UX
    onNavigateToMessages();
  };

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      className={cn(
        "relative p-3 h-auto flex items-center gap-3",
        "hover:bg-muted/50 transition-colors",
        "border border-border/50 rounded-xl",
        className,
      )}
    >
      <div className="relative">
        <MessageCircle className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && !isLoading && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </div>

      <div className="flex-1 text-right">
        <h3 className="font-medium">الرسائل</h3>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "جاري التحميل..."
            : unreadCount > 0
              ? `${unreadCount} رسالة غير مقروءة`
              : "لا توجد رسائل جديدة"}
        </p>
      </div>

      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
