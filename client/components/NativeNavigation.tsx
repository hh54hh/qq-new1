import React from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Calendar,
  MessageCircle,
  Bell,
  User,
  Scissors,
  BarChart3,
  Settings,
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  href?: string;
  onClick?: () => void;
}

interface NativeNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: "customer" | "barber" | "admin";
  className?: string;
  unreadMessages?: number;
  unreadNotifications?: number;
}

export default function NativeNavigation({
  activeTab,
  onTabChange,
  userRole,
  className,
  unreadMessages = 0,
  unreadNotifications = 0,
}: NativeNavigationProps) {
  const getNavigationItems = (): NavigationItem[] => {
    const commonItems: NavigationItem[] = [
      {
        id: "home",
        label: "الرئيسية",
        icon: Home,
      },

      {
        id: "notifications",
        label: "الإشعارات",
        icon: Bell,
        badge: unreadNotifications,
      },
    ];

    const roleSpecificItems: NavigationItem[] = [];

    switch (userRole) {
      case "customer":
        roleSpecificItems.push(
          {
            id: "booking",
            label: "حجز",
            icon: Calendar,
          },
          {
            id: "profile",
            label: "الملف الشخصي",
            icon: User,
          },
        );
        break;

      case "barber":
        roleSpecificItems.push(
          {
            id: "services",
            label: "الخدمات",
            icon: Scissors,
          },
          {
            id: "schedule",
            label: "الجدولة",
            icon: Calendar,
          },
        );
        break;

      case "admin":
        roleSpecificItems.push(
          {
            id: "analytics",
            label: "التحليلات",
            icon: BarChart3,
          },
          {
            id: "settings",
            label: "الإعدادات",
            icon: Settings,
          },
        );
        break;
    }

    return [
      ...commonItems.slice(0, 1),
      ...roleSpecificItems,
      ...commonItems.slice(1),
    ];
  };

  const navigationItems = getNavigationItems();

  const handleItemClick = (item: NavigationItem) => {
    // Add haptic feedback simulation
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }

    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.location.href = item.href;
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "safe-area-bottom",
        "native-shadow",
        className,
      )}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-0 flex-1 px-2 py-2",
                "text-xs font-medium",
                "transition-all duration-200 ease-out",
                "touch-manipulation native-button",
                "rounded-lg",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <div className="relative mb-1">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "scale-110",
                  )}
                />

                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1",
                      "min-w-[16px] h-4 px-1",
                      "bg-destructive text-destructive-foreground",
                      "text-xs font-bold rounded-full",
                      "flex items-center justify-center",
                      "bounce-in",
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div
                    className={cn(
                      "absolute -bottom-3 left-1/2 transform -translate-x-1/2",
                      "w-1 h-1 bg-primary rounded-full",
                      "fade-in",
                    )}
                  />
                )}
              </div>

              <span
                className={cn(
                  "truncate max-w-full",
                  "transition-all duration-200",
                  isActive && "font-semibold",
                )}
              >
                {item.label}
              </span>

              {/* Ripple effect container */}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="android-ripple absolute inset-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional safe area spacing */}
      <div className="h-safe-area-bottom" />
    </nav>
  );
}

// Hook for managing navigation state
export function useNativeNavigation(initialTab: string = "home") {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [navigationHistory, setNavigationHistory] = React.useState<string[]>([
    initialTab,
  ]);

  const navigateToTab = React.useCallback((tab: string) => {
    setActiveTab(tab);
    setNavigationHistory((prev) => [...prev.slice(-9), tab]); // Keep last 10 items
  }, []);

  const navigateBack = React.useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousTab = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveTab(previousTab);
      return true;
    }
    return false;
  }, [navigationHistory]);

  const canGoBack = navigationHistory.length > 1;

  return {
    activeTab,
    navigateToTab,
    navigateBack,
    canGoBack,
    navigationHistory,
  };
}

// Navigation transition wrapper component
interface NavigationPageProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "fade";
  className?: string;
}

export function NavigationPage({
  children,
  direction = "fade",
  className,
}: NavigationPageProps) {
  const animationClass = {
    left: "slide-in-left",
    right: "slide-in-right",
    up: "slide-up",
    fade: "fade-in",
  }[direction];

  return (
    <div
      className={cn(
        "w-full h-full",
        "native-scroll",
        animationClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
