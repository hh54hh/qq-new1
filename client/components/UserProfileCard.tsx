import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageCircle,
  Phone,
  Video,
  Star,
  MapPin,
  Calendar,
  Award,
  Users,
} from "lucide-react";
import { User } from "@shared/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import SmartChatButton from "@/components/chat/SmartChatButton";

interface UserProfileCardProps {
  user: User;
  currentUser: User;
  onStartChat: (user: User) => void;
  onStartChatNew?: (userId: string, userName: string) => void;
  onCall?: (user: User) => void;
  onVideoCall?: (user: User) => void;
  className?: string;
  showActions?: boolean;
}

export default function UserProfileCard({
  user,
  currentUser,
  onStartChat,
  onStartChatNew,
  onCall,
  onVideoCall,
  className,
  showActions = true,
}: UserProfileCardProps) {
  const isCurrentUser = user.id === currentUser.id;

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "barber":
        return "حلاق محترف";
      case "customer":
        return "عميل";
      case "admin":
        return "مشرف";
      default:
        return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "متاح الآن";
      case "busy":
        return "مشغول";
      case "offline":
        return "غير متصل";
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "overflow-hidden bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300",
          className,
        )}
      >
        <CardContent className="p-6">
          {/* معلومات المستخدم الأساسية */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                <AvatarImage
                  src={user.avatar_url}
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-golden-600 text-primary-foreground text-xl font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* مؤشر الحالة */}
              <div
                className={cn(
                  "absolute bottom-0 right-0 w-6 h-6 border-2 border-card rounded-full",
                  getStatusColor(user.status || "offline"),
                )}
              ></div>

              {/* علامة التحقق */}
              {user.is_verified && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-foreground truncate">
                  {user.name}
                </h3>
                {user.is_verified && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20 text-xs"
                  >
                    موثق
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="bg-muted/50 text-muted-foreground border-border/50"
                >
                  {getRoleDisplayName(user.role)}
                </Badge>
                <span className="text-sm text-primary font-medium">
                  {getStatusText(user.status || "offline")}
                </span>
              </div>

              {/* معلومات إضافية للحلاقين */}
              {user.role === "barber" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      المستوى {user.level || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-golden-600" />
                    <span className="text-sm text-muted-foreground">
                      {user.points || 0} نقطة
                    </span>
                  </div>
                </div>
              )}

              {/* تاريخ التسجيل */}
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  عضو منذ{" "}
                  {new Date(user.created_at).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* الإحصائيات */}
          {user.role === "barber" && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {Math.floor(Math.random() * 100) + 50}
                </div>
                <div className="text-xs text-muted-foreground">عميل سعيد</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-golden-600">
                  {Math.floor(Math.random() * 5) + 3}.
                  {Math.floor(Math.random() * 10)}
                </div>
                <div className="text-xs text-muted-foreground">تقييم</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {Math.floor(Math.random() * 3) + 1}
                </div>
                <div className="text-xs text-muted-foreground">سنوات خبرة</div>
              </div>
            </div>
          )}

          {/* أزرار التفاعل */}
          {showActions && !isCurrentUser && (
            <div className="flex gap-3">
              {/* زر بدء المحادثة */}
              {onStartChatNew ? (
                <StartChatButton
                  userId={user.id}
                  userName={user.name}
                  onStartChat={onStartChatNew}
                  variant="profile"
                  className="flex-1"
                />
              ) : (
                <Button
                  onClick={() => onStartChat(user)}
                  className="flex-1 bg-gradient-to-r from-primary to-golden-600 hover:from-primary/90 hover:to-golden-500 text-primary-foreground border-0 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  بدء محادثة
                </Button>
              )}

              {/* أزرار الاتصال */}
              <div className="flex gap-2">
                {onCall && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onCall(user)}
                    className="hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all duration-200"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}

                {onVideoCall && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onVideoCall(user)}
                    className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* رسالة للمستخدم الحالي */}
          {isCurrentUser && (
            <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-primary font-medium">
                هذا هو ملفك الشخصي
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
