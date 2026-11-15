/**
 * Traduction des permissions d'administration en français courant.
 *
 * L'API renvoie des codes techniques (`stats.read`, `users.ban`, …) : ils sont
 * stables et pratiques pour le serveur, mais illisibles pour qui n'a pas écrit
 * la route. Cette table donne à chaque code un libellé compréhensible et le
 * range dans un groupe métier, de sorte que la page profil puisse répondre à
 * « qu'est-ce que je peux faire ? » sans jargon.
 *
 * Chaque permission reste affichée avec son code dans le détail : c'est lui
 * qu'un développeur cherchera dans le code du serveur. Simplement, il ne passe
 * plus en premier.
 *
 * Source des codes : `Alanya-Backend-sensible/src/constants/adminRoles.js`.
 * Un code absent d'ici s'affiche quand même, sous « Autres droits » — un ajout
 * côté serveur ne doit jamais faire disparaître un droit de la page.
 */

export type PermissionGroupId =
  | "comptes"
  | "moderation"
  | "contenus"
  | "pilotage"
  | "systeme"
  | "autres";

export interface PermissionEntry {
  code: string;
  /** Ce que le droit permet, en une phrase sans jargon. */
  label: string;
  group: PermissionGroupId;
  /** Précision utile quand le libellé seul peut se lire de travers. */
  note?: string;
}

export interface PermissionGroup {
  id: PermissionGroupId;
  label: string;
  /** Résumé d'une ligne, affiché sous le titre dans la carte. */
  summary: string;
}

export interface GrantedPermissionGroup extends PermissionGroup {
  permissions: PermissionEntry[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "comptes",
    label: "Comptes",
    summary: "Voir, créer et encadrer les comptes, y compris le vôtre.",
  },
  {
    id: "moderation",
    label: "Modération",
    summary: "Traiter les signalements et retirer les contenus problématiques.",
  },
  {
    id: "contenus",
    label: "Contenus & diffusion",
    summary: "Consulter les contenus et préparer les messages officiels.",
  },
  {
    id: "pilotage",
    label: "Pilotage",
    summary: "Suivre l'activité, exporter des données et gérer l'abonnement.",
  },
  {
    id: "systeme",
    label: "Système & sécurité",
    summary: "Réglages sensibles, sauvegardes et purges de données.",
  },
  {
    id: "autres",
    label: "Autres droits",
    summary: "Droits accordés qui n'ont pas encore de description ici.",
  },
];

export const PERMISSIONS: PermissionEntry[] = [
  // ── Comptes ──
  {
    code: "users.read",
    label: "Voir la fiche des membres",
    note: "Consulter les profils, l'activité et l'historique d'un compte.",
    group: "comptes",
  },
  { code: "users.create", label: "Créer un compte", group: "comptes" },
  {
    code: "users.phone",
    label: "Modifier le numéro de téléphone d'un membre",
    group: "comptes",
  },
  { code: "users.ban", label: "Bannir un membre", group: "comptes" },
  { code: "users.unban", label: "Lever un bannissement", group: "comptes" },
  {
    code: "users.role",
    label: "Changer le rôle d'un membre",
    note: "Faire passer un compte en administrateur, ou l'inverse.",
    group: "comptes",
  },
  {
    code: "users.socle",
    label: "Corriger les informations de base d'un compte",
    note: "Genre, année de naissance et ville déclarés à l'inscription.",
    group: "comptes",
  },
  {
    code: "users.delete",
    label: "Supprimer définitivement un compte",
    group: "comptes",
  },
  {
    code: "verifications.read",
    label: "Consulter les dossiers d'identité",
    note: "Pièces envoyées par un membre pour prouver son identité.",
    group: "comptes",
  },
  {
    code: "verifications.decide",
    label: "Valider ou refuser une identité",
    group: "comptes",
  },
  { code: "official.read", label: "Voir les comptes officiels", group: "comptes" },
  { code: "official.create", label: "Créer un compte officiel", group: "comptes" },
  {
    code: "profile.read",
    label: "Voir votre propre profil",
    note: "Afficher vos informations d'administrateur.",
    group: "comptes",
  },
  { code: "profile.update", label: "Modifier vos informations", group: "comptes" },
  { code: "profile.password", label: "Changer votre mot de passe", group: "comptes" },

  // ── Modération ──
  { code: "reports.read", label: "Voir les signalements", group: "moderation" },
  {
    code: "reports.handle",
    label: "Traiter un signalement",
    note: "Classer, masquer ou sanctionner après examen.",
    group: "moderation",
  },
  { code: "media.delete", label: "Supprimer un média signalé", group: "moderation" },
  {
    code: "meetings.end",
    label: "Terminer une réunion en cours",
    group: "moderation",
  },
  { code: "meetings.delete", label: "Supprimer une réunion", group: "moderation" },
  { code: "groups.delete", label: "Supprimer un groupe", group: "moderation" },
  {
    code: "stickers.moderate",
    label: "Retirer un sticker signalé",
    group: "moderation",
  },

  // ── Contenus & diffusion ──
  { code: "groups.read", label: "Voir les groupes", group: "contenus" },
  { code: "media.read", label: "Voir les médias", group: "contenus" },
  { code: "meetings.read", label: "Voir les réunions", group: "contenus" },
  { code: "trips.read", label: "Voir les trajets", group: "contenus" },
  { code: "broadcasts.read", label: "Voir les diffusions", group: "contenus" },
  {
    code: "broadcasts.send",
    label: "Envoyer une diffusion",
    note: "Message adressé à un grand nombre de membres d'un coup.",
    group: "contenus",
  },
  { code: "broadcasts.cancel", label: "Annuler une diffusion", group: "contenus" },
  {
    code: "welcome.read",
    label: "Voir le parcours d'accueil",
    group: "contenus",
  },
  {
    code: "welcome.draft",
    label: "Préparer un brouillon d'accueil",
    group: "contenus",
  },
  {
    code: "welcome.publish",
    label: "Publier le parcours d'accueil",
    group: "contenus",
  },
  {
    code: "welcome.backfill",
    label: "Appliquer l'accueil aux comptes déjà inscrits",
    group: "contenus",
  },
  {
    code: "welcome.status",
    label: "Suivre l'avancement de l'accueil",
    group: "contenus",
  },
  {
    code: "ai.editorial",
    label: "Faire relire un texte par l'assistance",
    note: "Traduction ou reformulation d'un contenu officiel avant publication.",
    group: "contenus",
  },
  { code: "stickers.read", label: "Voir les packs de stickers", group: "contenus" },
  { code: "stickers.write", label: "Préparer un pack de stickers", group: "contenus" },
  {
    code: "stickers.publish",
    label: "Publier un pack de stickers",
    group: "contenus",
  },
  {
    code: "stickers.settings",
    label: "Régler le lancement des stickers",
    group: "contenus",
  },

  // ── Pilotage ──
  { code: "stats.read", label: "Voir les statistiques", group: "pilotage" },
  {
    code: "users.export",
    label: "Exporter la liste des membres",
    note: "Contient des données personnelles : à manipuler avec précaution.",
    group: "pilotage",
  },
  { code: "analytics.export", label: "Exporter les statistiques", group: "pilotage" },
  {
    code: "audit.read",
    label: "Consulter le journal des actions",
    note: "Qui a fait quoi, et à quel moment.",
    group: "pilotage",
  },
  {
    code: "billing.read",
    label: "Voir l'abonnement et les offres",
    group: "pilotage",
  },
  {
    code: "billing.settings",
    label: "Régler l'abonnement payant",
    note: "Active ou coupe le paiement pour tous les comptes à la fois.",
    group: "pilotage",
  },
  { code: "billing.plans", label: "Gérer les offres et les prix", group: "pilotage" },
  { code: "billing.gift", label: "Offrir un abonnement", group: "pilotage" },
  {
    code: "billing.codes",
    label: "Générer ou annuler des codes d'activation",
    group: "pilotage",
  },

  // ── Système & sécurité ──
  { code: "settings.read", label: "Voir les réglages", group: "systeme" },
  { code: "settings.write", label: "Modifier les réglages", group: "systeme" },
  { code: "villes.read", label: "Voir les villes disponibles", group: "systeme" },
  { code: "phones.read", label: "Voir les numéros réservés", group: "systeme" },
  { code: "phones.reserve", label: "Réserver un numéro", group: "systeme" },
  { code: "phones.release", label: "Libérer un numéro", group: "systeme" },
  { code: "safebox.read", label: "Voir le coffre-fort", group: "systeme" },
  {
    code: "safebox.settings",
    label: "Régler l'espace du coffre-fort",
    group: "systeme",
  },
  {
    code: "safebox.delete",
    label: "Supprimer un fichier du coffre-fort",
    note: "Suppression définitive, sans copie de secours.",
    group: "systeme",
  },
  { code: "purges.read", label: "Voir les purges de données", group: "systeme" },
  { code: "purges.run", label: "Lancer une purge", group: "systeme" },
  { code: "purges.settings", label: "Régler les purges", group: "systeme" },
  {
    code: "backup.keys",
    label: "Faire tourner les clés de sauvegarde",
    note: "Une erreur rend illisibles les sauvegardes déjà déposées.",
    group: "systeme",
  },
  { code: "trips.purge", label: "Purger les trajets", group: "systeme" },
];

export const PERMISSIONS_BY_CODE: Record<string, PermissionEntry> = Object.fromEntries(
  PERMISSIONS.map((permission) => [permission.code, permission]),
);

/** Libellé simple d'un code, avec repli lisible pour un droit inconnu. */
export function describePermission(code: string): PermissionEntry {
  return (
    PERMISSIONS_BY_CODE[code] ?? {
      code,
      label: "Droit sans description",
      group: "autres",
      note: "Ce droit existe côté serveur mais n'est pas encore décrit dans le panneau.",
    }
  );
}

/**
 * Regroupe les droits effectivement accordés, dans l'ordre des groupes définis
 * plus haut. Les groupes vides sont omis : la carte ne montre que ce qui est
 * réellement permis.
 */
export function groupGrantedPermissions(codes: string[]): GrantedPermissionGroup[] {
  const unique = Array.from(new Set(codes));
  const granted = unique.map(describePermission);

  return PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: granted
      .filter((permission) => permission.group === group.id)
      .sort((a, b) => PERMISSIONS.indexOf(a) - PERMISSIONS.indexOf(b)),
  })).filter((group) => group.permissions.length > 0);
}
