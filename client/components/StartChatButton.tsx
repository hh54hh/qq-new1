import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";

interface StartChatButtonProps {
  targetUser: User;
  currentUser: User;
  onStartChat: (targetUser: User) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export default function StartChatButton({
  targetUser,
  currentUser,
  onStartChat,
  className,
  variant = "default",
  size = "default",
  showIcon = true,
  children,
}: StartChatButtonProps) {
  // لا نعرض الزر للمستخدم نفسه
  if (targetUser.id === currentUser.id) {
    return null;
  }

  const handleClick = () => {
    onStartChat(targetUser);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "transition-all duration-200",
        variant === "default" &&
          "bg-gradient-to-r from-primary to-golden-600 hover:from-primary/90 hover:to-golden-500 text-primary-foreground border-0 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        className,
      )}
    >
      {showIcon && <MessageCircle className="h-4 w-4 mr-2" />}
      {children || "دردشة"}
    </Button>
  );
}
