import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, MessageCircle } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { MessageSkeleton } from "@/components/ui/loading-skeleton";

interface MessagesPageProps {
  user: User;
  onBack: () => void;
}

interface Conversation {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  lastMessage: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
  messages: any[];
}

export default function MessagesPage({ user, onBack }: MessagesPageProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = (conversation: Conversation) => {
    // Navigate to dedicated chat page
    const params = new URLSearchParams({
      with: conversation.user.id,
      name: conversation.user.name,
      role: conversation.user.role,
    });

    if (conversation.user.avatar_url) {
      params.set("avatar", conversation.user.avatar_url);
    }

    navigate(`/chat?${params.toString()}`);
  };

  const formatTime = (dateString: string) => {
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
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الرسائل</h1>
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
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <MessageSkeleton key={i} />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد محادثات</h3>
            <p className="text-sm text-muted-foreground text-center">
              ابدأ محادثة جديدة مع الحلاقين أو العملاء
            </p>
          </div>
        ) : (
          <div className="p-4">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.user.id}
                onClick={() => openChat(conversation)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.user.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500">
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
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
