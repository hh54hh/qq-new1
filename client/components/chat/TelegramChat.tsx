import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getOfflineStorage } from "@/lib/offline-storage";
import offlineAPI from "@/lib/offline-api";

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  isOwn: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  isOffline?: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  isOnline?: boolean;
}

interface TelegramChatProps {
  currentUserId: string;
  onBack?: () => void;
}

export default function TelegramChat({
  currentUserId,
  onBack,
}: TelegramChatProps) {
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Keep input focused
  useEffect(() => {
    if (activeConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);

      // Try to load from network first
      const response = await offlineAPI.get("/api/conversations");

      if (response.success && response.data) {
        setConversations(response.data);
      } else {
        // Load from offline storage
        const storage = await getOfflineStorage();
        const cachedConversations = await storage.getAllData("conversations");
        setConversations(cachedConversations);
      }
    } catch (error) {
      console.log("📱 Loading conversations from offline storage");
      const storage = await getOfflineStorage();
      const cachedConversations = await storage.getAllData("conversations");
      setConversations(cachedConversations);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Try to load from network first
      const response = await offlineAPI.get(
        `/api/conversations/${conversationId}/messages`,
      );

      if (response.success && response.data) {
        setMessages(
          response.data.map((msg: any) => ({
            ...msg,
            isOwn: msg.senderId === currentUserId,
            timestamp: new Date(msg.createdAt).getTime(),
          })),
        );
      } else {
        // Load from offline storage
        const storage = await getOfflineStorage();
        const cachedMessages = await storage.getAllData("messages");
        const conversationMessages = cachedMessages.filter(
          (msg: any) => msg.conversationId === conversationId,
        );
        setMessages(
          conversationMessages.map((msg: any) => ({
            ...msg,
            isOwn: msg.senderId === currentUserId,
            timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
          })),
        );
      }
    } catch (error) {
      console.log("📱 Loading messages from offline storage");
      const storage = await getOfflineStorage();
      const cachedMessages = await storage.getAllData("messages");
      const conversationMessages = cachedMessages.filter(
        (msg: any) => msg.conversationId === conversationId,
      );
      setMessages(
        conversationMessages.map((msg: any) => ({
          ...msg,
          isOwn: msg.senderId === currentUserId,
          timestamp: new Date(msg.createdAt || msg.timestamp).getTime(),
        })),
      );
    }
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeConversation) return;

    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      content: newMessage.trim(),
      senderId: currentUserId,
      timestamp: Date.now(),
      isOwn: true,
      status: "sending",
      isOffline: !navigator.onLine,
    };

    // Add message to UI immediately
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    // Keep input focused
    if (inputRef.current) {
      inputRef.current.focus();
    }

    try {
      // Try to send to server
      const response = await offlineAPI.post("/api/messages", {
        conversationId: activeConversation.id,
        content: tempMessage.content,
        recipientId: activeConversation.id, // This should be the other user's ID
      });

      if (response.success) {
        // Update message with server response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id
              ? { ...tempMessage, id: response.data.id, status: "sent" }
              : msg,
          ),
        );
      } else {
        // Mark as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id
              ? { ...tempMessage, status: "failed" }
              : msg,
          ),
        );
      }
    } catch (error) {
      // Store for offline sync
      const storage = await getOfflineStorage();
      await storage.saveData(
        "pendingMessages",
        {
          conversationId: activeConversation.id,
          content: tempMessage.content,
          senderId: currentUserId,
          timestamp: tempMessage.timestamp,
        },
        tempMessage.id,
      );

      // Update status based on network
      const status = navigator.onLine ? "failed" : "sending";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? { ...tempMessage, status, isOffline: !navigator.onLine }
            : msg,
        ),
      );
    }
  }, [newMessage, activeConversation, currentUserId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    if (hours < 24) return `قبل ${hours} ساعة`;
    return `قبل ${days} يوم`;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">الرسائل</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  setActiveConversation(conversation);
                  loadMessages(conversation.id);
                }}
                className={cn(
                  "p-3 cursor-pointer transition-colors border-b border-border/50",
                  "hover:bg-muted/50",
                  activeConversation?.id === conversation.id && "bg-muted",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {conversation.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">
                        {conversation.name}
                      </h3>
                      {conversation.lastMessageTime && (
                        <span className="text-xs text-muted-foreground">
                          {formatLastSeen(conversation.lastMessageTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage || "لا توجد رسائل"}
                      </p>
                      {conversation.unreadCount &&
                        conversation.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {activeConversation.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h2 className="font-semibold">{activeConversation.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {activeConversation.isOnline ? "متصل الآن" : "غير متصل"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-1"
              style={{ scrollBehavior: "auto" }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex mb-1",
                    message.isOwn ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] px-3 py-2 rounded-xl text-sm",
                      message.isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        message.isOwn
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="text-xs">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.isOwn && (
                        <div className="flex items-center">
                          {message.status === "sending" && (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                          )}
                          {message.status === "sent" && (
                            <span className="text-xs">✓</span>
                          )}
                          {message.status === "delivered" && (
                            <span className="text-xs">✓✓</span>
                          )}
                          {message.status === "read" && (
                            <span className="text-xs text-blue-400">✓✓</span>
                          )}
                          {message.status === "failed" && (
                            <span className="text-xs text-destructive">!</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-muted rounded-full px-4 py-2 max-h-32">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="اكتب رسال��..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground"
                    style={{ caretColor: "currentColor" }}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                  className="rounded-full w-10 h-10 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">اختر محادثة</h3>
              <p className="text-muted-foreground">
                اختر محادثة من القائمة لبدء المراسلة
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
