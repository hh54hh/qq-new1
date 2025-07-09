import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

const nativeButtonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl",
    "text-base font-medium transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "touch-manipulation native-button",
    "active:scale-95",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:no-underline",
        golden:
          "bg-golden-500 text-golden-50 shadow-lg hover:bg-golden-600 active:bg-golden-700",
        glass:
          "glass-effect text-foreground hover:bg-white/20 active:bg-white/30",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-14 px-8 py-4 text-lg",
        xl: "h-16 px-10 py-5 text-xl",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      elevated: {
        true: "shadow-xl",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
      elevated: false,
    },
  },
);

export interface NativeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof nativeButtonVariants> {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  haptic?: "light" | "medium" | "heavy";
}

const NativeButton = React.forwardRef<HTMLButtonElement, NativeButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      elevated,
      loading = false,
      loadingText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      haptic = "light",
      children,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Haptic feedback simulation
      if ("vibrate" in navigator) {
        const vibrationPattern = {
          light: 30,
          medium: 50,
          heavy: 80,
        };
        navigator.vibrate(vibrationPattern[haptic]);
      }

      // Add haptic animation class
      event.currentTarget.classList.add(`haptic-${haptic}`);
      setTimeout(() => {
        event.currentTarget.classList.remove(`haptic-${haptic}`);
      }, 200);

      if (onClick) {
        onClick(event);
      }
    };

    const isIconOnly = !children && (LeftIcon || RightIcon) && !loading;
    const actualSize = isIconOnly
      ? size === "default"
        ? "icon"
        : size === "sm"
          ? "icon-sm"
          : size === "lg"
            ? "icon-lg"
            : size
      : size;

    return (
      <button
        className={cn(
          nativeButtonVariants({
            variant,
            size: actualSize,
            fullWidth,
            elevated,
          }),
          className,
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        )}

        {!loading && LeftIcon && (
          <LeftIcon
            className={cn(
              "h-5 w-5",
              children && "mr-2",
              size === "sm" && "h-4 w-4",
              size === "lg" && "h-6 w-6",
              size === "xl" && "h-7 w-7",
            )}
          />
        )}

        {loading && loadingText ? loadingText : children}

        {!loading && RightIcon && (
          <RightIcon
            className={cn(
              "h-5 w-5",
              children && "ml-2",
              size === "sm" && "h-4 w-4",
              size === "lg" && "h-6 w-6",
              size === "xl" && "h-7 w-7",
            )}
          />
        )}
      </button>
    );
  },
);

NativeButton.displayName = "NativeButton";

// Preset button configurations
export const ButtonPresets = {
  primary: {
    variant: "default" as const,
    size: "default" as const,
    elevated: true,
  },

  secondary: {
    variant: "secondary" as const,
    size: "default" as const,
  },

  danger: {
    variant: "destructive" as const,
    size: "default" as const,
    elevated: true,
  },

  golden: {
    variant: "golden" as const,
    size: "default" as const,
    elevated: true,
  },

  floating: {
    variant: "default" as const,
    size: "icon-lg" as const,
    elevated: true,
    className: "fixed bottom-20 right-4 z-40 shadow-2xl",
  },

  pill: {
    variant: "outline" as const,
    size: "sm" as const,
    className: "rounded-full",
  },
};

// Specialized button components
export function FloatingActionButton({
  children,
  className,
  ...props
}: NativeButtonProps) {
  return (
    <NativeButton
      {...ButtonPresets.floating}
      className={cn(ButtonPresets.floating.className, className)}
      {...props}
    >
      {children}
    </NativeButton>
  );
}

export function PillButton({
  children,
  className,
  ...props
}: NativeButtonProps) {
  return (
    <NativeButton
      {...ButtonPresets.pill}
      className={cn(ButtonPresets.pill.className, className)}
      {...props}
    >
      {children}
    </NativeButton>
  );
}

export function LoadingButton({
  loading,
  loadingText = "جاري التحميل...",
  children,
  ...props
}: NativeButtonProps) {
  return (
    <NativeButton loading={loading} loadingText={loadingText} {...props}>
      {children}
    </NativeButton>
  );
}

// Button group component for related actions
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
  fullWidth?: boolean;
}

export function ButtonGroup({
  children,
  className,
  vertical = false,
  fullWidth = false,
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "flex",
        vertical ? "flex-col space-y-2" : "flex-row space-x-2",
        fullWidth && "w-full",
        className,
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            fullWidth: fullWidth || child.props.fullWidth,
            className: cn(
              child.props.className,
              !vertical && index === 0 && "rounded-r-none",
              !vertical &&
                index > 0 &&
                index < React.Children.count(children) - 1 &&
                "rounded-none",
              !vertical &&
                index === React.Children.count(children) - 1 &&
                "rounded-l-none",
              vertical && index === 0 && "rounded-b-none",
              vertical &&
                index > 0 &&
                index < React.Children.count(children) - 1 &&
                "rounded-none",
              vertical &&
                index === React.Children.count(children) - 1 &&
                "rounded-t-none",
            ),
          });
        }
        return child;
      })}
    </div>
  );
}

export { NativeButton, nativeButtonVariants };
export type { NativeButtonProps };
