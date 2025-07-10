import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Send,
  ArrowLeft,
  User,
  MessageCircle,
  Users,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  message_type: "text" | "image" | "voice" | "system";
}

interface Conversation {
  id: string;
  other_user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: "customer" | "barber" | "admin";
    is_online?: boolean;
  };
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

interface SmartMessagesPageProps {
  targetUserId?: string;
}

export default function SmartMessagesPage({
  targetUserId,
}: SmartMessagesPageProps) {
  const [state] = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowConversationList(window.innerWidth >= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Check URL parameters for target user
    const urlParams = new URLSearchParams(window.location.search);
    const targetUser = urlParams.get("targetUser") || targetUserId;

    if (targetUser) {
      console.log("🎯 هدف المحادثة من URL/props:", targetUser);
      handleStartConversation(targetUser);
    }
  }, [targetUserId]);

  // Listen for chat start events
  useEffect(() => {
    const handleChatStart = (event: CustomEvent) => {
      const { userId } = event.detail;
      if (userId) {
        console.log("🚀 استقبال حدث بدء محادثة:", userId);
        handleStartConversation(userId);
      }
    };

    window.addEventListener("chatStart", handleChatStart as EventListener);
    return () => {
      window.removeEventListener("chatStart", handleChatStart as EventListener);
    };
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 تحميل المحادثات...");

      const response = await fetch("/api/messages/conversations", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ تم تحميل المحادثات:", data);
        setConversations(data.conversations || []);
      } else {
        console.error("❌ فشل تحميل المحادثات");
        setConversations([]);
      }
    } catch (error) {
      console.error("❌ خطأ في تحميل المحادثات:", error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      console.log("🔄 تحميل الرسائل مع:", otherUserId);

      const response = await fetch(`/api/messages/${otherUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ تم تحميل الرسائل:", data);
        setMessages(data || []);

        // Mark messages as read
        markAsRead(otherUserId);
      } else {
        console.error("❌ فشل تحميل الرسائل");
        setMessages([]);
      }
    } catch (error) {
      console.error("❌ خطأ في تحميل الرسائل:", error);
      setMessages([]);
    }
  };

  const markAsRead = async (otherUserId: string) => {
    try {
      await fetch(`/api/messages/${otherUserId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      // Update conversation unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.other_user.id === otherUserId
            ? { ...conv, unread_count: 0 }
            : conv,
        ),
      );
    } catch (error) {
      console.error("❌ خطأ في تحديث حالة القراءة:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      const tempMessage: Message = {
        id: "temp-" + Date.now(),
        content: newMessage.trim(),
        sender_id: state.user!.id,
        receiver_id: selectedConversation.other_user.id,
        created_at: new Date().toISOString(),
        is_read: false,
        message_type: "text",
      };

      // Add message optimistically
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiver_id: selectedConversation.other_user.id,
          content: tempMessage.content,
          message_type: "text",
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        console.log("✅ تم إرسال الرسالة:", sentMessage);

        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? sentMessage : msg)),
        );

        // Update conversation list
        loadConversations();
      } else {
        console.error("❌ فشل إرسال الرسالة");
        // Remove temp message on failure
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      }
    } catch (error) {
      console.error("❌ خطأ في إرسال الرسالة:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    try {
      console.log("🔄 بدء محادثة مع:", userId);

      // Check if conversation already exists
      const existingConv = conversations.find(
        (conv) => conv.other_user.id === userId,
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
        if (isMobile) setShowConversationList(false);
        return;
      }

      // Get user info
      const userResponse = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();

        const newConversation: Conversation = {
          id: `conv-${userId}`,
          other_user: {
            id: userData.id,
            name: userData.name,
            avatar_url: userData.avatar_url,
            role: userData.role,
            is_online: false,
          },
          unread_count: 0,
          updated_at: new Date().toISOString(),
        };

        setSelectedConversation(newConversation);
        setMessages([]);
        if (isMobile) setShowConversationList(false);
      }
    } catch (error) {
      console.error("❌ خطأ في بدء المحادثة:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("❌ خطأ في البحث:", error);
      setSearchResults([]);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("ar", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("ar");
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_id !== state.user?.id) return null;

    if (message.is_read) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations List */}
      <AnimatePresence>
        {(showConversationList || !isMobile) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`${isMobile ? "absolute z-10 inset-0" : "relative"} w-full md:w-1/3 lg:w-1/4 bg-white border-r`}
          >
            {/* Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">الرسائل</h1>
                <Button
                  size="sm"
                  onClick={() => setShowUserSearch(true)}
                  className="rounded-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="البحث في المحادثات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد محادثات بعد</p>
                  <p className="text-sm">ابدأ محادثة جديدة!</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    whileHover={{ backgroundColor: "#f9fafb" }}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      if (isMobile) setShowConversationList(false);
                    }}
                    className={`p-4 cursor-pointer border-b ${
                      selectedConversation?.id === conversation.id
                        ? "bg-blue-50 border-r-4 border-r-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage
                            src={conversation.other_user.avatar_url}
                          />
                          <AvatarFallback>
                            {conversation.other_user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.other_user.is_online && (
                          <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conversation.other_user.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {conversation.last_message &&
                              formatTime(conversation.last_message.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.last_message?.content ||
                              "بدء محادثة جديدة"}
                          </p>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${isMobile && showConversationList ? "hidden" : ""}`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversationList(true)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}

                <Avatar>
                  <AvatarImage
                    src={selectedConversation.other_user.avatar_url}
                  />
                  <AvatarFallback>
                    {selectedConversation.other_user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h2 className="font-medium">
                    {selectedConversation.other_user.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.other_user.is_online
                      ? "متصل الآن"
                      : "غير متصل"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender_id === state.user?.id
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === state.user?.id
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-900 rounded-bl-none"
                    }`}
                  >
                    <p>{message.content}</p>
                    <div
                      className={`flex items-center justify-between mt-1 text-xs ${
                        message.sender_id === state.user?.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      <span>{formatTime(message.created_at)}</span>
                      {getMessageStatus(message)}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Input
                  placeholder="اكتب رسالة..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                >
                  {isSending ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                اختر محادثة
              </h2>
              <p className="text-gray-500">
                اختر محادثة من القائمة لبدء المراسلة
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-medium mb-4">بدء محادثة جديدة</h3>

            <Input
              placeholder="البحث عن مستخدم..."
              onChange={(e) => searchUsers(e.target.value)}
              className="mb-4"
            />

            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    handleStartConversation(user.id);
                    setShowUserSearch(false);
                    setSearchResults([]);
                  }}
                  className="flex items-center space-x-3 space-x-reverse p-3 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserSearch(false);
                  setSearchResults([]);
                }}
              >
                إلغاء
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
