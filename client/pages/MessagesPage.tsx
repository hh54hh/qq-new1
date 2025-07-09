import { User } from "@shared/api";
import ChatManager from "@/components/chat/ChatManager";

interface MessagesPageProps {
  user: User;
  onBack: () => void;
  targetUser?: User; // إذا تم توفيره، سيبدأ محادثة مع هذا المستخدم
}

export default function MessagesPage({
  user,
  onBack,
  targetUser,
}: MessagesPageProps) {
  return <ChatManager user={user} onBack={onBack} targetUser={targetUser} />;
}
