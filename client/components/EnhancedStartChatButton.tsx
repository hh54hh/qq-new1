import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";

interface ProfileChatButtonProps {
  userId: string;
  userName: string;
  onStartChat: (userId: string, userName: string) => void;
  className?: string;
}

interface CompactChatButtonProps {
  userId: string;
  userName: string;
  onStartChat: (userId: string, userName: string) => void;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}

export const ProfileChatButton: React.FC<ProfileChatButtonProps> = ({
  userId,
  userName,
  onStartChat,
  className = "",
}) => {
  const handleClick = () => {
    onStartChat(userId, userName);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
        text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl
        transition-all duration-200 flex items-center justify-center gap-2
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      <MessageCircle size={20} />
      <span>Send Message</span>
    </motion.button>
  );
};

export const CompactChatButton: React.FC<CompactChatButtonProps> = ({
  userId,
  userName,
  onStartChat,
  size = "md",
  variant = "primary",
}) => {
  const handleClick = () => {
    onStartChat(userId, userName);
  };

  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500",
  };

  const iconSize = size === "sm" ? 16 : 18;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`
        rounded-full transition-all duration-200 flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${sizeClasses[size]} ${variantClasses[variant]}
      `}
      title={`Send message to ${userName}`}
    >
      <Send size={iconSize} />
    </motion.button>
  );
};

interface StartChatButtonProps {
  userId: string;
  userName: string;
  onStartChat: (userId: string, userName: string) => void;
  variant?: "profile" | "compact";
  size?: "sm" | "md";
  buttonVariant?: "primary" | "secondary";
  className?: string;
}

export const StartChatButton: React.FC<StartChatButtonProps> = ({
  userId,
  userName,
  onStartChat,
  variant = "profile",
  size = "md",
  buttonVariant = "primary",
  className,
}) => {
  if (variant === "compact") {
    return (
      <CompactChatButton
        userId={userId}
        userName={userName}
        onStartChat={onStartChat}
        size={size}
        variant={buttonVariant}
      />
    );
  }

  return (
    <ProfileChatButton
      userId={userId}
      userName={userName}
      onStartChat={onStartChat}
      className={className}
    />
  );
};

export default StartChatButton;
