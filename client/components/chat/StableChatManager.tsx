import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@shared/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import StableChatList from "./StableChatList";
import StableChatConversation from "./StableChatConversation";

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
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  isOffline?: boolean;
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

interface StableChatManagerProps {
  user: User;
  onBack: () => void;
  targetUser?: User;
  isVisible: boolean; // للتحكم في الرؤية بدون إعادة تحميل
}

export default function StableChatManager({
  user,
  onBack,
  targetUser,
  isVisible,
}: StableChatManagerProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // بدء محادثة مع مستخدم محدد إذا تم توفيره
  useEffect(() => {
    if (targetUser && !selectedConversation && isVisible) {
      const targetConversation: Conversation = {
        id: targetUser.id,
        user: targetUser,
        lastMessage: undefined,
        unreadCount: 0,
        isOnline: Math.random() > 0.5,
        isTyping: false,
      };
      setSelectedConversation(targetConversation);
    }
  }, [targetUser, selectedConversation, isVisible]);

  // تهيئة المكون عند أول ظهور
  useEffect(() => {
    if (isVisible && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isVisible, isInitialized]);

  const handleConversationSelect = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
  }, []);

  const handleConversationUpdate = useCallback(
    (updatedConversation: Conversation) => {
      setRefreshTrigger((prev) => prev + 1);
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  const handleBackToApp = useCallback(() => {
    setSelectedConversation(null);
    onBack();
  }, [onBack]);

  // إخفاء المكون إذا لم يكن مرئياً ولم يتم تهيئته
  if (!isVisible && !isInitialized) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background transition-all duration-300",
        isVisible ? "opacity-100 visible" : "opacity-0 invisible",
      )}
    >
      {/* خلفية مظلمة ثابتة */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 h-full flex flex-col">
        <AnimatePresence mode="wait">
          {selectedConversation ? (
            <motion.div
              key="conversation"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8,
              }}
              className="h-full"
            >
              <StableChatConversation
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
                stiffness: 400,
                damping: 30,
                mass: 0.8,
              }}
              className="h-full"
            >
              <StableChatList
                user={user}
                onConversationSelect={handleConversationSelect}
                onBack={handleBackToApp}
                refreshTrigger={refreshTrigger}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* خلفية شفافة للنقر خارج المحادثة */}
      {isVisible && (
        <div
          className="absolute inset-0 z-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !selectedConversation) {
              onBack();
            }
          }}
        />
      )}
    </div>
  );
}
