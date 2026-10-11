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

/**
 * Formats attendus à l'upload : PNG, WebP statique ou WebP animé, 512×512
 * (contrat §8 et §4c). Le WebP animé garde le type `image/webp` : seul son
 * en-tête le distingue (cf. `estWebpAnime`).
 */
export const STICKER_FILE_ACCEPT = "image/png,image/webp,.png,.webp";

/** Entrée d'un statique : 1 Mo (contrat §8) ; le serveur ré-encode ensuite à ≤ 100 Ko. */
export const STICKER_STATIC_INPUT_MAX_BYTES = 1024 * 1024;

/** Poids maximal d'un statique après ré-encodage (contrat §8). */
export const STICKER_STATIC_MAX_BYTES = 100 * 1024;

/** WebP animé final déposé par l'admin : ≤ 300 Ko, ≤ 45 images, ≤ 3 s (contrat §4c). */
export const STICKER_ANIMATED_MAX_BYTES = 300 * 1024;
export const STICKER_ANIMATED_MAX_FRAMES = 45;
export const STICKER_ANIMATED_MAX_MS = 3000;

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

/** Poids lisible (octets sous 1 Ko, sinon Ko) ; « — » quand le serveur ne le donne pas. */
export function formatOctets(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  const ko = bytes / 1024;
  return `${ko.toLocaleString("fr-FR", { maximumFractionDigits: ko < 100 ? 1 : 0 })} Ko`;
}

/** Durée lisible : « 2,4 s » ; « — » quand le serveur ne la donne pas. */
export function formatDuree(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
}

/** Un sticker est animé si le serveur le dit (`1` ou `true`) ; absent = statique. */
export function estAnime(s: { animated?: 0 | 1 | boolean | null }): boolean {
  return s.animated === 1 || s.animated === true;
}

/** « 30 images · 2,4 s » avec ce qui est connu seulement ; chaîne vide sinon. */
export function detailAnimation(s: {
  frames?: number | null;
  durationMs?: number | null;
}): string {
  const parts: string[] = [];
  if (s.frames != null && s.frames > 0) parts.push(`${s.frames} image${s.frames > 1 ? "s" : ""}`);
  if (s.durationMs != null && s.durationMs > 0) parts.push(formatDuree(s.durationMs));
  return parts.join(" · ");
}

/**
 * Vrai si le fichier est un WebP animé : en-tête RIFF/WEBP, puis chunk `VP8X`
 * dont le bit « animation » (0x02) est levé. Ne lit que les 32 premiers octets.
 * Une lecture impossible vaut « statique » : le serveur reste juge.
 */
export async function estWebpAnime(file: File): Promise<boolean> {
  if (file.type !== "image/webp") return false;
  try {
    const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const txt = (o: number, n: number) => String.fromCharCode.apply(null, Array.from(b.slice(o, o + n)));
    return b.length >= 21 && txt(0, 4) === "RIFF" && txt(8, 4) === "WEBP" && txt(12, 4) === "VP8X" && (b[20] & 0x02) !== 0;
  } catch {
    return false;
  }
}

/**
 * Message lisible d'un échec d'envoi. `STICKER_ASSET_INVALID` (422) porte la
 * raison du serveur (format, dimensions, alpha, nombre d'images, durée, poids) :
 * elle est reprise telle quelle, précédée du rappel des limites d'un animé.
 */
export function messageErreurUpload(e: unknown): string {
  const data = (e as { response?: { data?: { error?: unknown; code?: string; details?: unknown } } })?.response
    ?.data;
  const brut = typeof data?.error === "string" ? data.error : e instanceof Error ? e.message : "";
  const details = Array.isArray(data?.details)
    ? data.details
        .map((d) => (typeof d === "string" ? d : typeof (d as { error?: unknown })?.error === "string" ? (d as { error: string }).error : ""))
        .filter(Boolean)
        .join(" ; ")
    : "";
  const raison = [brut, details].filter(Boolean).join(" — ");
  switch (data?.code) {
    case "STICKER_ASSET_INVALID":
      return `Fichier refusé par le serveur${raison ? ` : ${raison}` : ""}. Statique : PNG ou WebP 512×512, alpha obligatoire. Animé : WebP 512×512, ${formatOctets(STICKER_ANIMATED_MAX_BYTES)} au plus, ${STICKER_ANIMATED_MAX_FRAMES} images et ${STICKER_ANIMATED_MAX_MS / 1000} s au plus, en boucle.`;
    case "STICKER_ASSET_BLOCKED":
      return `Image bloquée (empreinte déjà retirée par la modération)${raison ? ` : ${raison}` : ""}.`;
    default:
      return raison || "Erreur inconnue.";
  }
}
