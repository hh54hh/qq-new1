import { useState, useEffect } from "react";
import { User } from "@shared/api";
import ChatList from "./ChatList";
import EnhancedChatConversation from "./EnhancedChatConversation";
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
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: string;
}

interface ChatManagerProps {
  user: User;
  onBack: () => void;
  targetUser?: User; // إذا تم توفيره، سيبدأ محادثة مع هذا المستخدم
}

export default function ChatManager({
  user,
  onBack,
  targetUser,
}: ChatManagerProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // بدء محادثة مع مستخدم محدد إذا تم توفيره
  useEffect(() => {
    if (targetUser && !selectedConversation) {
      const targetConversation: Conversation = {
        id: targetUser.id,
        user: targetUser,
        lastMessage: undefined,
        unreadCount: 0,
        isOnline: Math.random() > 0.5, // محاكاة الحالة
        isTyping: false,
      };
      setSelectedConversation(targetConversation);
    }
  }, [targetUser, selectedConversation]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    // تحديث القائمة عند تغيير المحادثة
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {selectedConversation ? (
          <motion.div
            key="conversation"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="h-full"
          >
            <EnhancedChatConversation
              user={user}
              conversation={selectedConversation}
              onBack={handleBackToList}
              onConversationUpdate={handleConversationUpdate}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="h-full"
          >
            <ChatList
              user={user}
              onConversationSelect={handleConversationSelect}
              onBack={onBack}
              refreshTrigger={refreshTrigger}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
