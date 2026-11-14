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
 * Le haut de la barre est fait de raccourcis épinglés : trois par défaut, et
 * chaque administrateur peut épingler n'importe quelle entrée (cinq au plus),
 * par navigateur. Les autres se rangent en cinq sections dont celle de la page
 * courante s'ouvre d'elle-même.
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

/** Clé de mémorisation des raccourcis épinglés, par navigateur. */
export const PINNED_STORAGE_KEY = "alanya-admin:nav-pinned";

/**
 * Cinq au maximum : au-delà, le haut de la barre redevient une liste qu'on ne
 * scanne plus, et l'épinglage perd son sens (un raccourci pour tout n'en est
 * plus un).
 */
export const MAX_PINNED = 5;

/**
 * Les trois destinations du quotidien. Elles sont épinglées par défaut, mais
 * restent membres d'une section : désépinglées, elles doivent se ranger
 * quelque part plutôt que de disparaître de la barre.
 */
export const DASHBOARD_NAV: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  permission: "stats.read",
};

export const USERS_NAV: NavItem = {
  href: "/users",
  label: "Utilisateurs",
  icon: Users,
  permission: "users.read",
};

// Le compteur de la file ouverte se pose à côté de cette entrée (badge).
export const REPORTS_NAV: NavItem = {
  href: "/reports",
  label: "Signalements",
  icon: Flag,
  permission: "reports.read",
};

/** Les trois destinations du quotidien, épinglées par défaut. */
export const DEFAULT_PINNED_NAV: NavItem[] = [DASHBOARD_NAV, USERS_NAV, REPORTS_NAV];

export const DEFAULT_PINNED_HREFS: string[] = DEFAULT_PINNED_NAV.map((item) => item.href);

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      DASHBOARD_NAV,
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
      USERS_NAV,
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
      REPORTS_NAV,
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
 * Construite à partir des sections uniquement : c'est la garantie qu'une entrée
 * désépinglée retrouve toujours sa place. Sert aussi de garde-fou — un test
 * vérifie qu'aucune route du menu ne s'est perdue en route.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
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

/** Les entrées épinglées, dans l'ordre voulu par l'utilisateur. */
export function resolvePinned(
  hrefs: string[],
  items: NavItem[] = ALL_NAV_ITEMS,
): NavItem[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  return hrefs
    .map((href) => byHref.get(href))
    .filter((item): item is NavItem => Boolean(item));
}

/** Épingle ou dépingle, sans jamais dépasser le plafond. */
export function togglePinnedHref(hrefs: string[], href: string): string[] {
  if (hrefs.includes(href)) return hrefs.filter((h) => h !== href);
  if (hrefs.length >= MAX_PINNED) return hrefs;
  return [...hrefs, href];
}

/**
 * Lit les épingles mémorisées. `null` quand la valeur n'est pas une liste :
 * l'appelant garde alors les épingles par défaut plutôt que de tout vider sur
 * un stockage corrompu.
 */
export function keepKnownNavHrefs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const known = new Set(ALL_NAV_ITEMS.map((item) => item.href));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const href of value) {
    if (typeof href !== "string" || !known.has(href) || seen.has(href)) continue;
    seen.add(href);
    out.push(href);
    if (out.length === MAX_PINNED) break;
  }
  return out;
}

/**
 * Compose la barre : épinglés en tête, puis les sections, puis le pied.
 *
 * Une entrée épinglée quitte sa section — sinon elle apparaîtrait deux fois et
 * l'épinglage n'allégerait rien. Si son droit disparaît, elle retombe dans sa
 * section (ou nulle part) : jamais de trou, jamais de raccourci mort.
 */
export function buildSidebar({
  pinnedHrefs,
  can,
}: {
  pinnedHrefs: string[];
  can: (permission: string) => boolean;
}): { pinned: NavItem[]; groups: NavGroup[]; secondary: NavItem[] } {
  const pinned = resolvePinned(pinnedHrefs).filter((item) => can(item.permission));
  const pinnedSet = new Set(pinned.map((item) => item.href));

  const groups = visibleGroups(NAV_GROUPS, can)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !pinnedSet.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);

  const secondary = SECONDARY_NAV.filter(
    (item) => can(item.permission) && !pinnedSet.has(item.href),
  );

  return { pinned, groups, secondary };
}
