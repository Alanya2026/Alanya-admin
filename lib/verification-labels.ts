/** Libellés des dossiers de vérification. Purs, partagés par la file et l'instruction. */

import type { VerificationRequestStatus } from "@/types";

export const REQUEST_STATUS_LABEL: Record<VerificationRequestStatus, string> = {
  pending: "À instruire",
  document_requested: "Pièce demandée",
  approved: "Approuvé",
  refused: "Refusé",
  cancelled: "Annulé",
  revoked: "Révoqué",
};

export const REQUEST_STATUS_CLASS: Record<VerificationRequestStatus, string> = {
  pending: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  document_requested: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  refused: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  revoked: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function docTypeLabel(docType: number): string {
  if (docType === 1) return "Pièce d'identité";
  if (docType === 4) return "Selfie avec la pièce";
  if (docType === 0) return "Registre du commerce";
  if (docType === 2) return "Justificatif d'adresse";
  return "Pièce";
}

/** Deux noms sont « le même » à la casse et aux espaces près — comme le serveur. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) =>
    String(s ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
  return norm(a) === norm(b);
}

/** Motif d'une décision : trois caractères au moins, comme le serveur. */
export function reasonIsValid(reason: string): boolean {
  return reason.trim().length >= 3;
}
