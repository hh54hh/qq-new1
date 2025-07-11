import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Send,
  Phone,
  Video,
  MoreVertical,
  Wifi,
  WifiOff,
  Clock,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { getChatCache, CachedMessage } from "@/lib/chat-cache";
import { useAppStore } from "@/lib/store";
import {
  MessagesListSkeleton,
  ChatHeaderSkeleton,
} from "@/components/ui/chat-skeleton";
import { useBackgroundSync } from "@/hooks/use-background-sync";

export default function OptimizedChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state] = useAppStore();
  const user = state.user;

  const [messages, setMessages] = useState<CachedMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Background sync integration
  const {
    status: syncStatus,
    queueMessage,
    forceSync,
    isReady,
  } = useBackgroundSync();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);

  // Get chat partner info from URL params
  const otherUserId = searchParams.get("with");
  const otherUserName = searchParams.get("name") || "محادثة";
  const otherUserAvatar = searchParams.get("avatar");
  const otherUserRole = searchParams.get("role") || "user";

  // Initialize and load messages
  useEffect(() => {
    if (!user || !otherUserId) {
      navigate("/dashboard");
      return;
    }

    let mounted = true;

    const initializeAndLoad = async () => {
      try {
        const chatCache = await getChatCache();

        // Get cached messages immediately
        const cachedMessages = await chatCache.getMessagesWithSync(otherUserId);

        if (mounted) {
          setMessages(cachedMessages);
          setIsLoading(false);
          setLastSyncTime(new Date());
          initialLoadRef.current = true;

          // Scroll to bottom after initial load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAndLoad();

    return () => {
      mounted = false;
    };
  }, [otherUserId, user, navigate]);

  // Listen for online/offline status
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

  // Auto scroll to bottom when new messages arrive (but not on initial load)
  useEffect(() => {
    if (initialLoadRef.current && messages.length > 0) {
      // Only scroll if user is near bottom
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = scrollArea;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      }
    }
  }, [messages]);

  // Send message with optimistic UI and offline support
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !otherUserId || !user || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately
    setIsSending(true);

    // Create optimistic message immediately for instant UI feedback
    const optimisticMessage: CachedMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: user.id,
      receiver_id: otherUserId,
      message: messageText,
      message_type: "text",
      is_read: false,
      created_at: new Date().toISOString(),
      conversation_id: otherUserId,
      _cached_at: Date.now(),
      _pending: true,
    };

    // Add to UI immediately - no await needed here
    setMessages((prev) => [...prev, optimisticMessage]);

    // Clear sending state immediately - don't wait for server response
    setIsSending(false);

    // Scroll to bottom immediately
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 10);

    // Send to server in background (don't block UI)
    apiClient
      .createMessage({
        receiver_id: otherUserId,
        message: messageText,
      })
      .then((sentMessage) => {
        // Replace optimistic message with real one when response comes back
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? {
                  ...sentMessage,
                  conversation_id: otherUserId,
                  _cached_at: Date.now(),
                }
              : msg,
          ),
        );
        console.log("✅ رسالة أُرسلت بنجاح");
      })
      .catch((error) => {
        console.error("❌ فشل ��رسال الرسالة:", error);
        // Mark message as failed but keep it in UI
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? {
                  ...msg,
                  _pending: true,
                  _retry_count: (msg._retry_count || 0) + 1,
                }
              : msg,
          ),
        );
      });
  }, [newMessage, otherUserId, user, isSending]);

  // Load older messages (lazy loading)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreMessages || messages.length === 0) return;

    setIsLoadingOlder(true);

    try {
      const chatCache = await getChatCache();
      const oldestMessage = messages[0];
      const olderMessages = await chatCache.loadOlderMessages(
        otherUserId!,
        oldestMessage.id,
        20,
      );

      if (olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMoreMessages, messages, otherUserId]);

  // Handle scroll for lazy loading
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scrollArea = event.currentTarget;
      if (scrollArea.scrollTop < 100 && hasMoreMessages && !isLoadingOlder) {
        loadOlderMessages();
      }
    },
    [hasMoreMessages, isLoadingOlder, loadOlderMessages],
  );

  // Handle send click
  const handleSendClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Keep focus on input to prevent keyboard from hiding
      if (inputRef.current) {
        inputRef.current.focus();
      }

      sendMessage();
    },
    [sendMessage],
  );

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  // Format time helper
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "الآن";
    if (diffInHours < 24)
      return date.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      });

    return date.toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
    });
  }, []);

  // Render message status icon
  const renderMessageStatus = useCallback((message: CachedMessage) => {
    if (message._pending) {
      if (message._retry_count && message._retry_count > 0) {
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      }
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
    if (message.is_read) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  }, []);

  if (!user || !otherUserId) {
    return null;
  }

  // Show loading skeleton only on initial load
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col z-50 chat-container">
        <ChatHeaderSkeleton />
        <div className="flex-1 overflow-hidden">
          <MessagesListSkeleton count={8} />
        </div>
        <div className="p-4 border-t">
          <div className="h-10 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 chat-container">
      {/* Chat Header - Fixed */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate("/dashboard", { state: { activeTab: "messages" } })
              }
              className="p-2 -ml-2"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUserAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {otherUserName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-base">{otherUserName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {otherUserRole === "barber" ? "حلاق" : "عميل"}
                </p>
                {!isOnline && (
                  <span className="text-xs text-orange-500">أوفلاين</span>
                )}
                {syncStatus.pendingMessages > 0 && (
                  <span className="text-xs text-blue-500">
                    {syncStatus.pendingMessages} معلقة
                  </span>
                )}
                {syncStatus.isSyncing && (
                  <span className="text-xs text-green-500">مزامنة...</span>
                )}
                {lastSyncTime && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(lastSyncTime.toISOString())}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Online/offline indicator */}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Button variant="ghost" size="sm" className="p-2">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden chat-messages">
        <ScrollArea
          className="h-full"
          ref={scrollAreaRef}
          onScroll={handleScroll}
        >
          <div className="px-4 py-4 space-y-4 pb-4">
            {/* Load older messages indicator */}
            {isLoadingOlder && (
              <div className="flex justify-center py-2">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  تحميل رسائل أقدم...
                </div>
              </div>
            )}

            {/* Messages list */}
            {messages.map((message) => {
              const isOwn = message.sender_id === user.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2 transition-opacity",
                    isOwn ? "flex-row-reverse" : "flex-row",
                    message._pending ? "opacity-70" : "opacity-100",
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={otherUserAvatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {otherUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
                      message._pending && "animate-pulse",
                    )}
                  >
                    <p className="text-sm">{message.message}</p>
                    <div
                      className={cn(
                        "flex items-center justify-between mt-1 gap-2",
                        isOwn ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs",
                          isOwn
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTime(message.created_at)}
                      </p>
                      {isOwn && renderMessageStatus(message)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* End marker for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - Fixed Bottom with Keyboard Handling */}
      <div className="sticky bottom-0 bg-background border-t border-border/50 p-4 shrink-0 safe-area-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isOnline ? "اكتب رسالة..." : "أوفلاين - سيتم الإرسال لاحقاً..."
              }
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyPress={handleKeyPress}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              disabled={isSending}
            />
          </div>
          <Button
            onClick={handleSendClick}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className={cn(
              "rounded-full w-10 h-10 p-0 shrink-0 transition-all",
              isSending && "animate-pulse",
              !isOnline && "bg-orange-500 hover:bg-orange-600",
            )}
            type="button"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Offline indicator and sync status */}
        {!isOnline && (
          <div className="mt-2 text-xs text-orange-600 text-center">
            وضع أوفلاين - سيتم إرسال الرسائل عند الاتصال
            {syncStatus.pendingMessages > 0 && (
              <span className="block">
                {syncStatus.pendingMessages} رسالة في الانتظار
              </span>
            )}
          </div>
        )}

        {/* Sync status when online */}
        {isOnline && syncStatus.isSyncing && (
          <div className="mt-2 text-xs text-green-600 text-center">
            جاري المزامنة مع الخادم...
          </div>
        )}
      </div>
    </div>
  );
}
