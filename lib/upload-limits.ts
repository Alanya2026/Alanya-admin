/**
 * Poids maximal d'un média officiel (diffusion, statut d'accueil), en octets.
 *
 * Aligné sur `MEDIA_MAX_BYTES` du backend (`src/middleware/upload.js`). nginx
 * laisse passer jusqu'à 105 Mo, pour couvrir l'enveloppe du formulaire : c'est
 * le backend qui tranche, avec un refus lisible.
 */
export const MEDIA_MAX_BYTES = 100 * 1024 * 1024;

/**
 * Délai sans progression au-delà duquel un envoi est abandonné.
 *
 * Un délai d'inactivité, pas une durée totale : 100 Mo sur une connexion lente
 * prennent plusieurs minutes, et c'est normal. Après le dernier octet, le même
 * délai couvre le dépôt du fichier chez Backblaze par le backend.
 */
export const UPLOAD_STALL_TIMEOUT_MS = 120_000;

export interface StallGuard {
  /** À passer à la requête : déclenché quand l'envoi est jugé bloqué. */
  readonly signal: AbortSignal;
  /** Un morceau vient de partir : le compte à rebours repart de zéro. */
  tick(): void;
  /** L'envoi est terminé (réussi ou non) : plus rien à surveiller. */
  stop(): void;
  /** `true` une fois l'envoi jugé bloqué. */
  readonly stalled: boolean;
}

/** Surveille un envoi et l'interrompt s'il cesse d'avancer. */
export function createStallGuard(stallMs = UPLOAD_STALL_TIMEOUT_MS): StallGuard {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    if (controller.signal.aborted) return;
    timer = setTimeout(() => controller.abort(), stallMs);
  };
  arm();
  return {
    signal: controller.signal,
    tick: arm,
    stop: () => clearTimeout(timer),
    get stalled() {
      return controller.signal.aborted;
    },
  };
}
