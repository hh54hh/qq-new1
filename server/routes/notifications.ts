import { RequestHandler } from "express";
import { getCurrentUserId } from "../../shared/supabase";

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  message: string;
  icon?: string;
  image?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

// تخزين مؤقت للاشتراكات (في بيئة الإنتاج، استخدم قاعدة بيانات)
const subscriptions = new Map<string, PushSubscription>();

// تسجيل اشتراك جديد في Push Notifications
export const subscribeToPush: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const subscription: PushSubscription = req.body;

    // التحقق من صحة البيانات
    if (!subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "بيانات الاشتراك غير صحيحة" });
    }

    // حفظ الاشتراك
    subscriptions.set(userId, subscription);

    console.log(`Push subscription registered for user: ${userId}`);

    res.json({
      success: true,
      message: "تم تسجيل الاشتراك في الإشعارات بنجاح",
    });
  } catch (error) {
    console.error("Push subscription error:", error);
    res.status(500).json({ error: "خطأ في تسجيل الاشتراك" });
  }
};

// إلغاء اشتراك Push Notifications
export const unsubscribeFromPush: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    // إزالة الاشتراك
    subscriptions.delete(userId);

    console.log(`Push subscription removed for user: ${userId}`);

    res.json({
      success: true,
      message: "تم إلغاء الاشتراك في الإشعارات",
    });
  } catch (error) {
    console.error("Push unsubscription error:", error);
    res.status(500).json({ error: "خطأ في إلغاء الاشتراك" });
  }
};

// إرسال إشعار لمستخدم محدد
export const sendNotificationToUser: RequestHandler = async (req, res) => {
  try {
    const {
      userId,
      notification,
    }: { userId: string; notification: NotificationPayload } = req.body;

    // التحقق من وجود اشتراك للمستخدم
    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return res.status(404).json({ error: "لا يوجد اشتراك لهذا المستخدم" });
    }

    // إرسال الإشعار (محاكاة - في بيئة الإنتاج استخدم web-push)
    console.log(`Sending notification to user ${userId}:`, notification);

    // هنا يمكن إضافة منطق إرسال فعلي باستخدام web-push library
    // await webpush.sendNotification(subscription, JSON.stringify(notification));

    res.json({
      success: true,
      message: "تم إرسال الإشعار بنجاح",
    });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ error: "خطأ في إرسال الإشعار" });
  }
};

// إرسال إشعار لجميع المستخدمين
export const broadcastNotification: RequestHandler = async (req, res) => {
  try {
    const { notification }: { notification: NotificationPayload } = req.body;

    console.log(
      `Broadcasting notification to ${subscriptions.size} users:`,
      notification,
    );

    // إرسال للجميع
    const promises = Array.from(subscriptions.entries()).map(
      ([userId, subscription]) => {
        // في بيئة الإنتاج، استخدم web-push
        console.log(`Sending to user: ${userId}`);
        return Promise.resolve(); // محاكاة
      },
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `تم إرسال الإشعار لـ ${subscriptions.size} مستخدم`,
      sentCount: subscriptions.size,
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    res.status(500).json({ error: "خطأ في إرس��ل الإشعار العام" });
  }
};

// الحصول على إحصائيات الإشعارات
export const getNotificationStats: RequestHandler = async (req, res) => {
  try {
    const stats = {
      totalSubscriptions: subscriptions.size,
      subscriptions: Array.from(subscriptions.keys()),
      features: {
        pushSupported: true,
        backgroundSync: true,
        serviceWorker: true,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
  }
};

// إرسال إشعار تجريبي
export const sendTestNotification: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return res.status(404).json({
        error: "لا يوجد اشتراك في الإشعارات لحسابك",
      });
    }

    const testNotification: NotificationPayload = {
      title: "إشعار تجريبي - حلاقة",
      message: "هذا إشعار تجريبي للتأكد من عمل النظام بشكل صحيح",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      url: "/dashboard",
      tag: "test-notification",
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`Sending test notification to user: ${userId}`);

    res.json({
      success: true,
      message: "تم إرسال الإشعار التجريبي",
      notification: testNotification,
    });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ error: "خطأ في إرسال الإشعار التجريبي" });
  }
};

// مساعدة لإنشاء إشعارات الحجوزات
export function createBookingNotification(booking: any): NotificationPayload {
  return {
    title: "حجز جديد - حلاقة",
    message: `لديك حجز جديد مع ${booking.barber?.name || "الحلاق"} في ${new Date(booking.datetime).toLocaleString("ar")}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    image: booking.barber?.avatar_url,
    url: `/dashboard?tab=bookings&booking=${booking.id}`,
    tag: `booking-${booking.id}`,
    requireInteraction: true,
    data: {
      type: "booking",
      bookingId: booking.id,
      barberId: booking.barber_id,
      timestamp: booking.datetime,
    },
  };
}

// مساعدة لإنشاء إشعارات الرسائل
export function createMessageNotification(message: any): NotificationPayload {
  return {
    title: `رسالة جديدة من ${message.sender?.name || "مستخدم"}`,
    message:
      message.content.substring(0, 100) +
      (message.content.length > 100 ? "..." : ""),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    image: message.sender?.avatar_url,
    url: `/messages?conversation=${message.conversation_id}`,
    tag: `message-${message.id}`,
    data: {
      type: "message",
      messageId: message.id,
      senderId: message.sender_id,
      conversationId: message.conversation_id,
    },
  };
}

// Helper لتحديد إعدادات الإشعارات للمستخدم
export function getUserNotificationSettings(userId: string) {
  // في بيئة الإنتاج، اجلب من قاعدة البيانات
  return {
    enabled: subscriptions.has(userId),
    bookings: true,
    messages: true,
    updates: false,
    marketing: false,
  };
}
