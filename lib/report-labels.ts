/** Libellés des signalements — partagés par l'écran dédié et le dashboard. */

export const REPORT_REASON_LABELS: Record<string, string> = {
  harassment: "Harcèlement ou intimidation",
  hate: "Propos haineux",
  violence: "Violence ou menaces",
  sexual: "Contenu sexuel",
  scam: "Arnaque ou fraude",
  spam: "Spam",
  impersonation: "Usurpation d'identité",
  other: "Autre",
};

export function reportReasonLabel(reason: string): string {
  return REPORT_REASON_LABELS[reason] ?? reason;
}
