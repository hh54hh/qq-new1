import { RequestHandler } from "express";
import { supabase, getCurrentUserId } from "../../shared/supabase";
import { DbMessage, DbUser } from "../../shared/database";

// Get conversations for current user
export const getConversations: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    // Get all conversations for the user
    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar_url, role),
        receiver:users!messages_receiver_id_fkey(id, name, avatar_url, role)
      `,
      )
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      // Return empty array instead of error for better UX
      return res.json({ conversations: [] });
    }

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const message of messages) {
      const partnerId =
        message.sender_id === userId ? message.receiver_id : message.sender_id;
      const partner =
        message.sender_id === userId ? message.receiver : message.sender;

      if (!conversationsMap.has(partnerId)) {
        // Count unread messages from this partner
        const unreadCount = messages.filter(
          (m) =>
            m.sender_id === partnerId && m.receiver_id === userId && !m.is_read,
        ).length;

        conversationsMap.set(partnerId, {
          user: partner,
          lastMessage: message,
          unreadCount,
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    res.json({ conversations });
  } catch (error) {
    console.error("Error in getConversations:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};

// Get messages between current user and another user
export const getMessages: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, name, avatar_url)
      `,
      )
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      // Return empty array instead of error for better UX
      return res.json({ messages: [] });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};

// Send a new message
export const sendMessage: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    const { receiver_id, content, message_type = "text" } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    if (!receiver_id || !content) {
      return res.status(400).json({ error: "معرف المستقبل والمحتوى مطلوبان" });
    }

    // Verify receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", receiver_id)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ error: "المستقبل غير موجود" });
    }

    // Insert new message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id,
        message: content,
        message_type,
        is_read: false,
      })
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, name, avatar_url)
      `,
      )
      .single();

    if (insertError) {
      console.error("Error sending message:", insertError);
      return res.status(500).json({ error: "خطأ في إرسال الرسالة" });
    }

    // Create notification for receiver
    await supabase.from("notifications").insert({
      user_id: receiver_id,
      type: "new_message",
      title: "رسالة جديدة",
      message: `رسالة جديدة من ${message.sender?.name || "مستخدم"}`,
      data: {
        sender_id: userId,
        message_id: message.id,
      },
    });

    res.status(201).json({
      message: message,
      success: true,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};

// Mark messages as read
export const markMessagesAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    const { senderId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", senderId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
      return res.status(500).json({ error: "خطأ في تحديث الرسائل" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};

// Get unread message count
export const getUnreadCount: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      // Return 0 instead of error for better UX
      return res.json({ count: 0 });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};

// Delete conversation
export const deleteConversation: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      );

    if (error) {
      console.error("Error deleting conversation:", error);
      return res.status(500).json({ error: "خطأ في حذف المحادثة" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in deleteConversation:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
};
