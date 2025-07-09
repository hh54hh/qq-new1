import { User } from "@shared/api";
import apiClient from "./api";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type?: "text" | "image" | "voice" | "system";
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  reply_to?: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: string;
}

export interface SendMessageData {
  receiver_id: string;
  content: string;
  reply_to?: string;
}

export class ChatManager {
  private messages = new Map<string, Message[]>();
  private conversations = new Map<string, Conversation>();
  private eventListeners = new Map<string, Function[]>();

  // إضافة مستمع للأحداث
  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // إزالة مستمع الأحداث
  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // إطلاق حدث
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // تحميل المحادثات
  async loadConversations(userId: string): Promise<Conversation[]> {
    try {
      // محاولة تحميل المحادثات من API
      const response = await apiClient.getConversations();

      // تجميع المحادثات
      const conversationsMap = new Map<string, Conversation>();

      response.conversations?.forEach((conv: any) => {
        const otherUserId =
          msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            id: otherUserId,
            user: otherUser || {
              id: otherUserId,
              name: `مستخدم ${otherUserId}`,
              email: `${otherUserId}@example.com`,
              role: "customer" as any,
              status: "active",
              level: 50,
              points: 1000,
              is_verified: false,
              created_at: new Date().toISOString(),
            },
            unreadCount: 0,
            isOnline: Math.random() > 0.5,
          });
        }

        const conversation = conversationsMap.get(otherUserId)!;

        // تحديث آخر رسالة
        if (
          !conversation.lastMessage ||
          new Date(msg.created_at) >
            new Date(conversation.lastMessage.created_at)
        ) {
          conversation.lastMessage = {
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content: msg.content || msg.message,
            created_at: msg.created_at,
            read: msg.read || false,
            delivery_status: msg.read ? "read" : "delivered",
          };
        }

        // حساب الرسائل غير المقروءة
        if (msg.receiver_id === userId && !msg.read) {
          conversation.unreadCount++;
        }
      });

      const conversations = Array.from(conversationsMap.values());

      // حفظ في الذاكرة المحلية
      conversations.forEach((conv) => {
        this.conversations.set(conv.id, conv);
      });

      this.emit("conversationsLoaded", conversations);
      return conversations;
    } catch (error) {
      console.error("خطأ في تحميل المحادثات:", error);

      // إرجاع بيانات وهمية في حالة الخطأ
      const mockConversations = this.generateMockConversations(userId);
      this.emit("conversationsLoaded", mockConversations);
      return mockConversations;
    }
  }

  // تحميل رسائل محادثة محددة
  async loadMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    try {
      // محاولة تحميل الرسائل من API
      const response = await apiClient.getMessages(conversationId);

      const messages: Message[] = [];

      response.messages?.forEach((msg: any) => {
        if (
          (msg.sender_id === userId && msg.receiver_id === conversationId) ||
          (msg.sender_id === conversationId && msg.receiver_id === userId)
        ) {
          messages.push({
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content: msg.content || msg.message,
            created_at: msg.created_at,
            read: msg.read || false,
            delivery_status: msg.read ? "read" : "delivered",
            message_type: msg.message_type || "text",
          });
        }
      });

      // ترتيب الرسائل حس�� التاريخ
      messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      // حفظ في الذاكرة المحلية
      this.messages.set(conversationId, messages);

      this.emit("messagesLoaded", { conversationId, messages });
      return messages;
    } catch (error) {
      console.error("خطأ في تحميل الرسائل:", error);

      // إرجاع بيانات وهمية في حالة الخطأ
      const mockMessages = this.generateMockMessages(conversationId, userId);
      this.emit("messagesLoaded", { conversationId, messages: mockMessages });
      return mockMessages;
    }
  }

  // إرسال رسالة
  async sendMessage(data: SendMessageData, senderId: string): Promise<Message> {
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    // إنشاء رسالة مؤقتة
    const tempMessage: Message = {
      id: tempId,
      sender_id: senderId,
      receiver_id: data.receiver_id,
      content: data.content,
      created_at: new Date().toISOString(),
      read: false,
      delivery_status: "sending",
      message_type: "text",
    };

    // إضافة الر��الة فوراً للواجهة
    const conversationMessages = this.messages.get(data.receiver_id) || [];
    conversationMessages.push(tempMessage);
    this.messages.set(data.receiver_id, conversationMessages);

    this.emit("messageAdded", {
      conversationId: data.receiver_id,
      message: tempMessage,
    });

    try {
      // محاولة الإرسال عبر API
      const response = await apiClient.sendMessage({
        receiver_id: data.receiver_id,
        content: data.content,
        message_type: "text",
      });

      // تحديث الرسالة بالمعرف الحقيقي
      const sentMessage: Message = {
        ...tempMessage,
        id: response.message?.id || tempId,
        delivery_status: "sent",
      };

      // تحديث في الذاكرة المحلية
      const updatedMessages = conversationMessages.map((msg) =>
        msg.id === tempId ? sentMessage : msg,
      );
      this.messages.set(data.receiver_id, updatedMessages);

      this.emit("messageUpdated", {
        conversationId: data.receiver_id,
        oldMessageId: tempId,
        message: sentMessage,
      });

      return sentMessage;
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);

      // تحديث حالة الرسالة إلى فشل
      const failedMessage: Message = {
        ...tempMessage,
        delivery_status: "failed",
      };

      const updatedMessages = conversationMessages.map((msg) =>
        msg.id === tempId ? failedMessage : msg,
      );
      this.messages.set(data.receiver_id, updatedMessages);

      this.emit("messageUpdated", {
        conversationId: data.receiver_id,
        oldMessageId: tempId,
        message: failedMessage,
      });

      throw error;
    }
  }

  // إعادة إرسال رسالة فاشلة
  async retryMessage(messageId: string, conversationId: string): Promise<void> {
    const messages = this.messages.get(conversationId);
    if (!messages) return;

    const message = messages.find((msg) => msg.id === messageId);
    if (!message || message.delivery_status !== "failed") return;

    // تحديث حالة الرسالة إلى إرسال
    message.delivery_status = "sending";
    this.emit("messageUpdated", {
      conversationId,
      oldMessageId: messageId,
      message,
    });

    try {
      const response = await apiClient.sendMessage({
        receiver_id: message.receiver_id,
        content: message.content,
        message_type: "text",
      });

      // تحديث الرسالة بالنجاح
      message.id = response.message?.id || message.id;
      message.delivery_status = "sent";

      this.emit("messageUpdated", {
        conversationId,
        oldMessageId: messageId,
        message,
      });
    } catch (error) {
      console.error("خطأ في إعادة إرسال الرسالة:", error);
      message.delivery_status = "failed";
      this.emit("messageUpdated", {
        conversationId,
        oldMessageId: messageId,
        message,
      });
      throw error;
    }
  }

  // تحديث حالة قراءة الرسائل
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const messages = this.messages.get(conversationId);
      if (!messages) return;

      const unreadMessages = messages.filter(
        (msg) => msg.receiver_id === userId && !msg.read,
      );

      if (unreadMessages.length === 0) return;

      // تحديث محليا
      unreadMessages.forEach((msg) => {
        msg.read = true;
        msg.delivery_status = "read";
      });

      this.emit("messagesMarkedAsRead", {
        conversationId,
        messageIds: unreadMessages.map((m) => m.id),
      });

      // تحديث في الخادم (اختياري)
      // await apiClient.markMessagesAsRead(unreadMessages.map(m => m.id));
    } catch (error) {
      console.error("خطأ في تحديث حالة القراءة:", error);
    }
  }

  // إنشاء محادثات وهمية للاختبار
  private generateMockConversations(userId: string): Conversation[] {
    return [
      {
        id: "user1",
        user: {
          id: "user1",
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
          sender_id: "user1",
          receiver_id: userId,
          content: "مرحباً، كيف يمكنني مساعدتك؟",
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
          delivery_status: "delivered",
        },
        unreadCount: 2,
        isOnline: true,
      },
      {
        id: "user2",
        user: {
          id: "user2",
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
          sender_id: userId,
          receiver_id: "user2",
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
  }

  // إنشاء رسائل وهمية للاختبار
  private generateMockMessages(
    conversationId: string,
    userId: string,
  ): Message[] {
    return [
      {
        id: "1",
        sender_id: conversationId,
        receiver_id: userId,
        content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        read: true,
        delivery_status: "read",
      },
      {
        id: "2",
        sender_id: userId,
        receiver_id: conversationId,
        content: "مرحباً، أريد حجز موعد للغد",
        created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        read: true,
        delivery_status: "read",
      },
      {
        id: "3",
        sender_id: conversationId,
        receiver_id: userId,
        content: "بالطبع! ما هو الوقت المناسب لك؟",
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
        delivery_status: "delivered",
      },
    ];
  }

  // تنظيف الذاكرة
  cleanup() {
    this.messages.clear();
    this.conversations.clear();
    this.eventListeners.clear();
  }
}

// إنشاء مثيل مشترك
export const chatManager = new ChatManager();
