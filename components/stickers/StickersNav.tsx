"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Sous-navigation des stickers. Des liens, pas des onglets : chaque section a
 * son adresse. Le trait souligné reprend celui des onglets de page
 * (`components/ui/tabs.tsx`) et de l'abonnement (`BillingNav`).
 *
 * Chaque entrée porte la permission de sa page : une section réservée
 * (réglages au super-admin, modération aux modérateurs) disparaît pour qui n'y
 * a pas droit, plutôt que de mener à un 403.
 */
const ITEMS: { href: string; label: string; permission: string }[] = [
  { href: "/stickers", label: "Packs", permission: "stickers.read" },
  { href: "/stickers/reglages", label: "Réglages", permission: "stickers.read" },
  { href: "/stickers/signalements", label: "Signalements", permission: "stickers.moderate" },
];

export function StickersNav() {
  const pathname = usePathname();
  const { can } = usePermissions();
  const items = ITEMS.filter((i) => can(i.permission));
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Sections des stickers" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {items.map((item) => {
        // Correspondance exacte : `/stickers` ne doit pas s'allumer sur
        // `/stickers/reglages`.
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-indigo-500 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:border-zinc-700 dark:hover:text-zinc-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
