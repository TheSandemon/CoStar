import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "brand" | "ai" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "brand", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          "transition-colors duration-200",
          variant === "brand" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
          variant === "ai" && "bg-violet-500/20 text-violet-400 border border-violet-500/30",
          variant === "success" && "bg-green-500/20 text-green-400 border border-green-500/30",
          variant === "warning" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
          variant === "error" && "bg-red-500/20 text-red-400 border border-red-500/30",
          variant === "info" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };