"use client";

import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const MenuRoot = BaseMenu.Root;

/** Déclencheur — un bouton par défaut, personnalisable via className. */
const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger>
>(function MenuTrigger({ className, ...props }, ref) {
  return (
    <BaseMenu.Trigger
      ref={ref}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        className
      )}
      {...props}
    />
  );
});

/** Contenu du menu, portalé et positionné — fermeture sur Escape/clic extérieur incluse. */
function MenuContent({ className, align = "end", sideOffset = 4, children }: {
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner align={align} sideOffset={sideOffset} className="outline-none">
        <BaseMenu.Popup
          className={cn(
            "min-w-[10rem] overflow-hidden rounded-xl border border-zinc-200/80 bg-white py-1 text-sm text-zinc-800",
            "shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] animate-in fade-in zoom-in-95 duration-150",
            "dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]",
            className
          )}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

const MenuItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item>
>(function MenuItem({ className, ...props }, ref) {
  return (
    <BaseMenu.Item
      ref={ref}
      className={cn(
        "flex cursor-pointer items-center gap-2 w-full px-3 py-2 text-left outline-none transition-colors",
        "data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
});

export { MenuRoot, MenuTrigger, MenuContent, MenuItem };
