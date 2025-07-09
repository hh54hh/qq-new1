import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  MoreVertical,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import apiClient from "@/lib/api";
import type { User } from "@shared/api";

interface MessagesPageProps {
  user: User;
  targetUserId?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
}

interface MessageWithUser extends Message {
  sender: User;
}

interface ConversationWithUser extends Conversation {
  otherUser: User;
  lastMessage?: MessageWithUser;
}

export default function MessagesPage({
  user,
  targetUserId,
}: MessagesPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state] = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get target user from URL if not provided as prop
  const urlTargetUserId = searchParams.get("user") || targetUserId;

  // States
  const [conversations, setConversations] = useState<ConversationWithUser[]>(
    [],
  );
  const [activeConversation, setActiveConversation] =
    useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Open specific conversation if targetUserId provided
  useEffect(() => {
    if (urlTargetUserId && conversations.length > 0) {
      const targetConversation = conversations.find(
        (conv) => conv.otherUser.id === urlTargetUserId,
      );
      if (targetConversation) {
        setActiveConversation(targetConversation);
        loadMessages(targetConversation.id);
      }
    }
  }, [urlTargetUserId, conversations]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();

      // Transform conversations with user data
      const conversationsWithUsers: ConversationWithUser[] =
        response.conversations.map((conv) => {
          const otherUserId =
            conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
          const otherUser = response.users.find(
            (u) => u.id === otherUserId,
          ) || {
            id: otherUserId,
            name: "مستخدم غير معروف",
            email: "",
            role: "customer" as const,
            location: null,
            verified: false,
            rating: 0,
            profilePictureUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return {
            ...conv,
            otherUser,
            lastMessage: conv.lastMessage
              ? {
                  ...conv.lastMessage,
                  sender:
                    conv.lastMessage.senderId === user.id ? user : otherUser,
                }
              : undefined,
          };
        });

      setConversations(conversationsWithUsers);
    } catch (error) {
      console.error("فشل تحميل المحادثات:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiClient.getMessages(conversationId);

      // Get all unique user IDs from messages
      const userIds = [...new Set(response.messages.map((m) => m.senderId))];
      const users = new Map<string, User>();
      users.set(user.id, user);

      // Load user data for other participants
      for (const userId of userIds) {
        if (userId !== user.id && !users.has(userId)) {
          try {
            const userResponse = await apiClient.getBarberProfile(userId);
            users.set(userId, userResponse.barber);
          } catch {
            // Fallback user if loading fails
            users.set(userId, {
              id: userId,
              name: "مستخدم غير معروف",
              email: "",
              role: "customer" as const,
              location: null,
              verified: false,
              rating: 0,
              profilePictureUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      // Transform messages with sender data
      const messagesWithUsers: MessageWithUser[] = response.messages.map(
        (msg) => ({
          ...msg,
          sender: users.get(msg.senderId) || users.get(user.id)!,
        }),
      );

      setMessages(messagesWithUsers);
    } catch (error) {
      console.error("فشل تحميل الرسائل:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;

    try {
      setIsSending(true);

      const messageData = {
        conversationId: activeConversation.id,
        content: newMessage.trim(),
        type: "text" as const,
      };

      const response = await apiClient.sendMessage(messageData);

      // Add the new message to the list
      const newMessageWithUser: MessageWithUser = {
        ...response.message,
        sender: user,
      };

      setMessages((prev) => [...prev, newMessageWithUser]);
      setNewMessage("");

      // Update conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation.id
            ? { ...conv, lastMessage: newMessageWithUser }
            : conv,
        ),
      );
    } catch (error) {
      console.error("فشل إرسال الرسالة:", error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جارٍ تحميل المحادثات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-card border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">الرسائل</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
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
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  activeConversation?.id === conversation.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {conversation.otherUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {conversation.otherUser.name}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {activeConversation.otherUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h2 className="font-medium">
                      {activeConversation.otherUser.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeConversation.otherUser.role === "barber"
                        ? "حلاق"
                        : "عميل"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === user.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.senderId === user.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="اكتب رسالتك..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">اختر محادثة</h3>
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
