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

export class RealChatManager {
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

  // التحقق من صحة معرف المستخدم
  private isValidUserId(userId: string): boolean {
    return userId && userId !== "undefined" && userId.trim() !== "";
  }

  // تحميل المحادثات الحقيقية
  async loadConversations(userId: string): Promise<Conversation[]> {
    if (!this.isValidUserId(userId)) {
      console.error("معرف المستخدم غير صحيح:", userId);
      return [];
    }

    try {
      console.log("🔄 تحميل المحادثات للمستخدم:", userId);

      // محاولة تحميل المحادثات من API
      const response = await apiClient.getConversations();
      console.log("📥 استجابة المحادثات:", response);

      const conversations: Conversation[] = [];

      if (response.conversations && Array.isArray(response.conversations)) {
        response.conversations.forEach((conv: any) => {
          if (conv && conv.id && this.isValidUserId(conv.id)) {
            conversations.push({
              id: conv.id,
              user: conv.user || {
                id: conv.id,
                name: conv.name || `مستخدم ${conv.id}`,
                email: `${conv.id}@example.com`,
                role: "customer" as any,
                status: "active",
                level: 50,
                points: 1000,
                is_verified: false,
                created_at: new Date().toISOString(),
              },
              lastMessage: conv.lastMessage
                ? {
                    id: conv.lastMessage.id,
                    sender_id: conv.lastMessage.sender_id,
                    receiver_id: conv.lastMessage.receiver_id,
                    content:
                      conv.lastMessage.content || conv.lastMessage.message,
                    created_at: conv.lastMessage.created_at,
                    read: conv.lastMessage.read || false,
                    delivery_status: conv.lastMessage.read
                      ? "read"
                      : "delivered",
                  }
                : undefined,
              unreadCount: conv.unreadCount || 0,
              isOnline: Math.random() > 0.5,
            });
          }
        });
      }

      // حفظ في الذاكرة المحلية
      conversations.forEach((conv) => {
        this.conversations.set(conv.id, conv);
      });

      console.log("✅ تم تحميل المحادثات:", conversations.length);
      this.emit("conversationsLoaded", conversations);
      return conversations;
    } catch (error) {
      console.error("❌ خطأ في تحميل المحادثات:", error);

      // إرجاع قائمة فارغة في حالة الخطأ - لا بيانات وهمية
      this.emit("conversationsLoaded", []);
      return [];
    }
  }

  // تحميل رسائل محادثة محددة
  async loadMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    if (!this.isValidUserId(conversationId) || !this.isValidUserId(userId)) {
      console.error("معرفات غير صحيحة:", { conversationId, userId });
      return [];
    }

    try {
      console.log("🔄 تحميل الرسائل للمحادثة:", conversationId);

      // محاولة تحميل الرسائل من API
      const response = await apiClient.getMessages(conversationId);
      console.log("📥 استجابة الرسائل:", response);

      const messages: Message[] = [];

      if (response.messages && Array.isArray(response.messages)) {
        response.messages.forEach((msg: any) => {
          if (
            msg &&
            msg.id &&
            ((msg.sender_id === userId && msg.receiver_id === conversationId) ||
              (msg.sender_id === conversationId && msg.receiver_id === userId))
          ) {
            messages.push({
              id: msg.id,
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
              content: msg.content || msg.message || "",
              created_at: msg.created_at,
              read: msg.read || false,
              delivery_status: msg.read ? "read" : "delivered",
              message_type: msg.message_type || "text",
            });
          }
        });
      }

      // ترتيب الرسائل حسب التاريخ
      messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      // حفظ في الذاكرة المحلية
      this.messages.set(conversationId, messages);

      console.log("✅ تم تحميل الرسائل:", messages.length);
      this.emit("messagesLoaded", { conversationId, messages });
      return messages;
    } catch (error) {
      console.error("❌ خطأ في تحميل الرسائل:", error);

      // إرجاع قائمة فارغة في حالة الخطأ
      this.emit("messagesLoaded", { conversationId, messages: [] });
      return [];
    }
  }

  // إرسال رسالة حقيقية
  async sendMessage(data: SendMessageData, senderId: string): Promise<Message> {
    if (
      !this.isValidUserId(data.receiver_id) ||
      !this.isValidUserId(senderId)
    ) {
      throw new Error("معرفات المستخدمين غير صحيحة");
    }

    if (!data.content.trim()) {
      throw new Error("محتوى الرسالة فارغ");
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    console.log("📤 إرسال رسالة:", {
      senderId,
      receiverId: data.receiver_id,
      content: data.content,
    });

    // إنشاء رسالة مؤقتة
    const tempMessage: Message = {
      id: tempId,
      sender_id: senderId,
      receiver_id: data.receiver_id,
      content: data.content.trim(),
      created_at: new Date().toISOString(),
      read: false,
      delivery_status: "sending",
      message_type: "text",
    };

    // إضافة الرسالة فوراً للواجهة
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
        content: data.content.trim(),
        message_type: "text",
      });

      console.log("✅ نجح الإرسال:", response);

      // تحديث الرسالة بالمعرف الحقيقي
      const sentMessage: Message = {
        ...tempMessage,
        id: response.message?.id || tempId,
        delivery_status: "sent",
        created_at: response.message?.created_at || tempMessage.created_at,
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
      console.error("❌ فشل الإرسال:", error);

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
    if (!this.isValidUserId(conversationId)) {
      throw new Error("معرف المحادثة غير صحيح");
    }

    const messages = this.messages.get(conversationId);
    if (!messages) return;

    const message = messages.find((msg) => msg.id === messageId);
    if (!message || message.delivery_status !== "failed") return;

    console.log("🔄 إعادة محاولة إرسال الرسالة:", messageId);

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
      message.created_at = response.message?.created_at || message.created_at;

      this.emit("messageUpdated", {
        conversationId,
        oldMessageId: messageId,
        message,
      });

      console.log("✅ نجحت إعادة الإرسال");
    } catch (error) {
      console.error("❌ فشلت إعادة الإرسال:", error);
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
    if (!this.isValidUserId(conversationId) || !this.isValidUserId(userId)) {
      return;
    }

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

      // تحديث في الخادم
      await apiClient.markMessagesAsRead(conversationId);
      console.log("✅ تم تحديث حالة القراءة");
    } catch (error) {
      console.error("❌ خطأ في تحديث حالة القراءة:", error);
    }
  }

  // تنظيف الذاكرة
  cleanup() {
    this.messages.clear();
    this.conversations.clear();
    this.eventListeners.clear();
  }
}

// إنشاء مثيل مشترك
export const realChatManager = new RealChatManager();
