import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Wifi, WifiOff } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { getChatCache, CachedConversation } from "@/lib/chat-cache";
import {
  ConversationsListSkeleton,
  EmptyChatSkeleton,
} from "@/components/ui/chat-skeleton";

interface OptimizedMessagesPageProps {
  user: User;
  onBack: () => void;
}

export default function OptimizedMessagesPage({
  user,
  onBack,
}: OptimizedMessagesPageProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<CachedConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize chat cache and load conversations
  useEffect(() => {
    let mounted = true;

    const initializeAndLoad = async () => {
      try {
        const chatCache = await getChatCache();

        // Get cached conversations immediately
        const cachedConversations = await chatCache.getConversationsWithSync();

        if (mounted) {
          setConversations(cachedConversations);
          setIsLoading(false);
          setLastSyncTime(new Date());

          // Set background syncing indicator
          if (cachedConversations.length > 0) {
            setIsBackgroundSyncing(true);
            setTimeout(() => {
              if (mounted) {
                setIsBackgroundSyncing(false);
              }
            }, 2000); // Show sync indicator for 2 seconds
          }
        }
      } catch (error) {
        console.error("Failed to initialize chat cache:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAndLoad();

    return () => {
      mounted = false;
    };
  }, []);

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

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setIsBackgroundSyncing(true);
    try {
      const chatCache = await getChatCache();
      const freshConversations = await chatCache.getConversationsWithSync();
      setConversations(freshConversations);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to refresh conversations:", error);
    } finally {
      setIsBackgroundSyncing(false);
    }
  }, []);

  // Open chat function
  const openChat = useCallback(
    async (conversation: CachedConversation) => {
      try {
        // Mark conversation as opened for cache optimization
        const chatCache = await getChatCache();
        await chatCache.markConversationAsOpened(conversation.id);

        // Navigate to dedicated chat page
        const params = new URLSearchParams({
          with: conversation.user.id,
          name: conversation.user.name,
          role: conversation.user.role,
        });

        if (conversation.user.avatar_url) {
          params.set("avatar", conversation.user.avatar_url);
        }

        navigate(`/chat-optimized?${params.toString()}`);
      } catch (error) {
        console.error("Failed to open chat:", error);
        // Fallback to regular navigation
        navigate(`/chat?with=${conversation.user.id}`);
      }
    },
    [navigate],
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

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Show loading skeleton only on initial load
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">الرسائل</h1>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>

        {/* Search skeleton */}
        <div className="p-4 border-b border-border/50">
          <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        </div>

        {/* Conversations skeleton */}
        <ConversationsListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with status indicators */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الرسائل</h1>
          <div className="flex items-center gap-2">
            {/* Sync status indicator */}
            {isBackgroundSyncing && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                <span>مزامنة...</span>
              </div>
            )}

            {/* Online/offline indicator */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="p-1"
              disabled={!isOnline || isBackgroundSyncing}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </Button>

            {/* Last sync time */}
            {lastSyncTime && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatTime(lastSyncTime.toISOString())}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المحادثات..."
            className="pr-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <EmptyChatSkeleton />
        ) : (
          <div className="p-4">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => openChat(conversation)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98] native-button"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.user.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500 text-white border-2 border-background">
                      {conversation.unreadCount > 9
                        ? "9+"
                        : conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.lastMessage.created_at)}
                    </span>
                    <h3 className="font-semibold text-sm">
                      {conversation.user.name}
                    </h3>
                  </div>
                  <p
                    className={cn(
                      "text-sm text-right line-clamp-1",
                      conversation.unreadCount > 0
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {conversation.lastMessage.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {conversation.user.role === "barber" ? "حلاق" : "عميل"}
                    </span>
                    {!isOnline && (
                      <span className="text-xs text-orange-500">أوفلاين</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Status bar for offline mode */}
      {!isOnline && (
        <div className="bg-orange-100 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-800 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-orange-700 dark:text-orange-300">
            <WifiOff className="h-4 w-4" />
            <span>وضع أوفلاين - عرض البيانات المحفوظة</span>
          </div>
        </div>
      )}
    </div>
  );
}
