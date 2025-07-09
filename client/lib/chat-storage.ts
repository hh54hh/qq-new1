interface StoredMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type?: "text" | "image" | "voice" | "system";
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  reply_to?: string;
  is_starred?: boolean;
  isOffline?: boolean;
}

interface StoredConversation {
  id: string;
  user: any;
  lastMessage?: StoredMessage;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  lastSeen?: string;
  updatedAt: string;
}

class ChatStorage {
  private readonly MESSAGES_KEY = "barbershop_messages";
  private readonly CONVERSATIONS_KEY = "barbershop_conversations";
  private readonly USER_KEY = "barbershop_current_user";

  // حفظ الرسائل محلياً
  saveMessages(conversationId: string, messages: StoredMessage[]): void {
    try {
      const allMessages = this.getAllStoredMessages();
      allMessages[conversationId] = messages;
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));
    } catch (error) {
      console.error("خطأ في حفظ الرسائل:", error);
    }
  }

  // جلب الرسائل المحفوظة محلياً
  getMessages(conversationId: string): StoredMessage[] {
    try {
      const allMessages = this.getAllStoredMessages();
      return allMessages[conversationId] || [];
    } catch (error) {
      console.error("خطأ في جلب الرسائل:", error);
      return [];
    }
  }

  // إضافة رسالة جديدة
  addMessage(conversationId: string, message: StoredMessage): void {
    try {
      const messages = this.getMessages(conversationId);

      // التحقق من عدم وجود رسالة بنفس المعرف
      const existingIndex = messages.findIndex((m) => m.id === message.id);
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }

      // ترتيب الرسائل حسب التاريخ
      messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      this.saveMessages(conversationId, messages);
      this.updateConversationLastMessage(conversationId, message);
    } catch (error) {
      console.error("خطأ في إضافة الرسالة:", error);
    }
  }

  // تحديث حالة الرسالة
  updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: StoredMessage["delivery_status"],
  ): void {
    try {
      const messages = this.getMessages(conversationId);
      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex >= 0) {
        messages[messageIndex].delivery_status = status;
        this.saveMessages(conversationId, messages);
      }
    } catch (error) {
      console.error("خطأ في تحديث حالة الرسالة:", error);
    }
  }

  // حفظ المحادثات
  saveConversations(conversations: StoredConversation[]): void {
    try {
      const sortedConversations = conversations.sort((a, b) => {
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

      localStorage.setItem(
        this.CONVERSATIONS_KEY,
        JSON.stringify(sortedConversations),
      );
    } catch (error) {
      console.error("خطأ في حفظ المحادثات:", error);
    }
  }

  // جلب المحادثات المحفوظة
  getConversations(): StoredConversation[] {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("خطأ في جلب المحادثات:", error);
      return [];
    }
  }

  // تحديث آخر رسالة في المحادثة
  private updateConversationLastMessage(
    conversationId: string,
    message: StoredMessage,
  ): void {
    try {
      const conversations = this.getConversations();
      const convIndex = conversations.findIndex((c) => c.id === conversationId);

      if (convIndex >= 0) {
        conversations[convIndex].lastMessage = message;
        conversations[convIndex].updatedAt = new Date().toISOString();
        this.saveConversations(conversations);
      }
    } catch (error) {
      console.error("خطأ في تحديث آخر رسالة:", error);
    }
  }

  // إنشاء رسالة مؤقتة للحفظ المحلي
  createOfflineMessage(
    senderId: string,
    receiverId: string,
    content: string,
    replyTo?: string,
  ): StoredMessage {
    return {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      read: false,
      message_type: "text",
      delivery_status: "sending",
      reply_to: replyTo,
      isOffline: true,
    };
  }

  // جلب الرسائل غير المرسلة (offline)
  getPendingMessages(
    userId: string,
  ): { conversationId: string; message: StoredMessage }[] {
    try {
      const allMessages = this.getAllStoredMessages();
      const pending: { conversationId: string; message: StoredMessage }[] = [];

      Object.entries(allMessages).forEach(([conversationId, messages]) => {
        messages.forEach((message) => {
          if (
            message.isOffline &&
            message.sender_id === userId &&
            message.delivery_status === "sending"
          ) {
            pending.push({ conversationId, message });
          }
        });
      });

      return pending;
    } catch (error) {
      console.error("خطأ في جلب الرسائل المعلقة:", error);
      return [];
    }
  }

  // تنظيف البيانات القديمة
  cleanOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    // 30 يوم
    try {
      const cutoff = Date.now() - maxAge;
      const allMessages = this.getAllStoredMessages();

      Object.keys(allMessages).forEach((conversationId) => {
        allMessages[conversationId] = allMessages[conversationId].filter(
          (message) => new Date(message.created_at).getTime() > cutoff,
        );
      });

      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));
    } catch (error) {
      console.error("خطأ في تنظيف البيانات:", error);
    }
  }

  // حذف محادثة
  deleteConversation(conversationId: string): void {
    try {
      // حذف الرسائل
      const allMessages = this.getAllStoredMessages();
      delete allMessages[conversationId];
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));

      // حذف المحادثة
      const conversations = this.getConversations();
      const filtered = conversations.filter((c) => c.id !== conversationId);
      this.saveConversations(filtered);
    } catch (error) {
      console.error("خطأ في حذف المحادثة:", error);
    }
  }

  // مسح جميع البيانات
  clearAll(): void {
    try {
      localStorage.removeItem(this.MESSAGES_KEY);
      localStorage.removeItem(this.CONVERSATIONS_KEY);
    } catch (error) {
      console.error("خطأ في مسح البيانات:", error);
    }
  }

  // دوال مساعدة
  private getAllStoredMessages(): Record<string, StoredMessage[]> {
    try {
      const stored = localStorage.getItem(this.MESSAGES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("خطأ في جلب جميع الرسائل:", error);
      return {};
    }
  }

  // حفظ معرف المستخدم الحالي
  setCurrentUser(userId: string): void {
    try {
      localStorage.setItem(this.USER_KEY, userId);
    } catch (error) {
      console.error("خطأ في حفظ معرف المستخدم:", error);
    }
  }

  // جلب معرف المستخدم الحالي
  getCurrentUser(): string | null {
    try {
      return localStorage.getItem(this.USER_KEY);
    } catch (error) {
      console.error("خطأ في جلب معرف المستخدم:", error);
      return null;
    }
  }

  // إحصائيات التخزين
  getStorageStats(): {
    messagesCount: number;
    conversationsCount: number;
    storageSize: string;
  } {
    try {
      const allMessages = this.getAllStoredMessages();
      const conversations = this.getConversations();

      const messagesCount = Object.values(allMessages).reduce(
        (total, messages) => total + messages.length,
        0,
      );

      const storageSize = this.calculateStorageSize();

      return {
        messagesCount,
        conversationsCount: conversations.length,
        storageSize,
      };
    } catch (error) {
      console.error("خطأ في حساب الإحصائيات:", error);
      return {
        messagesCount: 0,
        conversationsCount: 0,
        storageSize: "0 KB",
      };
    }
  }

  private calculateStorageSize(): string {
    try {
      const messagesData = localStorage.getItem(this.MESSAGES_KEY) || "";
      const conversationsData =
        localStorage.getItem(this.CONVERSATIONS_KEY) || "";
      const totalBytes = (messagesData.length + conversationsData.length) * 2; // تقريبي للـ UTF-16

      if (totalBytes < 1024) return `${totalBytes} B`;
      if (totalBytes < 1024 * 1024)
        return `${(totalBytes / 1024).toFixed(1)} KB`;
      return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch (error) {
      return "0 KB";
    }
  }
}

// إنشاء instance مشترك
export const chatStorage = new ChatStorage();

// خطاف للتحقق من الاتصال
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
