/**
 * Libellés des rôles d'administration.
 *
 * `type_compte` vient du serveur : 0 utilisateur, 1 admin, 2 super-admin.
 * Le panneau ne décide de rien ici, il traduit seulement le nombre pour
 * l'afficher. Un type inconnu garde un libellé neutre plutôt que de faire
 * apparaître « undefined » dans le bandeau.
 */
export interface AdminRoleMeta {
  label: string;
  description: string;
}

const ROLES: Record<number, AdminRoleMeta> = {
  0: {
    label: "Utilisateur",
    description: "Compte sans accès à l'administration.",
  },
  1: {
    label: "Administrateur",
    description: "Accès au quotidien : modération, comptes et diffusions.",
  },
  2: {
    label: "Super-administrateur",
    description: "Accès complet, y compris les actions sensibles.",
  },
};

export function adminRole(typeCompte: number): AdminRoleMeta {
  return (
    ROLES[typeCompte] ?? {
      label: "Rôle inconnu",
      description: "Ce type de compte n'a pas de libellé connu.",
    }
  );
}
