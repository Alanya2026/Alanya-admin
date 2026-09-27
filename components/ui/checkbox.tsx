import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Case à cocher native, aux couleurs du panneau. Native à dessein : la forme
 * reste celle du système (et donc reconnue), `accent-color` suffit à la teinter.
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-indigo-600",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
