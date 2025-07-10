import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Send, Phone, Video, MoreVertical } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { useAppStore } from "@/lib/store";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: "text" | "image" | "voice" | "system";
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state] = useAppStore();
  const user = state.user;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get chat partner info from URL params
  const otherUserId = searchParams.get("with");
  const otherUserName = searchParams.get("name") || "محادثة";
  const otherUserAvatar = searchParams.get("avatar");
  const otherUserRole = searchParams.get("role") || "user";

  useEffect(() => {
    if (!user || !otherUserId) {
      navigate("/dashboard");
      return;
    }
    loadMessages();

    // Scroll to bottom when messages change
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timer);
  }, [otherUserId, user]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!otherUserId) return;

    try {
      setIsLoading(true);
      const response = await apiClient.getMessages(otherUserId);
      setMessages(response.messages || []);

      // Mark conversation as read
      await apiClient.markConversationAsRead(otherUserId);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !otherUserId || !user) return;

    try {
      const message = await apiClient.createMessage({
        receiver_id: otherUserId,
        message: newMessage.trim(),
      });

      // Add to messages immediately
      setMessages((prev) => [...prev, message]);

      // Clear input immediately
      setNewMessage("");

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent keyboard from hiding by not blurring input
    if (inputRef.current) {
      inputRef.current.focus();
    }

    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  if (!user || !otherUserId) {
    return null;
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
              <p className="text-xs text-muted-foreground">
                {otherUserRole === "barber" ? "حلاق" : "عميل"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
        <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-4 pb-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === user.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end gap-2",
                      isOwn ? "flex-row-reverse" : "flex-row",
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
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isOwn
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
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
              placeholder="اكتب رسالة..."
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyPress={handleKeyPress}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
          <Button
            onClick={handleSendClick}
            disabled={!newMessage.trim()}
            size="sm"
            className="rounded-full w-10 h-10 p-0 shrink-0"
            type="button"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
