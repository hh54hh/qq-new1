import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@shared/api";
import "../../styles/chat-overlay.css";
import {
  X,
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  chatManager,
  type Message,
  type Conversation,
} from "@/lib/chat-manager";
import StableMessageInput from "./StableMessageInput";
import { useKeyboardHandler } from "@/hooks/use-keyboard-handler";

interface ImprovedChatOverlayProps {
  user: User;
  targetUser?: User;
  isVisible: boolean;
  onClose: () => void;
}

export default function ImprovedChatOverlay({
  user,
  targetUser,
  isVisible,
  onClose,
}: ImprovedChatOverlayProps) {
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const keyboardState = useKeyboardHandler();

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionError(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionError("لا يوجد اتصال بالإنترنت");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // تمرير الرسائل للأسفل
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  // تحميل المحادثات
  const loadConversations = useCallback(async () => {
    if (!isVisible) return;

    setIsLoading(true);
    setConnectionError(null);

    try {
      const loadedConversations = await chatManager.loadConversations(user.id);

      // إضافة المحادثة المستهدفة إذا كانت موجودة
      if (targetUser) {
        const existingConv = loadedConversations.find(
          (c) => c.user.id === targetUser.id,
        );
        if (!existingConv) {
          const targetConv: Conversation = {
            id: targetUser.id,
            user: targetUser,
            unreadCount: 0,
            isOnline: Math.random() > 0.5,
          };
          loadedConversations.unshift(targetConv);
        }
      }

      setConversations(loadedConversations);
    } catch (error) {
      console.error("خطأ في تحميل المحادثات:", error);
      setConnectionError("فشل في تحميل المحادثات");
    } finally {
      setIsLoading(false);
    }
  }, [isVisible, user.id, targetUser]);

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      setConnectionError(null);

      try {
        const loadedMessages = await chatManager.loadMessages(
          conversationId,
          user.id,
        );
        setMessages(loadedMessages);

        // تحديد الرسائل كمقروءة
        await chatManager.markAsRead(conversationId, user.id);
      } catch (error) {
        console.error("خطأ في تحميل الرسائل:", error);
        setConnectionError("فشل في تحميل الرسائل");
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
    setConnectionError(null);

    try {
      await chatManager.sendMessage(
        {
          receiver_id: selectedConversation.user.id,
          content: messageContent,
        },
        user.id,
      );
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);
      setConnectionError("فشل في إرسال الرسالة");
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedConversation, user.id, isSending]);

  // معالجة أحداث مدير الدردشة
  useEffect(() => {
    const handleMessageAdded = (data: any) => {
      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleMessageUpdated = (data: any) => {
      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.oldMessageId ? data.message : msg,
          ),
        );
      }
    };

    chatManager.addEventListener("messageAdded", handleMessageAdded);
    chatManager.addEventListener("messageUpdated", handleMessageUpdated);

    return () => {
      chatManager.removeEventListener("messageAdded", handleMessageAdded);
      chatManager.removeEventListener("messageUpdated", handleMessageUpdated);
    };
  }, [selectedConversation]);

  // التأثيرات الرئيسية
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

  // منع التمرير في الخلفية
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

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
        return (
          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
        );
      case "sent":
        return <CheckCircle2 size={12} className="text-green-400" />;
      case "delivered":
        return <CheckCircle2 size={12} className="text-green-500" />;
      case "read":
        return <CheckCircle2 size={12} className="text-blue-500" />;
      case "failed":
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return null;
    }
  };

  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversation) return;
      try {
        await chatManager.retryMessage(messageId, selectedConversation.id);
      } catch (error) {
        console.error("فشل في إعادة الإرسال:", error);
      }
    },
    [selectedConversation],
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="chat-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* شريط الاتصال */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 z-60 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <WifiOff size={16} />
              <span className="text-sm">{connectionError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="chat-container absolute inset-4 md:inset-6 lg:inset-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
        >
          {currentView === "list" ? (
            // قائمة المحادثات
            <>
              {/* هيدر قائمة المحادثات */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">المحادثات</h2>
                  <div className="flex items-center gap-1">
                    {isOnline ? (
                      <Wifi size={16} className="text-green-500" />
                    ) : (
                      <WifiOff size={16} className="text-red-500" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                >
                  <X size={24} />
                </Button>
              </div>

              {/* قائمة المحادثات */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
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
                        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-800/50 cursor-pointer transition-all duration-200"
                      >
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.user.name}`}
                            />
                            <AvatarFallback className="bg-blue-600 text-white text-lg">
                              {conversation.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white truncate text-lg">
                              {conversation.user.name}
                            </h3>
                            {conversation.lastMessage && (
                              <span className="text-sm text-slate-400">
                                {formatTime(
                                  conversation.lastMessage.created_at,
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-slate-400 truncate">
                              {conversation.lastMessage?.content ||
                                "لا توجد رسائل بعد"}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full min-w-[24px] text-center ml-2">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {conversations.length === 0 && !isLoading && (
                      <div className="text-center py-12">
                        <p className="text-slate-400">لا توجد محادثات بعد</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            // واجهة المحادثة
            selectedConversation && (
              <>
                {/* هيدر المحادثة */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentView("list")}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                    >
                      <ArrowLeft size={24} />
                    </Button>

                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConversation.user.name}`}
                        />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {selectedConversation.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {selectedConversation.user.name}
                      </h3>
                      <p className="text-sm text-slate-400">
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
                      className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                    >
                      <Phone size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                    >
                      <Video size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                    >
                      <MoreVertical size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                    >
                      <X size={24} />
                    </Button>
                  </div>
                </div>

                {/* منطقة الرسائل */}
                <div className="chat-messages flex-1 overflow-y-auto p-6 space-y-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
                            "max-w-[75%] rounded-3xl px-6 py-4 shadow-lg relative",
                            message.sender_id === user.id
                              ? "bg-blue-600 text-white rounded-br-lg"
                              : "bg-slate-800 text-white border border-slate-700 rounded-bl-lg",
                          )}
                        >
                          <p className="leading-relaxed">{message.content}</p>
                          <div className="flex items-center justify-between gap-3 mt-2">
                            <span className="text-xs opacity-70">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender_id === user.id && (
                              <div className="flex items-center gap-1">
                                {getDeliveryStatusIcon(message.delivery_status)}
                                {message.delivery_status === "failed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      retryFailedMessage(message.id)
                                    }
                                    className="text-xs p-1 h-auto text-red-300 hover:text-red-100"
                                  >
                                    إعادة المحاولة
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* منطقة كتابة الرسالة */}
                <StableMessageInput
                  value={newMessage}
                  onChange={setNewMessage}
                  onSend={sendMessage}
                  disabled={isSending || !isOnline}
                  placeholder={
                    isOnline ? "اكتب رسا��ة..." : "لا يوجد اتصال بالإنترنت"
                  }
                />
              </>
            )
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
