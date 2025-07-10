import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Phone, Video, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface SmartChatButtonProps {
  userId: string;
  userName: string;
  userRole?: "customer" | "barber" | "admin";
  variant?: "default" | "compact" | "full";
  onChatStart?: () => void;
  className?: string;
}

export default function SmartChatButton({
  userId,
  userName,
  userRole = "customer",
  variant = "default",
  onChatStart,
  className = "",
}: SmartChatButtonProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartChat = async () => {
    if (isStarting) return;

    try {
      setIsStarting(true);
      console.log("🚀 [SmartChatButton] بدء محادثة مع:", {
        userId,
        userName,
        userRole,
      });

      // Navigate to messages page with target user
      const params = new URLSearchParams({ targetUser: userId });
      window.location.href = `/dashboard?tab=messages&${params.toString()}`;

      // Call optional callback
      if (onChatStart) {
        onChatStart();
      }

      toast({
        title: "تم بدء المحادثة",
        description: `جاري فتح محادثة مع ${userName}...`,
      });
    } catch (error) {
      console.error("❌ [SmartChatButton] خطأ في بدء المحادثة:", error);
      toast({
        title: "خطأ",
        description: "فشل في بدء المحادثة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "barber":
        return "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800";
      case "admin":
        return "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800";
      default:
        return "from-green-600 to-green-700 hover:from-green-700 hover:to-green-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "barber":
        return "💈";
      case "admin":
        return "👑";
      default:
        return "👤";
    }
  };

  // Compact variant - small circular button
  if (variant === "compact") {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStartChat}
        disabled={isStarting}
        className={`
          relative p-3 rounded-full bg-gradient-to-r ${getRoleColor(userRole)}
          text-white shadow-lg hover:shadow-xl transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={`محادثة مع ${userName}`}
      >
        {isStarting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}

        {/* Online indicator */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
      </motion.button>
    );
  }

  // Full variant - detailed chat card
  if (variant === "full") {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={`bg-white rounded-xl shadow-lg p-6 border border-gray-200 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="text-2xl">{getRoleIcon(userRole)}</div>
            <div>
              <h3 className="font-medium text-gray-900">{userName}</h3>
              <p className="text-sm text-gray-500 capitalize">{userRole}</p>
            </div>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleStartChat}
            disabled={isStarting}
            className="flex flex-col items-center py-3 h-auto"
            variant="outline"
          >
            {isStarting ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1" />
            ) : (
              <MessageCircle className="w-5 h-5 mb-1" />
            )}
            <span className="text-xs">دردشة</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center py-3 h-auto"
          >
            <Phone className="w-5 h-5 mb-1" />
            <span className="text-xs">اتصال</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center py-3 h-auto"
          >
            <Video className="w-5 h-5 mb-1" />
            <span className="text-xs">فيديو</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  // Default variant - standard button
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleStartChat}
      disabled={isStarting}
      className={`
        w-full bg-gradient-to-r ${getRoleColor(userRole)}
        text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl
        transition-all duration-200 flex items-center justify-center gap-3
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isStarting ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>جاري البدء...</span>
        </>
      ) : (
        <>
          <MessageCircle className="w-5 h-5" />
          <span>محادثة مع {userName}</span>
          <span className="text-xs opacity-75">{getRoleIcon(userRole)}</span>
        </>
      )}
    </motion.button>
  );
}

// Hook for programmatic chat starting
export const useSmartChat = () => {
  const startChat = async (userId: string, userName: string) => {
    try {
      console.log("🚀 [useSmartChat] بدء محادثة مع:", { userId, userName });

      // Navigate to messages with target user
      const params = new URLSearchParams({ targetUser: userId });

      // Check if we're already on dashboard
      if (window.location.pathname.includes("dashboard")) {
        // Just update the URL params and trigger a reload
        const newUrl = `/dashboard?tab=messages&${params.toString()}`;
        window.history.pushState({}, "", newUrl);

        // Trigger a custom event to notify the app
        window.dispatchEvent(
          new CustomEvent("chatStart", {
            detail: { userId, userName },
          }),
        );
      } else {
        // Navigate to dashboard with messages tab
        window.location.href = `/dashboard?tab=messages&${params.toString()}`;
      }

      return true;
    } catch (error) {
      console.error("❌ [useSmartChat] خطأ في بدء المحادثة:", error);
      return false;
    }
  };

  return { startChat };
};
