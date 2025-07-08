import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Image,
  Smile,
  Plus,
  MessageCircle,
} from "lucide-react";
import { User } from "@shared/api";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: User;
  receiver?: User;
}

interface Conversation {
  user: User;
  lastMessage?: Message;
  unreadCount: number;
}

interface MessagesPageProps {
  user: User;
  onBack: () => void;
  targetUser?: User; // If provided, will start conversation with this user
}

export default function MessagesPage({
  user,
  onBack,
  targetUser,
}: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Start conversation with target user if provided
  useEffect(() => {
    if (targetUser) {
      const targetConversation: Conversation = {
        user: targetUser,
        lastMessage: undefined,
        unreadCount: 0,
      };
      setSelectedConversation(targetConversation);
      loadMessages(targetUser.id);
    }
  }, [targetUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        loadMessages(selectedConversation.user.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      // Create mock conversations for demo
      const mockConversations: Conversation[] = [
        {
          user: {
            id: "barber_1",
            name: "أحمد الحلاق",
            email: "ahmed@example.com",
            role: "barber",
            status: "active",
            level: 85,
            points: 2500,
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          lastMessage: {
            id: "msg_1",
            sender_id: "barber_1",
            receiver_id: user.id,
            content: "شكراً لك على الحجز، نراك غداً",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            read: false,
          },
          unreadCount: 2,
        },
        {
          user: {
            id: "barber_2",
            name: "محمد العلي",
            email: "mohammed@example.com",
            role: "barber",
            status: "active",
            level: 92,
            points: 3200,
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          lastMessage: {
            id: "msg_2",
            sender_id: user.id,
            receiver_id: "barber_2",
            content: "متى يمكنني الحجز لقصة شعر؟",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            read: true,
          },
          unreadCount: 0,
        },
      ];
      setConversations(mockConversations);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const response = await apiClient.getMessages(otherUserId);
      setMessages(response.messages || []);

      // Mark messages as read
      await apiClient.markMessagesAsRead(otherUserId);

      // Update conversation unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.user.id === otherUserId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );
    } catch (error) {
      console.error("Error loading messages:", error);
      // Create mock messages for demo
      const mockMessages: Message[] = [
        {
          id: "msg_demo_1",
          sender_id: otherUserId,
          receiver_id: user.id,
          content: "مرحباً! كيف يمكنني مساعدتك؟",
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: true,
        },
        {
          id: "msg_demo_2",
          sender_id: user.id,
          receiver_id: otherUserId,
          content: "أريد حجز موعد لقصة شعر",
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          read: true,
        },
        {
          id: "msg_demo_3",
          sender_id: otherUserId,
          receiver_id: user.id,
          content: "بالطبع! متى تريد الموعد؟",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: true,
        },
      ];
      setMessages(mockMessages);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      const messageData = {
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim(),
      };

      const response = await apiClient.sendMessage(messageData);

      // Add message to current conversation
      const newMsg: Message = {
        id: response.message?.id || `temp_${Date.now()}`,
        sender_id: user.id,
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read: false,
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");

      // Update conversation with new last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.user.id === selectedConversation.user.id
            ? { ...conv, lastMessage: newMsg }
            : conv,
        ),
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Add message optimistically even if API fails
      const newMsg: Message = {
        id: `temp_${Date.now()}`,
        sender_id: user.id,
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read: false,
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    } finally {
      setIsSending(false);
    }
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
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `${diffInMinutes}د`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}س`;
    return `${Math.floor(diffInMinutes / 1440)}ي`;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0,
  );

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-golden-600/3"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-golden-600/5 rounded-full blur-3xl"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Chat Header */}
          <div className="sticky top-0 z-50 bg-card border-b border-border/50 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                  className="hover:bg-primary/10 text-foreground"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                  <AvatarImage src={selectedConversation.user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-golden-600 text-primary-foreground text-sm font-medium">
                    {selectedConversation.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {selectedConversation.user.name}
                  </h3>
                  <p className="text-xs text-primary font-medium">نشط الآن</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4 py-2 bg-background/50 backdrop-blur-sm">
              <div className="space-y-3 pb-20">
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === user.id;
                  const showTime =
                    index === messages.length - 1 ||
                    messages[index + 1]?.sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                        isOwn ? "justify-end" : "justify-start",
                      )}
                    >
                      <div className="flex flex-col max-w-[75%]">
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm relative shadow-lg backdrop-blur-sm",
                            isOwn
                              ? "bg-gradient-to-r from-primary to-golden-600 text-primary-foreground ml-auto border border-primary/20"
                              : "bg-gradient-to-r from-muted to-card text-foreground mr-auto border border-border/50",
                          )}
                        >
                          <p className="leading-relaxed">{message.content}</p>
                        </div>
                        {showTime && (
                          <p
                            className={cn(
                              "text-xs mt-1 text-muted-foreground/70",
                              isOwn ? "text-right mr-2" : "text-left ml-2",
                            )}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Message Input - Instagram Style */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/20 safe-area-bottom">
            <div className="px-4 py-3">
              <div className="flex items-end gap-3 max-w-screen-lg mx-auto">
                {/* Attachment Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0 border border-border/20"
                >
                  <Plus className="h-5 w-5" />
                </Button>

                {/* Message Input Container */}
                <div className="flex-1 relative">
                  <div className="bg-muted/30 backdrop-blur-sm rounded-[24px] border border-border/20 transition-all duration-200 focus-within:border-primary/40 focus-within:bg-muted/40 focus-within:shadow-lg focus-within:shadow-primary/10">
                    <div className="flex items-end">
                      {/* Text Input */}
                      <div className="flex-1 px-4 py-3">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="رسالة..."
                          rows={1}
                          className="w-full resize-none bg-transparent text-sm text-right placeholder:text-muted-foreground/60 focus:outline-none leading-5 max-h-20 scrollbar-none"
                          style={{
                            fontFamily: "inherit",
                            lineHeight: "20px",
                          }}
                          disabled={isSending}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height =
                              Math.min(target.scrollHeight, 80) + "px";
                          }}
                        />
                      </div>

                      {/* Emoji & Image Buttons */}
                      <div className="flex items-center gap-1 px-2 pb-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  onClick={sendMessage}
                  size="icon"
                  disabled={!newMessage.trim() || isSending}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all duration-300 shrink-0 border",
                    newMessage.trim()
                      ? "bg-gradient-to-r from-primary to-golden-600 hover:from-primary/90 hover:to-golden-500 text-primary-foreground border-transparent shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
                      : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed border-border/20",
                  )}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Keyboard Safe Area */}
            <div className="h-[env(keyboard-inset-height)] bg-background/95 backdrop-blur-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-golden-600/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,200,87,0.1),transparent_50%)]"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-primary/10 text-foreground"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-golden-600 bg-clip-text text-transparent">
                  الرسائل
                </h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10 text-muted-foreground hover:text-primary"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-background/50 backdrop-blur-sm min-h-screen">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/70" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="pr-10 text-right rounded-xl bg-muted/50 backdrop-blur-sm border-border/50 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Conversations List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-golden-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-golden-600 bg-clip-text text-transparent mb-3">
                  لا توجد محادثات
                </h3>
                <p className="text-muted-foreground/80">
                  {searchQuery ? "جرب البحث بكلمة أخرى" : "ابدأ محادثة جديدة"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.user.id}
                  className="group bg-card/50 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-card/80 hover:scale-[1.02] transition-all duration-300 p-4 border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98]"
                  onClick={() => {
                    setSelectedConversation(conversation);
                    loadMessages(conversation.user.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/30 group-hover:ring-primary/60 group-hover:ring-4 transition-all duration-300">
                        <AvatarImage src={conversation.user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-golden-600 text-primary-foreground font-medium group-hover:from-primary/90 group-hover:to-golden-500 transition-all">
                          {conversation.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-r from-primary to-golden-600 border-2 border-card rounded-full shadow-lg animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground truncate">
                          {conversation.user.name}
                        </h4>
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground/70">
                            {formatTime(conversation.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className={cn(
                            "text-sm truncate",
                            conversation.unreadCount > 0
                              ? "text-foreground font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {conversation.lastMessage?.content || "لا توجد رسائل"}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <div className="w-3 h-3 bg-gradient-to-r from-primary to-golden-600 rounded-full ml-2 shadow-lg shadow-primary/25 animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
