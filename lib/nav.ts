import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  DatabaseBackup,
  Eraser,
  Fingerprint,
  Flag,
  HandHeart,
  HeartPulse,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Route,
  ScrollText,
  Settings,
  Sticker,
  Users,
  UsersRound,
  Vault,
  Video,
} from "lucide-react";

/**
 * Plan de la barre latérale — stratégie « sections repliables ».
 *
 * Trois vues quotidiennes restent épinglées ; les dix-huit autres se rangent
 * en cinq sections dont celle de la page courante s'ouvre d'elle-même. Le
 * nombre d'entrées visibles au repos passe de 22 à 9.
 *
 * Les permissions sont inchangées : chaque entrée garde celle que la route
 * serveur exige, et une section dont plus rien n'est lisible disparaît.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Clé de mémorisation des sections ouvertes, par navigateur. */
export const NAV_OPEN_STORAGE_KEY = "alanya-admin:nav-open";

/** Les trois destinations du quotidien, toujours à un clic. */
export const PINNED_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "stats.read" },
  { href: "/users", label: "Utilisateurs", icon: Users, permission: "users.read" },
  // Le compteur de la file ouverte se pose à côté de cette entrée (badge).
  { href: "/reports", label: "Signalements", icon: Flag, permission: "reports.read" },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "stats.read" },
      { href: "/geolocation", label: "Géolocalisation", icon: MapPin, permission: "stats.read" },
      // Même permission que les statistiques : une vue du parc, pas un pouvoir
      // de plus. Voir le commentaire d'origine dans le layout.
      { href: "/sante", label: "Santé du service", icon: HeartPulse, permission: "stats.read" },
    ],
  },
  {
    id: "communaute",
    label: "Communauté",
    items: [
      { href: "/groups", label: "Groupes", icon: UsersRound, permission: "groups.read" },
      { href: "/meetings", label: "Réunions", icon: Video, permission: "meetings.read" },
    ],
  },
  {
    id: "contenus",
    label: "Contenus & diffusion",
    items: [
      { href: "/broadcasts", label: "Diffusions", icon: Megaphone, permission: "broadcasts.read" },
      { href: "/welcome", label: "Bienvenue", icon: HandHeart, permission: "welcome.read" },
      { href: "/stickers", label: "Stickers", icon: Sticker, permission: "stickers.read" },
    ],
  },
  {
    id: "confiance",
    label: "Confiance & sécurité",
    items: [
      { href: "/trips", label: "Trajets", icon: Route, permission: "trips.read" },
      { href: "/medias", label: "Médias", icon: ImageIcon, permission: "media.read" },
      {
        href: "/documents-sensibles",
        label: "Documents sensibles",
        icon: Fingerprint,
        permission: "documents.trace",
      },
      { href: "/safebox", label: "Coffre-fort", icon: Vault, permission: "safebox.read" },
    ],
  },
  {
    id: "systeme",
    label: "Système & données",
    items: [
      { href: "/backups", label: "Sauvegardes", icon: DatabaseBackup, permission: "stats.read" },
      { href: "/backup-keys", label: "Clés de sauvegarde", icon: KeyRound, permission: "audit.read" },
      // Permission d'écriture à dessein : la page était réservée au super-admin.
      { href: "/purges", label: "Purges", icon: Eraser, permission: "purges.settings" },
      { href: "/audit", label: "Activité admin", icon: ScrollText, permission: "audit.read" },
      { href: "/settings", label: "Paramètres", icon: Settings, permission: "settings.read" },
    ],
  },
];

/** Posée en bas, séparée : c'est un contrat, pas un outil du quotidien. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/billing", label: "Abonnement", icon: CreditCard, permission: "billing.read" },
];

/**
 * Toutes les destinations de la navigation, hors profil.
 *
 * Sert de garde-fou : un test vérifie qu'aucune route du menu ne s'est perdue
 * en route lors d'un regroupement.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  ...PINNED_NAV,
  ...NAV_GROUPS.flatMap((group) => group.items),
  ...SECONDARY_NAV,
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** La section qui contient la page courante, s'il y en a une. */
export function findActiveGroup(
  pathname: string,
  groups: NavGroup[] = NAV_GROUPS,
): string | null {
  const group = groups.find((g) => g.items.some((item) => isNavItemActive(pathname, item.href)));
  return group?.id ?? null;
}

/**
 * Filtre les entrées sur les permissions, puis retire les sections vides.
 *
 * Une section sans entrée lisible n'est pas un repère : c'est une ligne morte.
 */
export function visibleGroups(
  groups: NavGroup[],
  can: (permission: string) => boolean,
): NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0);
}

/** Garde uniquement des identifiants de sections connus (stockage local). */
export function keepKnownGroupIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(NAV_GROUPS.map((group) => group.id));
  return value.filter((id): id is string => typeof id === "string" && known.has(id));
}
