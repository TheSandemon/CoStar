import * as React from "react";
import { cn } from "~/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3",
          "text-white placeholder-slate-500",
          "focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20",
          "transition-colors duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };