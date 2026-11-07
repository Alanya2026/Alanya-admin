/**
 * Empreintes des copies signées de documents sensibles. Pur, partagé par la
 * page d'enquête, la fiche d'un compte et le journal.
 *
 * Même règle que le serveur (`utils/documentSensible.normaliseEmpreinte`) et
 * l'application (`Empreinte.pourServeur`) : 32 caractères hexadécimaux,
 * espaces, tirets et casse indifférents.
 */

import type { CompteStatut, GesteSensible } from "@/types";

/** Hex minuscule de 32 caractères, ou null si la saisie n'en est pas une. */
export function normaliserEmpreinte(saisie: string | null | undefined): string | null {
  const brut = String(saisie ?? "").replace(/[\s-]/g, "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(brut) ? brut : null;
}

/** « 3f9a 0c1e 5b7d … » : groupes de quatre, comme sur la copie. */
export function formaterEmpreinte(empreinte: string): string {
  return empreinte.replace(/[\s-]/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");
}

/** Mise en forme pendant la saisie : on garde l'hexadécimal, on regroupe. */
export function saisieEmpreinte(saisie: string): string {
  return formaterEmpreinte(saisie.replace(/[^0-9a-fA-F]/g, "").slice(0, 32));
}

/** Motif d'une recherche : trois caractères utiles au moins, comme le serveur. */
export function motifValide(motif: string): boolean {
  return motif.trim().replace(/\s+/g, " ").length >= 3;
}

export const GESTE_LABEL: Record<GesteSensible, string> = {
  CONSULTATION: "Consultation",
  TELECHARGEMENT: "Téléchargement",
  PARTAGE: "Partage",
  TRANSFERT: "Transfert",
};

export const GESTE_CLASS: Record<GesteSensible, string> = {
  CONSULTATION: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  TELECHARGEMENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PARTAGE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  TRANSFERT: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export const gesteLabel = (g: string) => GESTE_LABEL[g as GesteSensible] ?? g;

export const STATUT_LABEL: Record<CompteStatut, string> = {
  actif: "Compte actif",
  banni: "Compte banni",
  suppression_programmee: "Suppression programmée",
  supprime: "Compte supprimé",
};

export const STATUT_CLASS: Record<CompteStatut, string> = {
  actif: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  banni: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  suppression_programmee: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  supprime: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export const ETAT_DOCUMENT_LABEL: Record<string, string> = {
  present: "Message toujours présent",
  supprime: "Message supprimé par son auteur",
  purge: "Message purgé — seule la trace reste",
};

const TYPE_MEDIA: Record<number, string> = { 1: "Image", 2: "Vidéo", 3: "Audio", 4: "Document" };
export const typeMediaLabel = (t: number | null) => (t == null ? "—" : TYPE_MEDIA[t] ?? `Type ${t}`);

export function tailleLisible(octets: number | null): string {
  if (octets == null) return "—";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/** Date et heure à la seconde, heure locale — et l'heure UTC à côté. */
export function dateEnquete(iso: string | null | undefined): { locale: string; utc: string } {
  if (!iso) return { locale: "—", utc: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { locale: "—", utc: "" };
  return {
    locale: d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" }),
    utc: `${d.toISOString().slice(11, 19)} UTC`,
  };
}
