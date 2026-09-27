/** Libellés du socle de compte — `users.account_type` / `users.verification_status`. */

/** Rôle d'administration — `users.type_compte`, distinct du genre de compte. */
export const ROLE_LABELS: Record<number, string> = {
  0: "Utilisateur",
  1: "Admin",
  2: "Super Admin",
};

export const ACCOUNT_TYPE_LABELS: Record<number, string> = {
  0: "Personnel",
  1: "Business",
  2: "Officiel",
};

export const VERIFICATION_LABELS: Record<number, string> = {
  0: "Aucune",
  1: "En attente",
  2: "Vérifié",
  3: "Refusé",
  4: "Révoqué",
  5: "Expiré",
};
