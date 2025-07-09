import React, { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import chatManager, { ChatMessage } from "@/lib/chat-manager";
import { cn } from "@/lib/utils";

interface ChatNotification {
  id: string;
  message: ChatMessage;
  senderName: string;
  timestamp: number;
}

interface ChatNotificationsProps {
  currentUserId: string;
  onMessageClick?: (conversationId: string) => void;
}

export default function ChatNotifications({
  currentUserId,
  onMessageClick,
}: ChatNotificationsProps) {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);

  useEffect(() => {
    // Listen for new messages
    const unsubscribe = chatManager.on("message:new", handleNewMessage);

    return unsubscribe;
  }, [currentUserId]);

  const handleNewMessage = async (message: ChatMessage) => {
    // Don't show notifications for own messages
    if (message.senderId === currentUserId) return;

    try {
      // Get conversation details
      const conversation = await chatManager.getConversation(
        message.conversationId,
      );

      if (!conversation) return;

      const notification: ChatNotification = {
        id: `notif_${message.id}`,
        message,
        senderName: conversation.name,
        timestamp: message.timestamp,
      };

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep only 5 recent

      // Show system notification if permission granted
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        const systemNotification = new Notification(
          `رسالة جديدة من ${conversation.name}`,
          {
            body: message.content,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/badge-72x72.png",
            tag: `chat_${message.conversationId}`,
            renotify: true,
            requireInteraction: false,
            silent: false,
          },
        );

        systemNotification.onclick = () => {
          window.focus();
          if (onMessageClick) {
            onMessageClick(message.conversationId);
          }
          systemNotification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => {
          systemNotification.close();
        }, 5000);
      }

      // Show toast notification
      toast({
        title: `رسالة من ${conversation.name}`,
        description: message.content,
        action: (
          <Button
            size="sm"
            onClick={() => {
              if (onMessageClick) {
                onMessageClick(message.conversationId);
              }
            }}
          >
            عرض
          </Button>
        ),
      });

      // Auto remove notification after 10 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id),
        );
      }, 10000);
    } catch (error) {
      console.warn("Failed to handle new message notification:", error);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 w-80">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "bg-card border border-border rounded-lg shadow-lg",
            "p-4 animate-in slide-in-from-left duration-300",
            "hover:shadow-xl transition-shadow cursor-pointer",
          )}
          onClick={() => {
            if (onMessageClick) {
              onMessageClick(notification.message.conversationId);
            }
            removeNotification(notification.id);
          }}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 mt-1">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {notification.senderName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm truncate">
                  {notification.senderName}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(notification.timestamp)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message.content}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <MessageCircle className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-medium">
                  اضغط للرد
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
