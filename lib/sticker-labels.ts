/**
 * Libellés et repères de l'écosystème sticker, partagés par les écrans
 * d'administration.
 *
 * Les codes numériques viennent de la base (cf. CONTRAT-STICKERS.md §2). Ils ne
 * se renomment jamais : ce fichier ne fait que leur donner un texte lisible.
 */

import {
  CONTENT_LOCALES,
  FALLBACK_CHAIN,
  type ContentLocale,
  type Translations,
} from "@/lib/content-locales";
import type { StickerPackStatus, StickerPackVisibility } from "@/types";

/** `sticker_pack.status`. */
export const STICKER_PACK_STATUS_LABEL: Record<StickerPackStatus, string> = {
  0: "Brouillon",
  1: "Publié",
  2: "Archivé",
};

export const STICKER_PACK_STATUS_STYLE: Record<StickerPackStatus, string> = {
  0: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  2: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
};

/** `sticker_pack.visibility`. Aucun écran ne la modifie : elle se lit. */
export const STICKER_VISIBILITY_LABEL: Record<StickerPackVisibility, string> = {
  0: "Officiel",
  1: "Privé",
  2: "Lien",
};

/** Stickers valides au minimum pour publier un pack (plan §8). */
export const STICKER_PACK_MIN = 8;

/** Plafond d'un envoi multiple (plan §6.4). */
export const STICKER_UPLOAD_MAX = 40;

/** Format attendu à l'upload : PNG ou WebP 512×512 (contrat §8). */
export const STICKER_FILE_ACCEPT = "image/png,image/webp,.png,.webp";

/**
 * Locale dont la valeur servirait un champ vide, ou `null` si aucune.
 *
 * Miroir de la chaîne de repli du contrat §3 — langue demandée → `en` → `fr`.
 * Sert au placeholder « repli : fr » : on nomme la langue qui sera réellement
 * affichée à l'utilisateur, pas une règle générale qui serait fausse pour le
 * chinois quand l'anglais est rempli.
 */
export function fallbackLocaleOf(
  translations: Translations | null | undefined,
  locale: ContentLocale,
): ContentLocale | null {
  if (translations?.[locale]?.trim()) return null;
  const ordered: ContentLocale[] = [
    locale,
    ...FALLBACK_CHAIN.filter((l) => l !== locale),
    ...CONTENT_LOCALES,
  ];
  const seen = new Set<ContentLocale>();
  for (const l of ordered) {
    if (seen.has(l)) continue;
    seen.add(l);
    if (translations?.[l]?.trim()) return l;
  }
  return null;
}

/** Placeholder d'un champ vide : « repli : fr », ou vide si aucun repli. */
export function fallbackPlaceholder(
  translations: Translations | null | undefined,
  locale: ContentLocale,
): string {
  const source = fallbackLocaleOf(translations, locale);
  return source ? `repli : ${source}` : "";
}

/** Motifs de signalement (TINYINT `sticker_report.reason`). */
const STICKER_REPORT_REASON_LABEL: Record<number, string> = {
  0: "Autre",
  1: "Contenu sexuel",
  2: "Violence",
  3: "Discours haineux",
  4: "Spam",
  5: "Droits d'auteur",
};

/** Libellé d'un motif, entier ou déjà textuel ; repli explicite sinon. */
export function stickerReportReasonLabel(reason: number | string): string {
  if (typeof reason === "number") {
    return STICKER_REPORT_REASON_LABEL[reason] ?? `Motif ${reason}`;
  }
  return reason;
}

/** `sticker_report.status`. */
export function stickerReportStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "À traiter";
    case 1:
      return "Retiré";
    case 2:
      return "Classé";
    default:
      return `Statut ${status}`;
  }
}

/** Poids lisible d'un sticker ; « — » quand le serveur ne le donne pas. */
export function formatOctets(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(0)} Ko`;
}
