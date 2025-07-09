import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MoreVertical,
  MessageCircle,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Archive,
  Settings2,
  Users,
  VideoIcon,
  Wifi,
  WifiOff,
  ChevronRight,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/use-chat";
import { chatStorage, useNetworkStatus } from "@/lib/chat-storage";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type?: "text" | "image" | "voice" | "system";
  sender?: User;
  receiver?: User;
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  isOffline?: boolean;
}

interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isTyping?: boolean;
}

interface StableChatListProps {
  user: User;
  onConversationSelect: (conversation: Conversation) => void;
  onBack: () => void;
  refreshTrigger?: number;
}

export default function StableChatList({
  user,
  onConversationSelect,
  onBack,
  refreshTrigger = 0,
}: StableChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "unread" | "pinned"
  >("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useNetworkStatus();

  const {
    conversations,
    isLoading,
    totalUnreadCount,
    updateConversation,
    deleteConversation: deleteChatConversation,
  } = useChat({
    userId: user.id,
    enableRealtime: true,
    refreshInterval: 5000,
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `${diffInMinutes}د`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}س`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}ي`;
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  const getStatusText = (conv: Conversation) => {
    if (conv.isTyping) return "يكتب...";
    if (conv.isOnline) return "متصل الآن";
    if (conv.lastSeen) {
      const lastSeenMinutes = Math.floor(
        (new Date().getTime() - new Date(conv.lastSeen).getTime()) /
          (1000 * 60),
      );
      if (lastSeenMinutes < 60) return `كان متصلاً منذ ${lastSeenMinutes}د`;
      if (lastSeenMinutes < 1440)
        return `كان متصلاً منذ ${Math.floor(lastSeenMinutes / 60)}س`;
      return `كان متصلاً منذ ${Math.floor(lastSeenMinutes / 1440)}ي`;
    }
    return "";
  };

  const togglePin = (conversationId: string) => {
    const conversation = conversations.find(
      (conv) => conv.id === conversationId,
    );
    if (conversation) {
      updateConversation(conversationId, {
        isPinned: !conversation.isPinned,
      });
    }
  };

  // فلترة المحادثات
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.user.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    switch (selectedFilter) {
      case "unread":
        return matchesSearch && conv.unreadCount > 0;
      case "pinned":
        return matchesSearch && conv.isPinned;
      default:
        return matchesSearch && !conv.isArchived;
    }
  });

  // ترتيب المحادثات
  const sortedConversations = filteredConversations.sort((a, b) => {
    // المثبتة أولاً
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // ثم حسب آخر رسالة
    const aTime = a.lastMessage
      ? new Date(a.lastMessage.created_at).getTime()
      : 0;
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.created_at).getTime()
      : 0;
    return bTime - aTime;
  });

  const getMessagePreview = (message?: Message) => {
    if (!message) return "لا توجد رسائل";

    if ((message as any)?.isOffline) {
      return `📤 ${message.content}`;
    }

    switch (message.message_type) {
      case "image":
        return "📷 صورة";
      case "voice":
        return "🎵 رسالة صوتية";
      case "location":
        return "📍 موقع";
      default:
        return message.content;
    }
  };

  return (
    <div className="h-full bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden">
      {/* مؤشر حالة الاتصال */}
      {!isOnline && (
        <div className="relative z-50 bg-red-600 text-white text-center py-2 text-sm">
          <WifiOff className="h-4 w-4 inline mr-2" />
          وضع عدم الاتصال - يتم عرض الرسائل المحفوظة
        </div>
      )}

      {/* الهيدر الثابت */}
      <div className="sticky top-0 z-40 bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-slate-700 text-white rounded-full h-10 w-10"
              >
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-3 h-3 text-green-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  )}
                  <h1 className="text-2xl font-bold text-white">الرسائل</h1>
                </div>
                {totalUnreadCount > 0 && (
                  <Badge className="bg-blue-600 text-white border-0 shadow-lg animate-pulse">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-slate-700 text-slate-300 hover:text-white rounded-full h-10 w-10"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-slate-800 border-slate-600"
              >
                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                  <Settings2 className="mr-2 h-4 w-4" />
                  إعدادات الدردشة
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                  <Users className="mr-2 h-4 w-4" />
                  مجموعات جديدة
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                  <Archive className="mr-2 h-4 w-4" />
                  المحادثات المؤرشفة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* شريط البحث */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="pr-10 text-right rounded-2xl bg-slate-800 border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 text-white"
            />
          </div>

          {/* فلاتر المحادثات */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "الكل", icon: MessageCircle },
              { key: "unread", label: "غير مقروءة", icon: Edit },
              { key: "pinned", label: "مثبتة", icon: Pin },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedFilter === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedFilter(key as any)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  selectedFilter === key
                    ? "bg-blue-600 text-white shadow-lg"
                    : "hover:bg-slate-700 text-slate-300 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة المحادثات */}
      <div className="flex-1 px-4">
        <ScrollArea className="h-[calc(100vh-220px)]">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">جاري تحميل المحادثات...</p>
              </div>
            ) : sortedConversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                  <MessageCircle className="h-16 w-16 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {searchQuery ? "لا توجد نتائج" : "لا توجد محادثات"}
                </h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? "جرب البحث بكلمة أخرى أو ابدأ محادثة جديدة"
                    : "ابدأ محادثة جديدة مع أحد الحلاقين المحترفين"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-1 pb-4">
                {sortedConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    className="group bg-slate-800/60 hover:bg-slate-700/80 rounded-2xl cursor-pointer transition-all duration-300 p-4 border border-slate-700/50 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98] relative overflow-hidden"
                    onClick={() => onConversationSelect(conversation)}
                  >
                    {/* مؤشر الدردشة المثبتة */}
                    {conversation.isPinned && (
                      <div className="absolute top-2 left-2">
                        <Pin className="h-3 w-3 text-blue-400" />
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {/* صورة المستخدم مع مؤشرات الحالة */}
                      <div className="relative">
                        <Avatar className="h-16 w-16 ring-2 ring-blue-500/30 group-hover:ring-blue-500/60 transition-all duration-300">
                          <AvatarImage
                            src={conversation.user.avatar_url}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-lg">
                            {conversation.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        {/* مؤشر الاتصال */}
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 w-5 h-5 border-2 border-slate-800 rounded-full shadow-lg transition-all duration-300",
                            conversation.isOnline
                              ? "bg-green-500 animate-pulse"
                              : "bg-slate-500",
                          )}
                        ></div>

                        {/* مؤشر الكتابة */}
                        {conversation.isTyping && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                          </div>
                        )}

                        {/* مؤشر الرسائل غير المقروءة */}
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -left-1 min-w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold px-1">
                              {conversation.unreadCount > 9
                                ? "9+"
                                : conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* معلومات المحادثة */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white truncate text-lg">
                              {conversation.user.name}
                            </h4>
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
                          {conversation.lastMessage && (
                            <div className="flex items-center gap-1">
                              {(conversation.lastMessage as any)?.isOffline && (
                                <Clock className="h-3 w-3 text-slate-400" />
                              )}
                              <span className="text-xs text-slate-400 font-medium">
                                {formatTime(
                                  conversation.lastMessage.created_at,
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* حالة المستخدم */}
                        <p className="text-xs text-blue-400 font-medium mb-2">
                          {getStatusText(conversation)}
                        </p>

                        {/* آخر رسالة */}
                        <div className="flex items-center justify-between">
                          <p
                            className={cn(
                              "text-sm truncate max-w-[200px]",
                              conversation.unreadCount > 0
                                ? "text-white font-semibold"
                                : "text-slate-400",
                            )}
                          >
                            {getMessagePreview(conversation.lastMessage)}
                          </p>

                          <div className="flex items-center gap-2">
                            {/* قائمة خيارات سريعة */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all rounded-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-slate-800 border-slate-600"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePin(conversation.id);
                                  }}
                                  className="text-slate-200 hover:bg-slate-700"
                                >
                                  {conversation.isPinned ? (
                                    <>
                                      <PinOff className="mr-2 h-4 w-4" />
                                      إلغاء التثبيت
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="mr-2 h-4 w-4" />
                                      تثبيت المحادثة
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                                  <Archive className="mr-2 h-4 w-4" />
                                  أرشفة المحادثة
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                                  <VideoIcon className="mr-2 h-4 w-4" />
                                  مكالمة فيديو
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-600" />
                                <DropdownMenuItem
                                  className="text-red-400 focus:text-red-400 hover:bg-red-900/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteChatConversation(conversation.id);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  حذف المحادثة
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
}
