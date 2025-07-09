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
import data from "@emoji-mart/data/i18n/ar.json";
import Picker from "@emoji-mart/react";

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
  delivery_status?: "sending" | "sent" | "delivered" | "read";
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

interface ChatConversationProps {
  user: User;
  conversation: Conversation;
  onBack: () => void;
  onConversationUpdate: (conversation: Conversation) => void;
}

export default function ChatConversation({
  user,
  conversation,
  onBack,
  onConversationUpdate,
}: ChatConversationProps) {
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

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تحديث الرسائل كل 3 ثوانٍ
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversation.id]);

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
      const response = await apiClient.getMessages(conversation.user.id);

      // تحسين الرسائل مع معلومات إضافية
      const enhancedMessages: Message[] = (response.messages || []).map(
        (msg: any) => ({
          ...msg,
          delivery_status: msg.sender_id === user.id ? "read" : "delivered",
          is_starred: false,
        }),
      );

      setMessages(enhancedMessages);

      // تحديث عداد الرسائل غير المقروءة
      await apiClient.markMessagesAsRead(conversation.user.id);
      onConversationUpdate({
        ...conversation,
        unreadCount: 0,
      });
    } catch (error) {
      console.error("خطأ في تحميل الرسائل:", error);

      // رسائل تجريبية محسنة
      const mockMessages: Message[] = [
        {
          id: "msg_demo_1",
          sender_id: conversation.user.id,
          receiver_id: user.id,
          content: "مرحباً بك! كيف يمكنني مساعدتك اليوم؟ 😊",
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
        {
          id: "msg_demo_2",
          sender_id: user.id,
          receiver_id: conversation.user.id,
          content: "أريد حجز موعد لقصة شعر عصرية ومميزة",
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
        {
          id: "msg_demo_3",
          sender_id: conversation.user.id,
          receiver_id: user.id,
          content:
            "بالطبع! يسعدني خدمتك. متى تفضل الموعد؟ لدينا مواعيد متاحة اليوم والغد",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
        {
          id: "msg_demo_4",
          sender_id: user.id,
          receiver_id: conversation.user.id,
          content: "ممتاز! هل يمكنني المجيء غداً في المساء؟",
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          read: false,
          message_type: "text",
          delivery_status: "delivered",
        },
      ];
      setMessages(mockMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const messageContent = newMessage.trim();

      // إنشاء رسالة مؤقتة
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        sender_id: user.id,
        receiver_id: conversation.user.id,
        content: messageContent,
        created_at: new Date().toISOString(),
        read: false,
        message_type: "text",
        delivery_status: "sending",
        reply_to: replyToMessage?.id,
      };

      // إضافة الرسالة محلياً أولاً
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      setReplyToMessage(null);

      // إرسال الرسالة للخادم
      const messageData = {
        receiver_id: conversation.user.id,
        content: messageContent,
        reply_to: replyToMessage?.id,
      };

      const response = await apiClient.sendMessage(messageData);

      // تحديث الرسالة بالمعرف الحقيقي
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

      // تحديث المحادثة
      onConversationUpdate({
        ...conversation,
        lastMessage: {
          ...tempMessage,
          id: response.message?.id || tempMessage.id,
          delivery_status: "sent",
        },
      });
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);

      // تحديث حالة الرسالة في حالة الخطأ
      setMessages((prev) =>
        prev.map((msg) =>
          msg.delivery_status === "sending"
            ? { ...msg, delivery_status: "sent" }
            : msg,
        ),
      );
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

  const handleEmojiSelect = (emoji: any) => {
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

    switch (message.delivery_status) {
      case "sending":
        return "⏳";
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return <span className="text-primary">✓✓</span>;
      default:
        return "✓";
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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* خلفية متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-transparent to-golden-600/2"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>

      {/* هيدر المحادثة */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/30 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-primary/10 text-foreground rounded-full"
              >
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </Button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                    <AvatarImage
                      src={conversation.user.avatar_url}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-golden-600 text-primary-foreground font-bold">
                      {conversation.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* مؤشر الاتصال */}
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 border-2 border-card rounded-full",
                      conversation.isOnline
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400",
                    )}
                  ></div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">
                      {conversation.user.name}
                    </h3>
                    {conversation.user.is_verified && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-primary-foreground"
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
                  <p className="text-xs text-primary font-medium">
                    {getStatusText()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-4 py-2 space-y-6">
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
                    <div className="bg-muted/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                      <span className="text-xs text-muted-foreground font-medium">
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
                        5 * 60 * 1000; // 5 دقائق

                    const isReply = !!message.reply_to;
                    const repliedMessage = isReply
                      ? messages.find((m) => m.id === message.reply_to)
                      : null;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "flex flex-col max-w-[80%] group",
                            isOwn ? "items-end" : "items-start",
                          )}
                        >
                          {/* رد على رسالة */}
                          {isReply && repliedMessage && (
                            <div
                              className={cn(
                                "mb-1 p-2 rounded-lg bg-muted/50 border-r-2 text-xs max-w-[200px]",
                                isOwn
                                  ? "border-primary/50 mr-2"
                                  : "border-muted-foreground/50 ml-2",
                              )}
                            >
                              <p className="text-muted-foreground/70 truncate">
                                {repliedMessage.content}
                              </p>
                            </div>
                          )}

                          {/* الرسالة */}
                          <div
                            className={cn(
                              "relative rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm border cursor-pointer transition-all duration-200 hover:shadow-xl",
                              isOwn
                                ? "bg-gradient-to-r from-primary to-golden-600 text-primary-foreground border-primary/20 hover:from-primary/90 hover:to-golden-500"
                                : "bg-gradient-to-r from-card to-muted text-foreground border-border/50 hover:bg-card",
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
                                {message.content}
                              </p>

                              {/* أيقونة النجمة للرسائل المحفوظة */}
                              {message.is_starred && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current shrink-0" />
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
                                    "absolute top-0 flex gap-1 p-1 bg-card/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl",
                                    isOwn
                                      ? "right-0 -translate-y-full"
                                      : "left-0 -translate-y-full",
                                  )}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10"
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
                                    className="h-6 w-6 hover:bg-primary/10"
                                  >
                                    <Forward className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10"
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                  {isOwn && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-destructive/10 text-destructive"
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
                                "flex items-center gap-1 mt-1 text-xs text-muted-foreground/70",
                                isOwn ? "mr-2" : "ml-2",
                              )}
                            >
                              <span>{formatTime(message.created_at)}</span>
                              {isOwn && (
                                <span className="mr-1">
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
            className="px-4 py-2 bg-muted/50 backdrop-blur-sm border-t border-border/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    رد على{" "}
                    {replyToMessage.sender_id === user.id
                      ? "رسالتك"
                      : conversation.user.name}
                  </p>
                  <p className="text-sm truncate max-w-[200px]">
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

      {/* منطقة الكتابة */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/20">
        {/* شريط المرفقات */}
        <AnimatePresence>
          {showAttachments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-b border-border/20"
            >
              <div className="flex items-center gap-4 justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col gap-1 h-auto p-3 hover:bg-primary/10 rounded-2xl"
                >
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="text-xs">كاميرا</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col gap-1 h-auto p-3 hover:bg-primary/10 rounded-2xl"
                >
                  <Image className="h-6 w-6 text-green-500" />
                  <span className="text-xs">صورة</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col gap-1 h-auto p-3 hover:bg-primary/10 rounded-2xl"
                >
                  <File className="h-6 w-6 text-blue-500" />
                  <span className="text-xs">ملف</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-col gap-1 h-auto p-3 hover:bg-primary/10 rounded-2xl"
                >
                  <MapPin className="h-6 w-6 text-red-500" />
                  <span className="text-xs">موقع</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* منطقة الكتابة الرئيسية */}
        <div className="px-4 py-3">
          <div className="flex items-end gap-3 max-w-screen-lg mx-auto">
            {/* زر المرفقات */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachments(!showAttachments)}
              className={cn(
                "h-11 w-11 rounded-full border transition-all duration-200 shrink-0",
                showAttachments
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/30 hover:bg-muted/50 border-border/20 text-muted-foreground hover:text-foreground",
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
              <div className="bg-muted/30 backdrop-blur-sm rounded-[24px] border border-border/20 transition-all duration-200 focus-within:border-primary/40 focus-within:bg-muted/40 focus-within:shadow-lg focus-within:shadow-primary/10">
                <div className="flex items-end">
                  <div className="flex-1 px-4 py-3">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="اكتب رسالة..."
                      rows={1}
                      className="w-full resize-none bg-transparent text-sm text-right placeholder:text-muted-foreground/60 focus:outline-none leading-5 scrollbar-hide"
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
                        className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>

                      {/* منتقي الرموز التعبيرية */}
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 z-50"
                          >
                            <Picker
                              data={data}
                              onEmojiSelect={handleEmojiSelect}
                              theme="light"
                              locale="ar"
                              perLine={8}
                              maxFrequentRows={2}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
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
                "h-11 w-11 rounded-full transition-all duration-300 shrink-0 border",
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
