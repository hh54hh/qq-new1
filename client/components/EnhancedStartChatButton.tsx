import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EnhancedStartChatButtonProps {
  targetUser: User;
  currentUser: User;
  onStartChat: (targetUser: User) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export default function EnhancedStartChatButton({
  targetUser,
  currentUser,
  onStartChat,
  className,
  variant = "default",
  size = "default",
  showIcon = true,
  children,
  fullWidth = false,
}: EnhancedStartChatButtonProps) {
  // لا نعرض الزر للمستخدم نفسه
  if (targetUser.id === currentUser.id) {
    return null;
  }

  const handleClick = () => {
    onStartChat(targetUser);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={fullWidth ? "w-full" : ""}
    >
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={cn(
          "transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
          variant === "default" &&
            "bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white",
          variant === "outline" &&
            "border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20",
          variant === "ghost" &&
            "hover:bg-blue-100 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400",
          fullWidth && "w-full",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          {showIcon && (
            <motion.div
              initial={{ rotate: 0 }}
              whileHover={{ rotate: 15 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="h-4 w-4" />
            </motion.div>
          )}
          <span className="font-medium">{children || "بدء محادثة"}</span>
          <motion.div
            initial={{ x: 0 }}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            <Send className="h-3 w-3 opacity-60" />
          </motion.div>
        </div>
      </Button>
    </motion.div>
  );
}

// مكون خاص للملفات الشخصية
interface ProfileChatButtonProps {
  targetUser: User;
  currentUser: User;
  onStartChat: (targetUser: User) => void;
  className?: string;
}

export function ProfileChatButton({
  targetUser,
  currentUser,
  onStartChat,
  className,
}: ProfileChatButtonProps) {
  if (targetUser.id === currentUser.id) {
    return null;
  }

  return (
    <div className={cn("relative group", className)}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
        className="relative"
      >
        <EnhancedStartChatButton
          targetUser={targetUser}
          currentUser={currentUser}
          onStartChat={onStartChat}
          variant="default"
          size="lg"
          fullWidth
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="relative z-10">دردشة الآن</span>
        </EnhancedStartChatButton>
      </motion.div>

      {/* تأثير الخلفية المضيئة */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10" />
    </div>
  );
}

// مكون مصغر للقوائم
interface CompactChatButtonProps {
  targetUser: User;
  currentUser: User;
  onStartChat: (targetUser: User) => void;
  className?: string;
}

export function CompactChatButton({
  targetUser,
  currentUser,
  onStartChat,
  className,
}: CompactChatButtonProps) {
  if (targetUser.id === currentUser.id) {
    return null;
  }

  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onStartChat(targetUser)}
        className={cn(
          "h-8 w-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all duration-200",
          className,
        )}
        title={`دردشة مع ${targetUser.name}`}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
