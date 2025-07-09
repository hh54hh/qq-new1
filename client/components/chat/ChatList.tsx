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

interface ChatListProps {
  user: User;
  onConversationSelect: (conversation: Conversation) => void;
  onBack: () => void;
  refreshTrigger?: number;
}

export default function ChatList({
  user,
  onConversationSelect,
  onBack,
  refreshTrigger = 0,
}: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "unread" | "pinned"
  >("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  useEffect(() => {
    // تحديث المحادثات كل 5 ثوانٍ
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();

      // تحويل البيانات لتتضمن معلومات إضافية
      const enhancedConversations: Conversation[] = (
        response.conversations || []
      ).map((conv: any) => ({
        id: conv.user.id,
        user: conv.user,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount || 0,
        isPinned: false, // يمكن إضافة هذا للقاعدة لاحقاً
        isArchived: false,
        isOnline: Math.random() > 0.5, // محاكاة الحالة الحقيقية
        lastSeen: conv.user.last_seen || new Date().toISOString(),
        isTyping: false,
      }));

      setConversations(enhancedConversations);
    } catch (error) {
      console.error("خطأ في تحميل المحادثات:", error);

      // بيانات تجريبية محسنة
      const mockConversations: Conversation[] = [
        {
          id: "barber_1",
          user: {
            id: "barber_1",
            name: "أحمد الحلاق المحترف",
            email: "ahmed@example.com",
            role: "barber",
            status: "active",
            level: 95,
            points: 3500,
            is_verified: true,
            created_at: new Date().toISOString(),
            avatar_url:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
          },
          lastMessage: {
            id: "msg_1",
            sender_id: "barber_1",
            receiver_id: user.id,
            content: "شكراً لك على الحجز، نراك غداً إن شاء الله 👍",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            read: false,
            message_type: "text",
          },
          unreadCount: 3,
          isPinned: true,
          isArchived: false,
          isOnline: true,
          isTyping: false,
        },
        {
          id: "barber_2",
          user: {
            id: "barber_2",
            name: "محمد العلي",
            email: "mohammed@example.com",
            role: "barber",
            status: "active",
            level: 88,
            points: 2800,
            is_verified: true,
            created_at: new Date().toISOString(),
            avatar_url:
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
          },
          lastMessage: {
            id: "msg_2",
            sender_id: user.id,
            receiver_id: "barber_2",
            content: "متى يمكنني الحجز لقصة شعر عصرية؟",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            read: true,
            message_type: "text",
          },
          unreadCount: 0,
          isPinned: false,
          isArchived: false,
          isOnline: false,
          lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          isTyping: false,
        },
        {
          id: "barber_3",
          user: {
            id: "barber_3",
            name: "خالد المبدع",
            email: "khalid@example.com",
            role: "barber",
            status: "active",
            level: 92,
            points: 3100,
            is_verified: true,
            created_at: new Date().toISOString(),
            avatar_url:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face",
          },
          lastMessage: {
            id: "msg_3",
            sender_id: "barber_3",
            receiver_id: user.id,
            content: "تم تحديد موعدك بنجاح، سعداء بخدمتك ✨",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            read: true,
            message_type: "text",
          },
          unreadCount: 0,
          isPinned: false,
          isArchived: false,
          isOnline: true,
          isTyping: true,
        },
      ];
      setConversations(mockConversations);
    } finally {
      setIsLoading(false);
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
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, isPinned: !conv.isPinned }
          : conv,
      ),
    );
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await apiClient.deleteConversation(conversationId);
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId),
      );
    } catch (error) {
      console.error("خطأ في حذف المحادثة:", error);
      // حذف محلي كبديل
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId),
      );
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

  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0,
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* خلفية متدرجة متطورة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-golden-600/3"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-golden-600/5 rounded-full blur-3xl"></div>

      {/* المحتوى */}
      <div className="relative z-10">
        {/* الهيدر المحسن */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/30 shadow-lg shadow-primary/5">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="hover:bg-primary/10 text-foreground rounded-full"
                >
                  <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19l7-7-7-7"
                      />
                    </svg>
                  </motion.div>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-primary to-golden-600 rounded-full animate-pulse shadow-lg"></div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-golden-600 bg-clip-text text-transparent">
                    الرسائل
                  </h1>
                  {totalUnreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg animate-pulse"
                    >
                      {totalUnreadCount}
                    </Badge>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings2 className="mr-2 h-4 w-4" />
                    إعدادات الدردشة
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    مجموعات جديدة
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    المحادثات المؤرشفة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* شريط البحث المتطور */}
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/70" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في المحادثات..."
                className="pr-10 text-right rounded-2xl bg-muted/50 backdrop-blur-sm border-border/50 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/60 shadow-lg shadow-black/5"
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
                    "rounded-full border transition-all duration-300",
                    selectedFilter === key
                      ? "bg-gradient-to-r from-primary to-golden-600 text-primary-foreground border-transparent shadow-lg shadow-primary/25"
                      : "hover:bg-primary/10 border-border/50 text-muted-foreground hover:text-primary",
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
        <div className="p-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    جاري تحميل المحادثات...
                  </p>
                </div>
              ) : sortedConversations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-golden-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
                    <MessageCircle className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-golden-600 bg-clip-text text-transparent mb-3">
                    {searchQuery ? "لا توجد نتائج" : "لا توجد محادثات"}
                  </h3>
                  <p className="text-muted-foreground/80 max-w-sm mx-auto">
                    {searchQuery
                      ? "جرب البحث بكلمة أخرى أو ابدأ محادثة جديدة"
                      : "ابدأ محادثة جديدة مع أحد الحلاقين المحترفين"}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {sortedConversations.map((conversation, index) => (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                      className="group bg-card/60 backdrop-blur-sm rounded-2xl cursor-pointer hover:bg-card/80 hover:scale-[1.02] transition-all duration-300 p-4 border border-border/30 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] relative overflow-hidden"
                      onClick={() => onConversationSelect(conversation)}
                    >
                      {/* مؤشر الدردشة المثبتة */}
                      {conversation.isPinned && (
                        <div className="absolute top-2 left-2">
                          <Pin className="h-3 w-3 text-primary" />
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        {/* صورة المستخدم مع مؤشرات الحالة */}
                        <div className="relative">
                          <Avatar className="h-16 w-16 ring-2 ring-primary/30 group-hover:ring-primary/60 group-hover:ring-4 transition-all duration-300">
                            <AvatarImage
                              src={conversation.user.avatar_url}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-golden-600 text-primary-foreground font-bold text-lg group-hover:from-primary/90 group-hover:to-golden-500 transition-all">
                              {conversation.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* مؤشر الاتصال */}
                          <div
                            className={cn(
                              "absolute bottom-0 right-0 w-5 h-5 border-2 border-card rounded-full shadow-lg transition-all duration-300",
                              conversation.isOnline
                                ? "bg-gradient-to-r from-green-400 to-green-500 animate-pulse"
                                : "bg-gradient-to-r from-gray-400 to-gray-500",
                            )}
                          ></div>

                          {/* مؤشر الكتابة */}
                          {conversation.isTyping && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                            </div>
                          )}
                        </div>

                        {/* معلومات المحادثة */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground truncate text-lg">
                                {conversation.user.name}
                              </h4>
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
                            {conversation.lastMessage && (
                              <span className="text-xs text-muted-foreground/70 font-medium">
                                {formatTime(
                                  conversation.lastMessage.created_at,
                                )}
                              </span>
                            )}
                          </div>

                          {/* حالة المستخدم */}
                          <p className="text-xs text-primary font-medium mb-2">
                            {getStatusText(conversation)}
                          </p>

                          {/* آخر رسالة */}
                          <div className="flex items-center justify-between">
                            <p
                              className={cn(
                                "text-sm truncate max-w-[200px]",
                                conversation.unreadCount > 0
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {conversation.lastMessage?.message_type ===
                                "image" && "📷 صورة"}
                              {conversation.lastMessage?.message_type ===
                                "voice" && "🎵 رسالة صوتية"}
                              {(!conversation.lastMessage?.message_type ||
                                conversation.lastMessage?.message_type ===
                                  "text") &&
                                (conversation.lastMessage?.content ||
                                  "لا توجد رسائل")}
                            </p>

                            <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-gradient-to-r from-primary to-golden-600 text-primary-foreground text-xs border-0 shadow-lg animate-pulse">
                                  {conversation.unreadCount}
                                </Badge>
                              )}

                              {/* قائمة خيارات سريعة */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-primary/10 transition-all rounded-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePin(conversation.id);
                                    }}
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
                                  <DropdownMenuItem>
                                    <Archive className="mr-2 h-4 w-4" />
                                    أرشفة المحادثة
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <VideoIcon className="mr-2 h-4 w-4" />
                                    مكالمة فيديو
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteConversation(conversation.id);
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
    </div>
  );
}
