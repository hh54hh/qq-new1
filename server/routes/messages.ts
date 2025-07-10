import { RequestHandler } from "express";
import { db, getCurrentUserId } from "../../shared/supabase";

// Messages endpoints
export const getConversations: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const conversations = await db.messages.getConversations(userId);
    res.json({ conversations, total: conversations.length });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({ error: "Other user ID is required" });
    }

    const messages = await db.messages.getMessages(userId, otherUserId);
    res.json({ messages, total: messages.length });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createMessage: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { receiver_id, message, message_type } = req.body;

    if (!receiver_id || !message?.trim()) {
      return res.status(400).json({
        error: "Receiver ID and message are required",
      });
    }

    if (userId === receiver_id) {
      return res.status(400).json({
        error: "Cannot send message to yourself",
      });
    }

    const newMessage = await db.messages.create({
      sender_id: userId,
      receiver_id,
      message: message.trim(),
      message_type: message_type || "text",
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessageAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { messageId } = req.params;

    await db.messages.markAsRead(messageId, userId);
    res.status(204).send();
  } catch (error) {
    console.error("Mark message as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markConversationAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { otherUserId } = req.params;

    await db.messages.markConversationAsRead(userId, otherUserId);
    res.status(204).send();
  } catch (error) {
    console.error("Mark conversation as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
