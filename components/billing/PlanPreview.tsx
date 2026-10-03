"use client";

import { cn } from "@/lib/utils";
import { formatFcfa, monthlyEquivalent, monthsOffered, periodSuffix, type PricedPlan } from "@/lib/plan-pricing";

interface PlanPreviewProps {
  name: string;
  plan: PricedPlan;
  reference: PricedPlan | null;
  featured: boolean;
}

/**
 * La carte telle qu'elle apparaîtra dans l'écran d'offre de l'application.
 * Couleurs de l'app (app_colors.dart, app_theme.dart), claires ou sombres
 * selon le thème du panneau.
 */
export function PlanPreview({ name, plan, reference, featured }: PlanPreviewProps) {
  const perMonth = monthlyEquivalent(plan);
  const offered = monthsOffered(plan, reference);
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Aperçu dans l&apos;application
      </p>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-[#1A1D23] dark:bg-[#181B21] dark:text-[#F2F4F8]",
          featured
            ? "border-[#3F51B5] shadow-[0_0_0_3px_rgba(63,81,181,.14)] dark:border-[#9FA8DA] dark:shadow-[0_0_0_3px_rgba(159,168,218,.16)]"
            : "border-[#E2E5EC] dark:border-[#323742]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "relative h-[18px] w-[18px] shrink-0 rounded-full border-2",
            featured ? "border-[#3F51B5] dark:border-[#9FA8DA]" : "border-[#CBD0E0] dark:border-[#3A404C]",
          )}
        >
          {featured && <span className="absolute inset-[3px] rounded-full bg-[#3F51B5] dark:bg-[#9FA8DA]" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-sm font-semibold">{name || "Sans nom"}</b>
          {plan.durationMonths > 1 && (
            <span className="text-[11.5px] text-[#5B6273] dark:text-[#AAB1C0]">soit {formatFcfa(perMonth)} par mois</span>
          )}
          {offered > 0 && (
            <span className="w-fit rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-emerald-600 dark:bg-[#143726] dark:text-[#1FA363]">
              {offered} mois offerts
            </span>
          )}
        </span>
        <span className="whitespace-nowrap text-[15px] font-bold tabular-nums">
          {formatFcfa(plan.priceAmount)}{" "}
          <small className="text-[11px] font-medium text-[#9AA0AE] dark:text-[#AAB1C0]">{periodSuffix(plan.durationMonths)}</small>
        </span>
      </div>
    </div>
  );
}
