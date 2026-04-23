import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "hover:scale-[1.02] active:scale-[0.98]",
          // Variant styles
          variant === "primary" &&
            "bg-amber-500 hover:bg-amber-400 text-slate-900",
          variant === "secondary" &&
            "bg-slate-700 hover:bg-slate-600 text-white border border-white/10",
          variant === "ghost" &&
            "bg-transparent hover:bg-slate-800 text-slate-300",
          variant === "destructive" &&
            "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30",
          // Size styles
          size === "sm" && "px-4 py-2 text-sm",
          size === "md" && "px-6 py-3 text-base",
          size === "lg" && "px-8 py-4 text-lg",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };