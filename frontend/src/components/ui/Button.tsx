import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-sm transition-colors",
          size === "md" ? "text-sm px-6 py-3" : "text-xs px-4 py-2",
          variant === "primary" && "bg-gold text-charcoal hover:bg-[#B4924E]",
          variant === "outline" && "border border-taupe text-charcoal hover:border-charcoal bg-transparent",
          variant === "ghost" && "text-grayx hover:text-charcoal bg-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
