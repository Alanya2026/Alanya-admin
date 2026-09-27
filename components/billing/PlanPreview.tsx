"use client";

import { formatFcfa, monthlyEquivalent, monthsOffered, periodSuffix, type PricedPlan } from "@/lib/plan-pricing";

/** Indigo et encres de l'application (app_colors.dart) : l'aperçu imite l'écran d'offre. */
const APP_BRAND = "#3F51B5";

interface PlanPreviewProps {
  name: string;
  plan: PricedPlan;
  reference: PricedPlan | null;
  featured: boolean;
}

/**
 * La carte telle qu'elle apparaîtra dans l'écran d'offre de l'application.
 * Couleurs fixes, celles de l'app, quel que soit le thème du panneau : c'est
 * un aperçu d'un autre produit, pas un composant du panneau.
 */
export function PlanPreview({ name, plan, reference, featured }: PlanPreviewProps) {
  const perMonth = monthlyEquivalent(plan);
  const offered = monthsOffered(plan, reference);
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        Aperçu dans l&apos;application
      </p>
      <div
        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[#1A1D23]"
        style={{
          border: `1.5px solid ${featured ? APP_BRAND : "#E2E5EC"}`,
          boxShadow: featured ? "0 0 0 3px rgba(63,81,181,.14)" : undefined,
        }}
      >
        <span
          aria-hidden
          className="relative h-[18px] w-[18px] shrink-0 rounded-full"
          style={{ border: `2px solid ${featured ? APP_BRAND : "#CBD0E0"}` }}
        >
          {featured && <span className="absolute inset-[3px] rounded-full" style={{ background: APP_BRAND }} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-sm font-semibold">{name || "Sans nom"}</b>
          {plan.durationMonths > 1 && (
            <span className="text-[11.5px] text-[#5B6273]">soit {formatFcfa(perMonth)} par mois</span>
          )}
          {offered > 0 && (
            <span className="w-fit rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-emerald-600">
              {offered} mois offerts
            </span>
          )}
        </span>
        <span className="whitespace-nowrap text-[15px] font-bold tabular-nums">
          {formatFcfa(plan.priceAmount)}{" "}
          <small className="text-[11px] font-medium text-[#9AA0AE]">{periodSuffix(plan.durationMonths)}</small>
        </span>
      </div>
    </div>
  );
}
