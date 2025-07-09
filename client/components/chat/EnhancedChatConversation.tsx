import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Send,
  Phone,
  Video,
  Info,
  Image,
  Smile,
  Plus,
  Mic,
  Camera,
  File,
  MapPin,
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Trash2,
  Star,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User } from "@shared/api";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { chatStorage, useNetworkStatus } from "@/lib/chat-storage";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type?: "text" | "image" | "voice" | "system" | "location";
  sender?: User;
  receiver?: User;
  reply_to?: string;
  is_starred?: boolean;
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  isOffline?: boolean;
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

interface EnhancedChatConversationProps {
  user: User;
  conversation: Conversation;
  onBack: () => void;
  onConversationUpdate: (conversation: Conversation) => void;
}

export default function EnhancedChatConversation({
  user,
  conversation,
  onBack,
  onConversationUpdate,
}: EnhancedChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    loadMessages();
    chatStorage.setCurrentUser(user.id);
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // محاولة إرسال الرسائل المعلقة عند الاتصال
  useEffect(() => {
    if (isOnline) {
      retryPendingMessages();
    }
  }, [isOnline]);

  // تحديث الرسائل كل 3 ثوانٍ عند الاتصال
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversation.id, isOnline]);

  // معالجة الكتابة
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newMessage.trim()) {
      setIsTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      if (!isLoading) setIsLoading(true);

      // جلب الرسائل المحفوظة محلياً أولاً
      const cachedMessages = chatStorage.getMessages(conversation.user.id);
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
      }

      // محاولة جلب الرسائل من الخادم إذا كان متصلاً
      if (isOnline) {
        const response = await apiClient.getMessages(conversation.user.id);

        const enhancedMessages: Message[] = (response.messages || []).map(
          (msg: any) => {
            // تصحيح: التأكد من وجود محتوى الرسالة
            const content = msg.content || msg.message || msg.text || "";

            console.log("تحويل رسالة من API:", {
              id: msg.id,
              content: content,
              originalData: msg,
            });

            return {
              ...msg,
              content: content, // التأكد من حقل المحتوى
              delivery_status: msg.sender_id === user.id ? "read" : "delivered",
              is_starred: false,
              isOffline: false,
            };
          },
        );

        setMessages(enhancedMessages);
        chatStorage.saveMessages(conversation.user.id, enhancedMessages);

        // تحديث عداد الرسائل غير المقروءة
        await apiClient.markMessagesAsRead(conversation.user.id);
        onConversationUpdate({
          ...conversation,
          unreadCount: 0,
        });
      }
    } catch (error) {
      console.error("خطأ في تحميل الرسائل:", error);

      // استخدام الرسائل المحفوظة محلياً في حالة الخطأ
      const cachedMessages = chatStorage.getMessages(conversation.user.id);
      if (cachedMessages.length === 0) {
        // رسائل تجريبية إذا لم توجد رسائل محفوظة
        const mockMessages: Message[] = [
          {
            id: "welcome_msg",
            sender_id: conversation.user.id,
            receiver_id: user.id,
            content: "مرحباً بك! 👋 كيف يمكنني مساعدتك اليوم؟",
            created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            read: true,
            message_type: "text",
            delivery_status: "read",
          },
        ];
        setMessages(mockMessages);
        chatStorage.saveMessages(conversation.user.id, mockMessages as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setReplyToMessage(null);

    // إنشاء رسالة مؤقتة
    const tempMessage: Message = chatStorage.createOfflineMessage(
      user.id,
      conversation.user.id,
      messageContent,
      replyToMessage?.id,
    );

    console.log("إنشاء رسالة جديدة:", {
      id: tempMessage.id,
      content: tempMessage.content,
      messageContent: messageContent,
      tempMessage: tempMessage,
    });

    // إضافة الرسالة محلياً أولاً
    setMessages((prev) => [...prev, tempMessage]);
    chatStorage.addMessage(conversation.user.id, tempMessage);

    // محاولة إرسال الرسالة للخادم
    if (isOnline) {
      try {
        setIsSending(true);

        const messageData = {
          receiver_id: conversation.user.id,
          content: messageContent,
          reply_to: replyToMessage?.id,
        };

        const response = await apiClient.sendMessage(messageData);

        // تحديث الرسالة بالمعرف الحقيقي
        const sentMessage: Message = {
          ...tempMessage,
          id: response.message?.id || tempMessage.id,
          delivery_status: "sent",
          isOffline: false,
        };

        console.log("تحديث رسالة مرسلة:", {
          id: sentMessage.id,
          content: sentMessage.content,
          response: response,
          sentMessage: sentMessage,
        });

        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? sentMessage : msg)),
        );

        chatStorage.addMessage(conversation.user.id, sentMessage);

        // تحديث المحادثة
        onConversationUpdate({
          ...conversation,
          lastMessage: sentMessage,
        });
      } catch (error) {
        console.error("خطأ في إرسال الرسالة:", error);

        // تحديث حالة الرسالة إلى فشل
        const failedMessage: Message = {
          ...tempMessage,
          delivery_status: "failed",
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? failedMessage : msg)),
        );

        chatStorage.addMessage(conversation.user.id, failedMessage);
      } finally {
        setIsSending(false);
      }
    }
  };

  const retryPendingMessages = async () => {
    const pendingMessages = chatStorage.getPendingMessages(user.id);

    for (const { conversationId, message } of pendingMessages) {
      if (conversationId === conversation.user.id) {
        try {
          const messageData = {
            receiver_id: message.receiver_id,
            content: message.content,
            reply_to: message.reply_to,
          };

          const response = await apiClient.sendMessage(messageData);

          const sentMessage: Message = {
            ...message,
            id: response.message?.id || message.id,
            delivery_status: "sent",
            isOffline: false,
          };

          setMessages((prev) =>
            prev.map((msg) => (msg.id === message.id ? sentMessage : msg)),
          );

          chatStorage.addMessage(conversationId, sentMessage);
        } catch (error) {
          console.error("خطأ في إعادة إرسال الرسالة:", error);
          chatStorage.updateMessageStatus(conversationId, message.id, "failed");
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return "اليوم";
    if (diffInDays === 1) return "أمس";
    if (diffInDays < 7) return `${diffInDays} أيام`;
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusText = () => {
    if (conversation.isTyping) return "يكتب...";
    if (conversation.isOnline) return "متصل الآن";
    if (conversation.lastSeen) {
      const lastSeenMinutes = Math.floor(
        (new Date().getTime() - new Date(conversation.lastSeen).getTime()) /
          (1000 * 60),
      );
      if (lastSeenMinutes < 1) return "كان متصلاً الآن";
      if (lastSeenMinutes < 60) return `كان متصلاً منذ ${lastSeenMinutes}د`;
      if (lastSeenMinutes < 1440)
        return `كان متصلاً منذ ${Math.floor(lastSeenMinutes / 60)}س`;
      return `كان متصلاً منذ ${Math.floor(lastSeenMinutes / 1440)}ي`;
    }
    return "";
  };

  const getDeliveryStatusIcon = (message: Message) => {
    if (message.sender_id !== user.id) return null;

    const iconClasses = "h-3 w-3 inline-block";

    switch (message.delivery_status) {
      case "sending":
        return (
          <Clock className={cn(iconClasses, "text-gray-400 animate-pulse")} />
        );
      case "failed":
        return <AlertCircle className={cn(iconClasses, "text-red-500")} />;
      case "sent":
        return <Check className={cn(iconClasses, "text-gray-400")} />;
      case "delivered":
        return <CheckCheck className={cn(iconClasses, "text-gray-400")} />;
      case "read":
        return <CheckCheck className={cn(iconClasses, "text-primary")} />;
      default:
        return <Check className={cn(iconClasses, "text-gray-400")} />;
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs,
    }));
  };

  const messageGroups = groupMessagesByDate(messages);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage, adjustTextareaHeight]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative overflow-hidden">
      {/* خلفية التطبيق */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900"></div>
        <div
          className={
            'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')] opacity-30'
          }
        ></div>
      </div>

      {/* مؤشر حالة الاتصال */}
      {!isOnline && (
        <div className="relative z-50 bg-red-500 text-white text-center py-2 text-sm">
          <WifiOff className="h-4 w-4 inline mr-2" />
          لا يوجد اتصال بالإنترنت - سيتم حفظ الرسائل محلياً
        </div>
      )}

      {/* هيدر المحادثة - أسلوب التطبيقات */}
      <div className="relative z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
              >
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </Button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-blue-500 dark:ring-blue-400">
                    <AvatarImage
                      src={conversation.user.avatar_url}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {conversation.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* مؤشر الاتصال */}
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 border-2 border-white dark:border-gray-800 rounded-full",
                      conversation.isOnline
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400",
                    )}
                  ></div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {conversation.user.name}
                    </h3>
                    {conversation.user.is_verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {getStatusText()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-6">
            <AnimatePresence>
              {messageGroups.map(({ date, messages: groupMessages }) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* فاصل التاريخ */}
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {formatDate(groupMessages[0].created_at)}
                      </span>
                    </div>
                  </div>

                  {/* الرسائل */}
                  {groupMessages.map((message, index) => {
                    const isOwn = message.sender_id === user.id;
                    const showTime =
                      index === groupMessages.length - 1 ||
                      groupMessages[index + 1]?.sender_id !==
                        message.sender_id ||
                      new Date(groupMessages[index + 1]?.created_at).getTime() -
                        new Date(message.created_at).getTime() >
                        5 * 60 * 1000;

                    const isReply = !!message.reply_to;
                    const repliedMessage = isReply
                      ? messages.find((m) => m.id === message.reply_to)
                      : null;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "flex flex-col max-w-[85%] group",
                            isOwn ? "items-end" : "items-start",
                          )}
                        >
                          {/* رد على رسالة */}
                          {isReply && repliedMessage && (
                            <div
                              className={cn(
                                "mb-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-l-2 text-xs max-w-[200px]",
                                isOwn
                                  ? "border-blue-500 mr-2"
                                  : "border-gray-400 ml-2",
                              )}
                            >
                              <p className="text-gray-600 dark:text-gray-300 truncate">
                                {repliedMessage.content}
                              </p>
                            </div>
                          )}

                          {/* فقاعة الرسالة */}
                          <div
                            className={cn(
                              "relative rounded-3xl px-4 py-3 shadow-sm transition-all duration-200 cursor-pointer max-w-full break-words",
                              isOwn
                                ? "bg-blue-500 text-white rounded-br-lg"
                                : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-lg border border-gray-200 dark:border-gray-600",
                            )}
                            onClick={() =>
                              setSelectedMessage(
                                selectedMessage === message.id
                                  ? null
                                  : message.id,
                              )
                            }
                          >
                            {/* محتوى الرسالة */}
                            <div className="flex items-end gap-2">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.content ||
                                  message.message ||
                                  (message as any).text ||
                                  "[رسالة فارغة]"}
                              </p>

                              {/* أيقونة النجمة للرسائل المحفوظة */}
                              {message.is_starred && (
                                <Star className="h-3 w-3 text-yellow-400 fill-current shrink-0" />
                              )}

                              {/* مؤشر الرسالة غير المتصلة */}
                              {message.isOffline && (
                                <WifiOff className="h-3 w-3 text-gray-400 shrink-0" />
                              )}
                            </div>

                            {/* خيارات سريعة */}
                            <AnimatePresence>
                              {selectedMessage === message.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className={cn(
                                    "absolute top-0 flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-xl",
                                    isOwn
                                      ? "right-0 -translate-y-full"
                                      : "left-0 -translate-y-full",
                                  )}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyToMessage(message);
                                      setSelectedMessage(null);
                                    }}
                                  >
                                    <Reply className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Forward className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                  {isOwn && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-red-100 text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* معلومات الرسالة */}
                          {showTime && (
                            <div
                              className={cn(
                                "flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400",
                                isOwn ? "mr-2 flex-row-reverse" : "ml-2",
                              )}
                            >
                              <span>{formatTime(message.created_at)}</span>
                              {isOwn && (
                                <span className="flex items-center">
                                  {getDeliveryStatusIcon(message)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>
      </div>

      {/* مؤشر الرد على رسالة */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    رد على{" "}
                    {replyToMessage.sender_id === user.id
                      ? "رسالتك"
                      : conversation.user.name}
                  </p>
                  <p className="text-sm truncate max-w-[200px] text-gray-900 dark:text-white">
                    {replyToMessage.content}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setReplyToMessage(null)}
              >
                ✕
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط المرفقات */}
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-4 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col gap-1 h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
              >
                <Camera className="h-6 w-6 text-blue-500" />
                <span className="text-xs">كاميرا</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col gap-1 h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
              >
                <Image className="h-6 w-6 text-green-500" />
                <span className="text-xs">صورة</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col gap-1 h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
              >
                <File className="h-6 w-6 text-purple-500" />
                <span className="text-xs">ملف</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col gap-1 h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
              >
                <MapPin className="h-6 w-6 text-red-500" />
                <span className="text-xs">موقع</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* منطقة الكتابة - أسلوب التطبيقات */}
      <div className="relative z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-end gap-3">
            {/* زر المرفقات */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachments(!showAttachments)}
              className={cn(
                "h-11 w-11 rounded-full transition-all duration-200 shrink-0",
                showAttachments
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400",
              )}
            >
              <Plus
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  showAttachments && "rotate-45",
                )}
              />
            </Button>

            {/* منطقة الكتابة */}
            <div className="flex-1 relative">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-3xl border border-gray-200 dark:border-gray-600 transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:shadow-lg">
                <div className="flex items-end">
                  <div className="flex-1 px-4 py-3">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="اكتب رسالة..."
                      rows={1}
                      className="w-full resize-none bg-transparent text-sm text-right placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none leading-5 scrollbar-hide text-gray-900 dark:text-white"
                      style={{
                        fontFamily: "inherit",
                        lineHeight: "20px",
                      }}
                      disabled={isSending}
                    />
                  </div>

                  <div className="flex items-center gap-1 px-2 pb-3">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>

                      {/* منتقي الرموز التعبيرية مبسط */}
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-xl"
                          >
                            <div className="grid grid-cols-8 gap-2">
                              {[
                                "😀",
                                "😂",
                                "❤️",
                                "👍",
                                "👏",
                                "🔥",
                                "💯",
                                "🎉",
                                "😍",
                                "🤔",
                                "😊",
                                "👌",
                                "🙏",
                                "💪",
                                "✨",
                                "🎊",
                              ].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    handleEmojiSelect({ native: emoji })
                                  }
                                  className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* زر الإرسال */}
            <Button
              onClick={sendMessage}
              size="icon"
              disabled={!newMessage.trim() || isSending}
              className={cn(
                "h-11 w-11 rounded-full transition-all duration-300 shrink-0",
                newMessage.trim()
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed",
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
      </div>

      {/* النقر خارج منتقي الرموز التعبيرية لإغلاقه */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}
