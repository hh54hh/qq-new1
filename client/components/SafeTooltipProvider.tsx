import React, { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

interface SafeTooltipProviderProps {
  children: ReactNode;
}

export default function SafeTooltipProvider({
  children,
}: SafeTooltipProviderProps) {
  try {
    // Verify React hooks are available
    if (!React || !React.useState) {
      console.error("React hooks not available, falling back to plain wrapper");
      return <div className="safe-tooltip-fallback">{children}</div>;
    }

    return <TooltipProvider>{children}</TooltipProvider>;
  } catch (error) {
    console.error("TooltipProvider error:", error);

    // Fallback to a simple div wrapper
    return <div className="tooltip-provider-fallback">{children}</div>;
  }
}
