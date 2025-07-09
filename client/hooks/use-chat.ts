import { useState, useEffect, useRef } from "react";
import { User } from "@shared/api";
import apiClient from "@/lib/api";

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
  delivery_status?: "sending" | "sent" | "delivered" | "read";
  reply_to?: string;
  is_starred?: boolean;
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

interface UseChatOptions {
  userId: string;
  enableRealtime?: boolean;
  refreshInterval?: number;
}

export function useChat({
  userId,
  enableRealtime = true,
  refreshInterval = 5000,
}: UseChatOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      setError(null);
      if (!isLoading) setIsLoading(true);

      const response = await apiClient.getConversations();
      const enhancedConversations: Conversation[] = (
        response.conversations || []
      ).map((conv: any) => ({
        id: conv.user.id,
        user: conv.user,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount || 0,
        isPinned: conv.isPinned || false,
        isArchived: conv.isArchived || false,
        isOnline: Math.random() > 0.5, // محاكاة الحالة الحقيقية
        lastSeen: conv.user.last_seen || new Date().toISOString(),
        isTyping: false,
      }));

      setConversations(enhancedConversations);
    } catch (err) {
      console.error("خطأ في تحميل المحادثات:", err);
      setError("فشل في تحميل المحادثات");

      // بيانات تجريبية كبديل
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
            receiver_id: userId,
            content: "شكراً لك على الحجز، نراك غداً إن شاء الله 👍",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            read: false,
            message_type: "text",
            delivery_status: "delivered",
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
            sender_id: userId,
            receiver_id: "barber_2",
            content: "متى يمكنني الحجز لقصة شعر عصرية؟",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            read: true,
            message_type: "text",
            delivery_status: "read",
          },
          unreadCount: 0,
          isPinned: false,
          isArchived: false,
          isOnline: false,
          lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          isTyping: false,
        },
      ];
      setConversations(mockConversations);
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسالة
  const sendMessage = async (
    receiverId: string,
    content: string,
    messageType: "text" | "image" | "voice" = "text",
    replyTo?: string,
  ) => {
    try {
      const messageData = {
        receiver_id: receiverId,
        content: content.trim(),
        message_type: messageType,
        reply_to: replyTo,
      };

      const response = await apiClient.sendMessage(messageData);

      // تحديث المحادثات محلياً
      await loadConversations();

      return response;
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);
      throw error;
    }
  };

  // تحميل الرسائل لمحادثة محددة
  const loadMessages = async (otherUserId: string): Promise<Message[]> => {
    try {
      const response = await apiClient.getMessages(otherUserId);

      // تحسين الرسائل مع معلومات إضافية
      const enhancedMessages: Message[] = (response.messages || []).map(
        (msg: any) => ({
          ...msg,
          delivery_status: msg.sender_id === userId ? "read" : "delivered",
          is_starred: false,
        }),
      );

      // تحديث عداد الرسائل غير المقروءة
      await apiClient.markMessagesAsRead(otherUserId);

      // تحديث المحادثة المحلية
      setConversations((prev) =>
        prev.map((conv) =>
          conv.user.id === otherUserId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );

      return enhancedMessages;
    } catch (error) {
      console.error("خطأ في تحميل الرسائل:", error);

      // رسائل تجريبية
      const mockMessages: Message[] = [
        {
          id: "msg_demo_1",
          sender_id: otherUserId,
          receiver_id: userId,
          content: "مرحباً بك! كيف يمكنني مساعدتك اليوم؟ 😊",
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
        {
          id: "msg_demo_2",
          sender_id: userId,
          receiver_id: otherUserId,
          content: "أريد حجز موعد لقصة شعر عصرية ومميزة",
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
        {
          id: "msg_demo_3",
          sender_id: otherUserId,
          receiver_id: userId,
          content:
            "بالطبع! يسعدني خدمتك. متى تفضل الموعد؟ لدينا مواعيد متاحة اليوم والغد",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: true,
          message_type: "text",
          delivery_status: "read",
        },
      ];

      return mockMessages;
    }
  };

  // تحديث حالة المحادثة
  const updateConversation = (
    conversationId: string,
    updates: Partial<Conversation>,
  ) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv,
      ),
    );
  };

  // حذف محادثة
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

  // حساب إجمالي الرسائل غير المقروءة
  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0,
  );

  // تفعيل التحديث التلقائي
  useEffect(() => {
    loadConversations();

    if (enableRealtime) {
      intervalRef.current = setInterval(loadConversations, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enableRealtime, refreshInterval]);

  return {
    conversations,
    isLoading,
    error,
    totalUnreadCount,
    loadConversations,
    sendMessage,
    loadMessages,
    updateConversation,
    deleteConversation,
  };
}

// Hook لإدارة رسائل محادثة محددة
export function useChatMessages(userId: string, otherUserId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    if (!otherUserId) return;

    try {
      setError(null);
      setIsLoading(true);

      const response = await apiClient.getMessages(otherUserId);
      const enhancedMessages: Message[] = (response.messages || []).map(
        (msg: any) => ({
          ...msg,
          delivery_status: msg.sender_id === userId ? "read" : "delivered",
          is_starred: false,
        }),
      );

      setMessages(enhancedMessages);

      // تحديث حالة المقروءة
      await apiClient.markMessagesAsRead(otherUserId);
    } catch (err) {
      console.error("خطأ في تحميل الرسائل:", err);
      setError("فشل في تحميل الرسائل");
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    );
  };

  useEffect(() => {
    if (otherUserId) {
      loadMessages();

      // تحديث الرسائل كل 3 ثوانٍ
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [otherUserId]);

  return {
    messages,
    isLoading,
    error,
    loadMessages,
    addMessage,
    updateMessage,
  };
}
