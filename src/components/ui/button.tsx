import { cn } from "../../lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "outline";
}

export function Button({ size = "md", variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        variant === "primary" && "bg-[#002147] text-white hover:bg-[#001530]",
        variant === "ghost"   && "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]",
        variant === "outline" && "border border-[#E2E8F0] text-[#475569] hover:border-[#94A3B8] hover:text-[#0F172A]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
