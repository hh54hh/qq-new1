import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@shared/api";
import {
  X,
  ArrowLeft,
  Send,
  Smile,
  Plus,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type?: "text" | "image" | "voice" | "system";
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
}

interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: string;
}

interface ChatOverlayProps {
  user: User;
  targetUser?: User;
  isVisible: boolean;
  onClose: () => void;
}

export default function ChatOverlay({
  user,
  targetUser,
  isVisible,
  onClose,
}: ChatOverlayProps) {
  const [currentView, setCurrentView] = useState<"list" | "conversation">(
    "list",
  );
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // تحميل المحادثات
  const loadConversations = useCallback(async () => {
    if (!isVisible) return;

    setIsLoading(true);
    try {
      // محاكاة تحميل المحادثا��
      const mockConversations: Conversation[] = [
        {
          id: "1",
          user: {
            id: "1",
            name: "أحمد محمد",
            email: "ahmed@example.com",
            role: "barber" as any,
            status: "active",
            level: 85,
            points: 2100,
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          lastMessage: {
            id: "msg1",
            sender_id: "1",
            receiver_id: user.id,
            content: "مرحباً، كيف يمكنني مساعدتك؟",
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            read: false,
            delivery_status: "delivered",
          },
          unreadCount: 2,
          isOnline: true,
        },
        {
          id: "2",
          user: {
            id: "2",
            name: "فاطمة أحمد",
            email: "fatima@example.com",
            role: "customer" as any,
            status: "active",
            level: 65,
            points: 1200,
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          lastMessage: {
            id: "msg2",
            sender_id: user.id,
            receiver_id: "2",
            content: "شكراً لك على الخدمة الممتازة",
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: true,
            delivery_status: "read",
          },
          unreadCount: 0,
          isOnline: false,
          lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ];

      // إضافة المحادثة المستهدفة إذا كانت موجودة
      if (targetUser) {
        const existingConv = mockConversations.find(
          (c) => c.user.id === targetUser.id,
        );
        if (!existingConv) {
          mockConversations.unshift({
            id: targetUser.id,
            user: targetUser,
            unreadCount: 0,
            isOnline: Math.random() > 0.5,
          });
        }
      }

      setConversations(mockConversations);
    } catch (error) {
      console.error("خطأ في تحميل المحادثات:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isVisible, user.id, targetUser]);

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      try {
        // محاكاة تحميل الرسائل
        const mockMessages: Message[] = [
          {
            id: "1",
            sender_id: conversationId,
            receiver_id: user.id,
            content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
            created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            read: true,
            delivery_status: "read",
          },
          {
            id: "2",
            sender_id: user.id,
            receiver_id: conversationId,
            content: "مرحباً، أريد حجز موعد للغد",
            created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
            read: true,
            delivery_status: "read",
          },
          {
            id: "3",
            sender_id: conversationId,
            receiver_id: user.id,
            content: "بالطبع! ما هو الوقت المناسب لك؟",
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            read: false,
            delivery_status: "delivered",
          },
        ];

        setMessages(mockMessages);
      } catch (error) {
        console.error("خطأ في تحميل الرسائل:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [user.id],
  );

  // إرسال رسالة
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // إضافة الرسالة فوراً مع حالة الإرسال
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedConversation.user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      read: false,
      delivery_status: "sending",
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      // محاولة إرسال الرسالة
      const response = await apiClient.sendMessage({
        receiver_id: selectedConversation.user.id,
        content: messageContent,
      });

      // تحديث الرسالة بالمعرف الحقيقي وحالة الإرسال
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...msg,
                id: response.message?.id || tempMessage.id,
                delivery_status: "sent",
              }
            : msg,
        ),
      );
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);
      // تحديث حالة الرسالة إلى فشل
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? { ...msg, delivery_status: "failed" }
            : msg,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedConversation, user.id, isSending]);

  // معالجة ضغط Enter
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  // تمرير الرسائل للأسفل
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // التأثيرات
  useEffect(() => {
    if (isVisible) {
      loadConversations();
      // بدء محادثة مع المستخدم المستهدف
      if (targetUser) {
        const targetConv: Conversation = {
          id: targetUser.id,
          user: targetUser,
          unreadCount: 0,
          isOnline: Math.random() > 0.5,
        };
        setSelectedConversation(targetConv);
        setCurrentView("conversation");
        loadMessages(targetUser.id);
      }
    }
  }, [isVisible, loadConversations, targetUser, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // التركيز على الإدخال عند فتح المحادثة
  useEffect(() => {
    if (currentView === "conversation" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentView]);

  if (!isVisible) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeliveryStatusIcon = (status?: string) => {
    switch (status) {
      case "sending":
        return "⏳";
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      case "failed":
        return "❌";
      default:
        return "";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="absolute inset-4 md:inset-8 lg:inset-12 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
        >
          {currentView === "list" ? (
            // قائمة المحادثات
            <>
              {/* هيدر قائمة المحادثات */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-xl font-bold text-white">المحادثات</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X size={20} />
                </Button>
              </div>

              {/* قائمة المحادثات */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="p-2">
                    {conversations.map((conversation) => (
                      <motion.div
                        key={conversation.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedConversation(conversation);
                          setCurrentView("conversation");
                          loadMessages(conversation.id);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-all"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.user.name}`}
                            />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {conversation.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white truncate">
                              {conversation.user.name}
                            </h3>
                            {conversation.lastMessage && (
                              <span className="text-xs text-slate-400">
                                {formatTime(
                                  conversation.lastMessage.created_at,
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400 truncate">
                              {conversation.lastMessage?.content ||
                                "لا توجد رسائل بعد"}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // واجهة المحادثة
            selectedConversation && (
              <>
                {/* هيدر المحادثة */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentView("list")}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <ArrowLeft size={20} />
                    </Button>

                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConversation.user.name}`}
                        />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {selectedConversation.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-white">
                        {selectedConversation.user.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedConversation.isOnline
                          ? "متصل الآن"
                          : selectedConversation.lastSeen
                            ? `آخر ظهور ${formatTime(selectedConversation.lastSeen)}`
                            : "غير متصل"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Phone size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Video size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <MoreVertical size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </div>

                {/* منطقة الرسائل */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex",
                          message.sender_id === user.id
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2 shadow-lg",
                            message.sender_id === user.id
                              ? "bg-blue-600 text-white rounded-br-md"
                              : "bg-slate-800 text-white border border-slate-700 rounded-bl-md",
                          )}
                        >
                          <p className="text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-xs opacity-70">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender_id === user.id && (
                              <span className="text-xs opacity-70">
                                {getDeliveryStatusIcon(message.delivery_status)}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* منطقة كتابة الرسالة */}
                <div className="border-t border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <div className="bg-slate-700/50 rounded-2xl border border-slate-600 focus-within:border-blue-500 transition-all">
                        <div className="flex items-end">
                          <div className="flex-1 px-4 py-3">
                            <textarea
                              ref={inputRef}
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="اكتب رسالة..."
                              rows={1}
                              className="w-full resize-none bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none leading-5 scrollbar-hide"
                              style={{
                                fontFamily: "inherit",
                                lineHeight: "20px",
                                minHeight: "20px",
                                maxHeight: "100px",
                              }}
                              disabled={isSending}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-12 w-12 p-0 shadow-lg"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Send size={18} />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
