/**
 * Codes d'activation : libellés, export, bornes de saisie. Purs : testés sans
 * navigateur.
 */

import type { BillingCodeStatus, BillingCodesGenerated } from "@/types";

export const CODE_STATUS_LABEL: Record<BillingCodeStatus, string> = {
  available: "Disponible",
  redeemed: "Utilisé",
  expired: "Expiré",
  revoked: "Annulé",
};

export const CODE_STATUS_CLASS: Record<BillingCodeStatus, string> = {
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  redeemed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  expired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  revoked: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** Bornes du lot, les mêmes que le serveur (activationCodes.js). */
export const MAX_BATCH = 200;
export const DEFAULT_VALIDITY_DAYS = 365;
export const MAX_VALIDITY_DAYS = 730;

/** Entier strict : « 12 » passe, « 12,5 » et « abc » non. */
export function parseWhole(v: string): number | null {
  return /^\d+$/.test(v.trim()) ? Number(v.trim()) : null;
}

/** Ce que la saisie du lot a de faux, ou null. */
export function batchError(count: string, validityDays: string): string | null {
  const n = parseWhole(count);
  if (n == null || n < 1 || n > MAX_BATCH) return `Le nombre de codes va de 1 à ${MAX_BATCH}.`;
  const d = parseWhole(validityDays);
  if (d == null || d < 1 || d > MAX_VALIDITY_DAYS) return `La validité va de 1 à ${MAX_VALIDITY_DAYS} jours.`;
  return null;
}

/** Une cellule CSV : entre guillemets dès qu'elle en contient, une virgule ou un retour. */
const cell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Le fichier à remettre à qui vend les codes : un code par ligne, avec ce qu'il
 * vaut et jusqu'à quand. Les codes en clair ne sont lisibles que dans la
 * réponse de la génération — ce fichier est la seule trace qu'on en gardera.
 */
export function codesToCsv(generated: BillingCodesGenerated, label?: string): string {
  const rows = [["code", "libelle", "duree_mois", "prix", "devise", "expire_le"]];
  for (const c of generated.codes) {
    rows.push([
      c.code,
      label ?? "",
      String(generated.plan?.durationMonths ?? ""),
      String(generated.plan?.price ?? ""),
      generated.plan?.currency ?? "",
      generated.expiresAt.slice(0, 10),
    ]);
  }
  return `${rows.map((r) => r.map(cell).join(",")).join("\n")}\n`;
}

/** Nom du fichier d'export : daté, sans caractère douteux dans le libellé. */
export function csvFileName(label: string | undefined, now: Date = new Date()): string {
  const slug = (label ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `codes-alanya-${now.toISOString().slice(0, 10)}${slug ? `-${slug}` : ""}.csv`;
}
