"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  toggleClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, toggleClassName, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={clsx(
            "w-full px-3.5 py-3 pr-11 border border-beige bg-white text-sm outline-none focus:border-gold",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className={clsx(
            "absolute right-3 top-1/2 -translate-y-1/2 text-grayx hover:text-charcoal transition-colors",
            toggleClassName
          )}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";