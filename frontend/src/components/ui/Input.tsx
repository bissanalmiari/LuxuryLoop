import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full px-3.5 py-3 border border-beige bg-white text-sm outline-none focus:border-gold",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
