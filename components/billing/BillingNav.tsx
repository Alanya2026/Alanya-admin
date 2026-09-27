"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/billing", label: "Réglages" },
  { href: "/billing/plans", label: "Plans" },
  { href: "/billing/payments", label: "Paiements" },
  { href: "/billing/subscribers", label: "Abonnés" },
];

/**
 * Sous-navigation de l'abonnement. Des liens, pas des onglets : chaque section
 * a son adresse, qu'on peut partager ou rouvrir. Le trait souligné reprend
 * celui des onglets de page (components/ui/tabs.tsx) pour qu'on lise « changer
 * de section », pas « basculer un réglage ».
 */
export function BillingNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections de l'abonnement" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {ITEMS.map((item) => {
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
