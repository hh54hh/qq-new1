import { User } from "@shared/api";

/**
 * بدء محادثة مع مستخدم محدد
 * @param targetUser المستخدم المراد بدء محادثة معه
 * @param currentUser المستخدم الحالي
 */
export function startChatWithUser(targetUser: User, currentUser: User) {
  // التحقق من أن المستخدم لا يحاول بدء محادثة مع نفسه
  if (targetUser.id === currentUser.id) {
    console.warn("لا يمكن بدء محادثة مع نفسك");
    return;
  }

  // إنشاء URL للمحادثة
  const chatUrl = `/messages?with=${targetUser.id}&name=${encodeURIComponent(
    targetUser.name,
  )}`;

  // الانتقال إلى صفحة المحادثة
  window.location.href = chatUrl;
}

/**
 * تنسيق وقت آخر ظهور
 * @param lastSeen وقت آخر ظهور
 * @returns نص منسق
 */
export function formatLastSeen(lastSeen: string): string {
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - lastSeenDate.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return "متصل الآن";
  if (diffInMinutes < 60) return `كان متصلاً منذ ${diffInMinutes}د`;
  if (diffInMinutes < 1440)
    return `كان متصلاً منذ ${Math.floor(diffInMinutes / 60)}س`;
  return `كان متصلاً منذ ${Math.floor(diffInMinutes / 1440)}ي`;
}

/**
 * تنسيق وقت الرسالة
 * @param timestamp وقت الرسالة
 * @returns نص منسق
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return "الآن";
  if (diffInMinutes < 60) return `${diffInMinutes}د`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}س`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}ي`;

  return date.toLocaleDateString("ar-SA", {
    month: "short",
    day: "numeric",
  });
}

/**
 * تنسيق تاريخ الرسائل للمجموعات
 * @param timestamp وقت الرسالة
 * @returns نص منسق للتاريخ
 */
export function formatMessageDate(timestamp: string): string {
  const date = new Date(timestamp);
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
}

/**
 * تحديد نوع الرسالة بناءً على المحتوى
 * @param content محتوى الرسالة
 * @returns نوع الرسالة
 */
export function detectMessageType(
  content: string,
): "text" | "image" | "voice" | "location" {
  // إذا كان المحتوى يحتوي على إحداثيات
  if (content.includes("الموقع:") || content.includes("lat:")) {
    return "location";
  }

  // إذا كان المحتوى يشير إلى صورة
  if (content.startsWith("📷") || content.includes("صورة")) {
    return "image";
  }

  // إذا كان المحت��ى يشير إلى رسالة صوتية
  if (content.startsWith("🎵") || content.includes("رسالة صوتية")) {
    return "voice";
  }

  return "text";
}

/**
 * إنشاء معرف فريد للرسالة المؤقتة
 * @returns معرف فريد
 */
export function generateTempMessageId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * التحقق من صحة معرف المستخدم
 * @param userId معرف المستخدم
 * @returns true إذا كان المعرف صحيحاً
 */
export function isValidUserId(userId: string): boolean {
  return userId && userId.trim().length > 0 && userId !== "undefined";
}

/**
 * إنشاء رابط للمحادثة مع مستخدم
 * @param targetUser المستخدم المستهدف
 * @returns رابط المحادثة
 */
export function createChatLink(targetUser: User): string {
  return `/messages?with=${targetUser.id}&name=${encodeURIComponent(
    targetUser.name,
  )}`;
}

/**
 * استخراج معلومات المستخدم من رابط المحادثة
 * @param url الرابط
 * @returns معلومات المستخدم أو null
 */
export function extractUserFromChatUrl(url: string): {
  id: string;
  name: string;
} | null {
  try {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    const id = urlParams.get("with");
    const name = urlParams.get("name");

    if (id && name) {
      return {
        id,
        name: decodeURIComponent(name),
      };
    }
  } catch (error) {
    console.error("خطأ في استخراج معلومات المستخدم من الرابط:", error);
  }

  return null;
}
