"use client";

import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BillingNav } from "./BillingNav";

/**
 * En-tête commun des sections de l'abonnement : titre, phrase de la section,
 * actualisation, puis la sous-navigation.
 */
export function BillingPageHeader({
  subtitle,
  refreshing,
  onRefresh,
}: {
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            Abonnement
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            className="shrink-0"
            aria-label="Actualiser"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        )}
      </div>
      <BillingNav />
    </>
  );
}

/** Rangée de filtres exclusifs, en boutons pressés plutôt qu'en liste déroulante. */
export function FilterChips<T extends string | undefined>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
