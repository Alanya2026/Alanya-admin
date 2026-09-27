/**
 * Logique du badge de compte, sans JSX : le composant
 * (components/account-badge.tsx) l'affiche, les tests la vérifient ici — la
 * configuration Vitest ne transforme pas le JSX.
 */

/** Miroir de `kOfficialSealGold` — account_badge.dart */
export const OFFICIAL_SEAL_GOLD = "#c9a227";

/** Miroir de `kVerifiedIndigo` — account_badge.dart (brandPrimary de l'app). */
export const VERIFIED_INDIGO = "#3F51B5";

export type AccountBadgeKind =
  | "none"
  | "cocheVerifiee"
  | "panierDeclare"
  | "panierVerifie"
  | "officiel";

/** Miroir de `resolveAccountBadge` — account_badge.dart */
export function resolveAccountBadge(
  accountType: number,
  verificationStatus: number,
): AccountBadgeKind {
  if (accountType === 2) return "officiel";
  if (accountType === 1) {
    return verificationStatus === 2 ? "panierVerifie" : "panierDeclare";
  }
  // Compte personnel : la coche n'apparaît que vérifié. Un compte personnel
  // en attente, refusé, révoqué ou expiré n'affiche rien.
  return verificationStatus === 2 ? "cocheVerifiee" : "none";
}

export function isOfficialAlanyaAccount(user: { accountType?: number }) {
  return user.accountType === 2;
}

/**
 * Le sceau festonné des documents de conception : rosace à 12 lobes,
 * r(t) = R + A·cos(12t), dans un viewBox de 24. Un disque plein se confondrait
 * avec un avatar ou une pastille de comptage ; le feston se reconnaît même à
 * 12 px. Échantillonné sans lissage : une courbe lissée transformerait les
 * lobes en pointes.
 */
export function sealPath(R = 10.6, A = 1.25, lobes = 12, steps = 288): string {
  let d = "";
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = R + A * Math.cos(lobes * t);
    d += `${i === 0 ? "M" : "L"}${(12 + r * Math.cos(t)).toFixed(2)} ${(12 + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}
