/**
 * Libellés et dates de l'abonnement, partagés par les pages Paiements,
 * Abonnés et la carte « Abonnement et coche ». Purs : testés sans navigateur.
 */

import type { BillingPaymentProduct, BillingPaymentStatus, BillingPlan } from "@/types";

export const PAYMENT_STATUS_LABEL: Record<BillingPaymentStatus, string> = {
  created: "Créé",
  pending: "En attente",
  succeeded: "Réussi",
  failed: "Échoué",
  expired: "Expiré",
  refunded: "Remboursé",
};

export const PAYMENT_STATUS_CLASS: Record<BillingPaymentStatus, string> = {
  created: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  succeeded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  expired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  refunded: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

/** Motifs d'échec renvoyés par le fournisseur, en clair. */
export const FAILURE_LABEL: Record<string, string> = {
  INSUFFICIENT_FUNDS: "solde insuffisant",
  USER_DECLINED: "refusé sur le téléphone",
  TIMEOUT: "sans réponse",
};

/** Index = `subscription_period.source`. */
export const PERIOD_SOURCE_LABEL = ["Payé", "Essai", "Offert", "Compensation"] as const;

export function channelLabel(channel: string | null | undefined): string {
  if (channel === "orange_money") return "Orange Money";
  if (channel === "mtn_momo") return "MTN MoMo";
  return channel || "—";
}

/** Nom français du plan saisi en administration, sinon son code. */
export function planLabel(code: string | null | undefined, plans?: BillingPlan[]): string {
  if (!code) return "—";
  return plans?.find((p) => p.code === code)?.nameI18n?.fr || code;
}

/** Ce qu'a acheté un paiement : le plan, ou le numéro choisi, qui n'en a pas. */
export function paymentItemLabel(
  row: { product?: BillingPaymentProduct; plan: string | null },
  plans?: BillingPlan[],
): string {
  if (row.product === "phone") return "Numéro Alanya";
  return planLabel(row.plan, plans);
}

export const fmtDay = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** [date] + [months] mois, jour ramené à la fin du mois — comme le serveur. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Début d'une période ajoutée maintenant : à la suite de l'abonnement en
 * cours, jamais avant la fin de la grâce (paymentRules.nextPeriodStart).
 */
export function nextPeriodStart(
  now: Date,
  currentEnd?: string | null,
  graceUntil?: string | null,
): Date {
  const t = (v?: string | null) => {
    const n = v ? new Date(v).getTime() : NaN;
    return Number.isNaN(n) ? -Infinity : n;
  };
  return new Date(Math.max(now.getTime(), t(currentEnd), t(graceUntil)));
}
