import { ReactNode, useState, useEffect } from "react";
import {
  Home,
  Search,
  Users,
  Calendar,
  User,
  Scissors,
  PlusCircle,
  MessageCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { User as UserType, UserRole } from "@shared/api";
import { useAppStore } from "@/lib/store";
import LocationBar from "./LocationBar";
import apiClient from "@/lib/api";

interface LayoutProps {
  children: ReactNode;
  user: UserType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  onShowNotifications?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "الرئيس��ة",
    icon: Home,
    roles: ["customer", "barber", "admin"],
  },
  {
    id: "search",
    label: "استكشاف",
    icon: Search,
    roles: ["customer"],
  },
  {
    id: "bookings",
    label: "حجوزات",
    icon: Calendar,
    roles: ["customer"],
  },
  {
    id: "messages",
    label: "المحادثات",
    icon: MessageCircle,
    roles: ["customer", "barber"],
  },
  {
    id: "requests",
    label: "طلبات",
    icon: MessageCircle,
    roles: ["barber"],
  },
  {
    id: "new-post",
    label: "منشور",
    icon: PlusCircle,
    roles: ["barber"],
  },
  {
    id: "profile",
    label: "ملفي",
    icon: User,
    roles: ["customer", "barber", "admin"],
  },
];

export default function Layout({
  children,
  user,
  activeTab,
  onTabChange,
  onLogout,
  onShowNotifications,
}: LayoutProps) {
  const [state] = useAppStore();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageLoadErrors, setMessageLoadErrors] = useState(0);
  const unreadNotifications = state.notifications.filter((n) => !n.read).length;
  const isOnline = useNetworkStatus();

  // Load unread message count with better error handling
  useEffect(() => {
    const loadUnreadCount = async () => {
      // لا تحمّل إذا لم يكن هناك اتصال
      if (!isOnline) {
        return;
      }

      try {
        const response = await apiClient.getUnreadMessageCount();
        setUnreadMessages(response.count || 0);
        setMessageLoadErrors(0); // إعادة تعيين عداد الأخطاء
      } catch (error: any) {
        setMessageLoadErrors((prev) => prev + 1);

        // طباعة أقل للأخطاء المتكررة ومعالجة أفضل
        if (messageLoadErrors < 2) {
          console.warn(
            `���️ فشل تحميل عدد الرسائل (${messageLoadErrors + 1}/3):`,
            error?.message || "خطأ غير معروف",
          );
        }

        // If too many errors, stop trying
        if (messageLoadErrors >= 5) {
          console.warn(
            "🚫 تم إيقاف محاولات تحميل عدد الرسائل بسبب الأخطاء المتكررة",
          );
          return;
        }
      }
    };

    if (isOnline) {
      loadUnreadCount();
    }

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const userNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  const getLevelIcon = (level: number) => {
    if (level >= 100) return "🟠"; // VIP
    if (level >= 51) return "🟡"; // Golden
    if (level >= 21) return "🔹"; // Professional
    return "🔸"; // Beginner
  };

  const getLevelLabel = (level: number) => {
    if (level >= 100) return "VIP";
    if (level >= 51) return "ذهبي";
    if (level >= 21) return "محترف";
    return "مبتدئ";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-golden-600 rounded-lg flex items-center justify-center">
              <Scissors className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                حلاقة
              </h1>
              <LocationBar compact className="hidden sm:block" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user.role === "barber" && (
              <div className="hidden xs:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-xs">{getLevelIcon(user.level)}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  {getLevelLabel(user.level)}
                </span>
                <span className="text-primary font-medium">{user.points}</span>
              </div>
            )}

            {onShowNotifications && (
              <button
                onClick={onShowNotifications}
                className="relative p-1.5 sm:p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-1 sm:gap-2">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/20 to-golden-600/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-foreground">
                    {user.name ? user.name.charAt(0) : "م"}
                  </span>
                </div>
              )}
              <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:block truncate max-w-20">
                {user.name}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1 sm:ml-2"
                  title="تسجيل خ��وج"
                >
                  خروج
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 min-h-[calc(100vh-80px)] w-full max-w-full overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border/50 px-1 sm:px-2 py-2 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg transition-all duration-200 min-w-[50px] sm:min-w-[60px]",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5",
                      isActive && "scale-110",
                    )}
                  />
                  {/* شارة الرسائل غير المقروءة */}
                  {item.id === "messages" && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-4">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
