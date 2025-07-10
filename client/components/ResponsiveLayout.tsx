import React from "react";
import { cn } from "@/lib/utils";

// Hook for responsive breakpoints
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<string>("mobile");

  React.useEffect(() => {
    const getBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 475) return "mobile-s";
      if (width < 640) return "mobile";
      if (width < 768) return "tablet";
      if (width < 1024) return "laptop";
      if (width < 1280) return "desktop";
      if (width < 1536) return "xl";
      return "2xl";
    };

    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint());
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);

    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  const isMobile = breakpoint === "mobile-s" || breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const isDesktop = !isMobile && !isTablet;

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isSmall: isMobile || isTablet,
    isLarge: isDesktop,
  };
}

// Responsive container component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  center?: boolean;
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = "2xl",
  padding = "md",
  center = true,
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "px-2 sm:px-4",
    md: "px-4 sm:px-6 lg:px-8",
    lg: "px-6 sm:px-8 lg:px-12",
  };

  return (
    <div
      className={cn(
        "w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        center && "mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    xl?: number;
  };
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

export function ResponsiveGrid({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3, xl: 4 },
  gap = "md",
}: ResponsiveGridProps) {
  const getGridCols = (count: number) => {
    const colsMap: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      7: "grid-cols-7",
      8: "grid-cols-8",
      9: "grid-cols-9",
      10: "grid-cols-10",
      11: "grid-cols-11",
      12: "grid-cols-12",
    };
    return colsMap[count] || "grid-cols-1";
  };

  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  };

  return (
    <div
      className={cn(
        "grid",
        getGridCols(cols.mobile || 1),
        cols.tablet && `tablet:${getGridCols(cols.tablet)}`,
        cols.desktop && `laptop:${getGridCols(cols.desktop)}`,
        cols.xl && `xl:${getGridCols(cols.xl)}`,
        gapClasses[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  size?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  weight?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  align?: {
    mobile?: "left" | "center" | "right";
    tablet?: "left" | "center" | "right";
    desktop?: "left" | "center" | "right";
  };
}

export function ResponsiveText({
  children,
  className,
  size = { mobile: "text-base", tablet: "text-lg", desktop: "text-xl" },
  weight,
  align,
}: ResponsiveTextProps) {
  const getAlignClass = (alignment: string) => {
    const alignMap = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };
    return alignMap[alignment as keyof typeof alignMap] || "";
  };

  return (
    <div
      className={cn(
        size.mobile,
        size.tablet && `tablet:${size.tablet}`,
        size.desktop && `laptop:${size.desktop}`,
        weight?.mobile,
        weight?.tablet && `tablet:${weight.tablet}`,
        weight?.desktop && `laptop:${weight.desktop}`,
        align?.mobile && getAlignClass(align.mobile),
        align?.tablet && `tablet:${getAlignClass(align.tablet)}`,
        align?.desktop && `laptop:${getAlignClass(align.desktop)}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

// Responsive visibility component
interface ResponsiveVisibilityProps {
  children: React.ReactNode;
  show?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
  };
  hide?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
  };
  className?: string;
}

export function ResponsiveVisibility({
  children,
  show,
  hide,
  className,
}: ResponsiveVisibilityProps) {
  const getVisibilityClasses = () => {
    const classes = [];

    if (show?.mobile === false || hide?.mobile === true) {
      classes.push("hidden");
    }
    if (show?.mobile === true) {
      classes.push("block");
    }

    if (show?.tablet === false || hide?.tablet === true) {
      classes.push("tablet:hidden");
    }
    if (show?.tablet === true) {
      classes.push("tablet:block");
    }

    if (show?.desktop === false || hide?.desktop === true) {
      classes.push("laptop:hidden");
    }
    if (show?.desktop === true) {
      classes.push("laptop:block");
    }

    return classes;
  };

  return (
    <div className={cn(...getVisibilityClasses(), className)}>{children}</div>
  );
}

// Safe area wrapper for mobile devices
interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function SafeAreaWrapper({
  children,
  className,
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaWrapperProps) {
  return (
    <div
      className={cn(
        top && "pt-safe-top",
        bottom && "pb-safe-bottom",
        left && "pl-safe-left",
        right && "pr-safe-right",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Responsive spacing component
interface ResponsiveSpacingProps {
  className?: string;
  size?: {
    mobile?: "xs" | "sm" | "md" | "lg" | "xl";
    tablet?: "xs" | "sm" | "md" | "lg" | "xl";
    desktop?: "xs" | "sm" | "md" | "lg" | "xl";
  };
  type?: "padding" | "margin" | "gap";
  direction?:
    | "all"
    | "horizontal"
    | "vertical"
    | "top"
    | "bottom"
    | "left"
    | "right";
}

export function ResponsiveSpacing({
  className,
  size = { mobile: "md", tablet: "lg", desktop: "xl" },
  type = "padding",
  direction = "all",
}: ResponsiveSpacingProps) {
  const getSizeValue = (sizeKey: string) => {
    const sizeMap = {
      xs: "2",
      sm: "4",
      md: "6",
      lg: "8",
      xl: "12",
    };
    return sizeMap[sizeKey as keyof typeof sizeMap] || "6";
  };

  const getDirectionPrefix = () => {
    const prefixMap = {
      all: type === "padding" ? "p" : type === "margin" ? "m" : "gap",
      horizontal:
        type === "padding" ? "px" : type === "margin" ? "mx" : "gap-x",
      vertical: type === "padding" ? "py" : type === "margin" ? "my" : "gap-y",
      top: type === "padding" ? "pt" : type === "margin" ? "mt" : "gap-t",
      bottom: type === "padding" ? "pb" : type === "margin" ? "mb" : "gap-b",
      left: type === "padding" ? "pl" : type === "margin" ? "ml" : "gap-l",
      right: type === "padding" ? "pr" : type === "margin" ? "mr" : "gap-r",
    };
    return prefixMap[direction] || "p";
  };

  const prefix = getDirectionPrefix();

  const classes = [
    `${prefix}-${getSizeValue(size.mobile)}`,
    size.tablet && `tablet:${prefix}-${getSizeValue(size.tablet)}`,
    size.desktop && `laptop:${prefix}-${getSizeValue(size.desktop)}`,
  ].filter(Boolean);

  return <div className={cn(...classes, className)} />;
}

// Layout debug component (development only)
export function LayoutDebugger() {
  const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
      <div>Breakpoint: {breakpoint}</div>
      <div>Mobile: {isMobile ? "✅" : "❌"}</div>
      <div>Tablet: {isTablet ? "✅" : "❌"}</div>
      <div>Desktop: {isDesktop ? "✅" : "❌"}</div>
      <div>
        Screen: {window.innerWidth}x{window.innerHeight}
      </div>
    </div>
  );
}

// Higher-order component for responsive behavior
interface WithResponsiveProps {
  children: (props: ReturnType<typeof useBreakpoint>) => React.ReactNode;
}

export function WithResponsive({ children }: WithResponsiveProps) {
  const breakpointProps = useBreakpoint();
  return <>{children(breakpointProps)}</>;
}
