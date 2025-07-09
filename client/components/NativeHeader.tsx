import React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  MoreVertical,
  Search,
  Bell,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  badge?: number;
}

interface NativeHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  actions?: HeaderAction[];
  className?: string;
  transparent?: boolean;
  large?: boolean;
  searchable?: boolean;
  onSearchClick?: () => void;
}

export default function NativeHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackClick,
  actions = [],
  className,
  transparent = false,
  large = false,
  searchable = false,
  onSearchClick,
}: NativeHeaderProps) {
  const handleBackClick = () => {
    // Add haptic feedback simulation
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }

    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  const renderActions = () => {
    if (actions.length === 0) return null;

    // Show up to 2 actions directly, rest in dropdown
    const directActions = actions.slice(0, 2);
    const dropdownActions = actions.slice(2);

    return (
      <div className="flex items-center gap-1">
        {/* Direct actions */}
        {directActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              onClick={action.onClick}
              className={cn(
                "relative h-9 w-9",
                "native-button touch-manipulation",
                "hover:bg-accent/50",
              )}
            >
              <Icon className="h-5 w-5" />
              {action.badge && action.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {action.badge > 99 ? "99+" : action.badge}
                </span>
              )}
            </Button>
          );
        })}

        {/* Search button if enabled */}
        {searchable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className={cn(
              "h-9 w-9",
              "native-button touch-manipulation",
              "hover:bg-accent/50",
            )}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Dropdown for overflow actions */}
        {dropdownActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  "native-button touch-manipulation",
                  "hover:bg-accent/50",
                )}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {dropdownActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                    {action.badge && action.badge > 0 && (
                      <span className="ml-auto text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                        {action.badge}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "border-b border-border/40",
        "safe-area-top",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-lg native-shadow",
        large ? "pb-4" : "pb-2",
        className,
      )}
    >
      {/* Status bar spacing */}
      <div className="status-bar-height" />

      <div
        className={cn(
          "flex items-center justify-between",
          "px-4",
          large ? "pt-4 pb-2" : "py-3",
        )}
      >
        {/* Left side - Back button */}
        <div className="flex items-center min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className={cn(
                "h-9 w-9 mr-2",
                "native-button touch-manipulation",
                "hover:bg-accent/50",
              )}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}

          {/* Title and subtitle */}
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "font-semibold truncate",
                large ? "text-2xl" : "text-lg",
                "text-foreground",
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        {renderActions()}
      </div>

      {/* Large header additional content space */}
      {large && (
        <div className="px-4 pb-2">
          {/* This space can be used for additional content like search bars, filters, etc. */}
        </div>
      )}
    </header>
  );
}

// Common header configurations
export const HeaderConfigs = {
  home: (onNotificationsClick: () => void, onSettingsClick: () => void) => ({
    title: "حلاقة",
    large: true,
    actions: [
      {
        icon: Bell,
        label: "الإشعارات",
        onClick: onNotificationsClick,
      },
      {
        icon: Settings,
        label: "الإعدادات",
        onClick: onSettingsClick,
      },
    ],
  }),

  messages: () => ({
    title: "الرسائل",
    searchable: true,
    onSearchClick: () => {
      // Handle search
    },
  }),

  booking: () => ({
    title: "الحجوزات",
    showBackButton: true,
  }),

  profile: (onEditClick: () => void) => ({
    title: "الملف الشخصي",
    showBackButton: true,
    actions: [
      {
        icon: Settings,
        label: "تعديل",
        onClick: onEditClick,
      },
    ],
  }),

  detail: (title: string, onMenuClick?: () => void) => ({
    title,
    showBackButton: true,
    actions: onMenuClick
      ? [
          {
            icon: MoreVertical,
            label: "المزيد",
            onClick: onMenuClick,
          },
        ]
      : [],
  }),
};

// Hook for managing header state
export function useNativeHeader() {
  const [headerConfig, setHeaderConfig] = React.useState<NativeHeaderProps>({
    title: "حلاقة",
  });

  const updateHeader = React.useCallback(
    (config: Partial<NativeHeaderProps>) => {
      setHeaderConfig((prev) => ({ ...prev, ...config }));
    },
    [],
  );

  const resetHeader = React.useCallback(() => {
    setHeaderConfig({ title: "حلاقة" });
  }, []);

  return {
    headerConfig,
    updateHeader,
    resetHeader,
  };
}

// Higher-order component for pages with consistent header behavior
interface WithNativeHeaderProps {
  headerConfig: NativeHeaderProps;
  children: React.ReactNode;
}

export function WithNativeHeader({
  headerConfig,
  children,
}: WithNativeHeaderProps) {
  return (
    <div className="app-container">
      <NativeHeader {...headerConfig} />
      <main className="flex-1 native-scroll">{children}</main>
    </div>
  );
}
