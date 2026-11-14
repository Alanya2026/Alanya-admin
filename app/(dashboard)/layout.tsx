"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, LogOut, Menu, Pin, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AdminAlerts } from "@/components/layout/AdminAlerts";
import { cn } from "@/lib/utils";
import { isAuthenticated, adminLogout, getAdminUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { useOpenReports } from "@/hooks/useReports";
import {
  DEFAULT_PINNED_HREFS,
  MAX_PINNED,
  NAV_OPEN_STORAGE_KEY,
  PINNED_STORAGE_KEY,
  buildSidebar,
  findActiveGroup,
  isNavItemActive,
  keepKnownGroupIds,
  keepKnownNavHrefs,
  togglePinnedHref,
  type NavItem,
} from "@/lib/nav";
import { useEffect, useState } from "react";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * Une entrée de navigation. `aria-current` porte l'état actif : la couleur
 * seule ne dit rien à un lecteur d'écran, et une section repliée doit tout de
 * même annoncer qu'elle contient la page courante.
 *
 * L'épingle est un bouton frère, pas un bouton imbriqué : deux actions dans le
 * même contrôle seraient invalides et impossibles à viser au clavier.
 */
function NavButton({
  item,
  active,
  collapsed,
  badge,
  pinned,
  pinLimitReached,
  onTogglePin,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  pinned?: boolean;
  pinLimitReached?: boolean;
  onTogglePin?: () => void;
  onNavigate: () => void;
}) {
  const pinnable = !collapsed && Boolean(onTogglePin);
  const pinTitle = pinned
    ? `Désépingler ${item.label}`
    : pinLimitReached
      ? `Maximum ${MAX_PINNED} épingles`
      : `Épingler ${item.label}`;

  return (
    <div className="group relative">
      <button
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          pinnable && "pr-10",
          active
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
        {!collapsed && badge ? (
          <span
            className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-300"
            aria-label={`${badge} signalement${badge > 1 ? "s" : ""} à traiter`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>

      {pinnable && (
        <button
          type="button"
          onClick={onTogglePin}
          disabled={!pinned && pinLimitReached}
          aria-pressed={Boolean(pinned)}
          aria-label={pinTitle}
          title={pinTitle}
          className={cn(
            "absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md transition",
            "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200",
            "focus-visible:opacity-100",
            // Visible sans survol sur un écran tactile : sans cela, épingler
            // serait une fonction réservée à la souris.
            "[@media(hover:none)]:opacity-100",
            pinned
              ? "opacity-70 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-100",
            !pinned && pinLimitReached && "cursor-not-allowed group-hover:opacity-30"
          )}
        >
          <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
        </button>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  // Avant tout retour anticipé : les hooks s'appellent dans le même ordre à
  // chaque rendu.
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  /**
   * Sections ouvertes. La page courante force la sienne dès le premier rendu,
   * pour éviter le clignotement « tout fermé puis ouverture ». Le reste vient
   * du navigateur : un poste qui travaille toujours dans la même section la
   * retrouve ouverte au rechargement.
   */
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = findActiveGroup(pathname);
    return new Set(active ? [active] : []);
  });
  const [navRestored, setNavRestored] = useState(false);

  /** Raccourcis épinglés : les trois par défaut tant que rien n'est mémorisé. */
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(DEFAULT_PINNED_HREFS);
  const [pinsRestored, setPinsRestored] = useState(false);

  const { data: openReports } = useOpenReports(4, can("reports.read"));

  // Tant que le profil charge, `can` répond faux et la barre reste vide : une
  // entrée qui apparaît une seconde trop tard vaut mieux qu'une qui s'affiche
  // puis disparaît.
  const { pinned, groups, secondary } = buildSidebar({ pinnedHrefs, can });
  const activeGroup = findActiveGroup(pathname, groups);
  const pinsAtMax = pinnedHrefs.length >= MAX_PINNED;
  const pinsAreDefault =
    pinnedHrefs.length === DEFAULT_PINNED_HREFS.length &&
    pinnedHrefs.every((href, index) => href === DEFAULT_PINNED_HREFS[index]);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthenticated(auth);
    setReady(true);
    if (!auth && !USE_MOCK) {
      router.replace('/login');
    }
  }, [router]);

  // Mémoire des sections ouvertes, relue après le montage : le rendu serveur
  // ne connaît pas le localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAV_OPEN_STORAGE_KEY);
      const ids = keepKnownGroupIds(stored ? JSON.parse(stored) : null);
      if (ids.length > 0) setOpenGroups((prev) => new Set([...Array.from(prev), ...ids]));
    } catch {
      // Un stockage corrompu ou bloqué ne doit pas casser la navigation.
    }
    setNavRestored(true);
  }, []);

  // Même principe pour les épingles. Une valeur illisible laisse les valeurs
  // par défaut : mieux vaut trois raccourcis que zéro.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_STORAGE_KEY);
      const hrefs = stored ? keepKnownNavHrefs(JSON.parse(stored)) : null;
      if (hrefs) setPinnedHrefs(hrefs);
    } catch {
      // Voir plus haut.
    }
    setPinsRestored(true);
  }, []);

  // Changer de page ouvre la section qui la contient, même si elle avait été
  // repliée à la main : la page courante reste un repère. Une entrée épinglée
  // n'appartient plus à sa section : elle ne doit pas l'ouvrir pour rien.
  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((prev) => (prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup)));
  }, [activeGroup]);

  useEffect(() => {
    if (!navRestored) return;
    try {
      localStorage.setItem(NAV_OPEN_STORAGE_KEY, JSON.stringify(Array.from(openGroups)));
    } catch {
      // Idem : la préférence est un confort, pas une condition d'affichage.
    }
  }, [openGroups, navRestored]);

  useEffect(() => {
    if (!pinsRestored) return;
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedHrefs));
    } catch {
      // Voir plus haut.
    }
  }, [pinnedHrefs, pinsRestored]);

  if (!ready) return null;

  if (!authenticated && !USE_MOCK) {
    return null;
  }

  const user = getAdminUser();
  const badgeFor = (item: NavItem) =>
    item.href === "/reports" ? (openReports?.open ?? openReports?.total ?? 0) : 0;

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePin = (href: string) =>
    setPinnedHrefs((prev) => togglePinnedHref(prev, href));

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-white dark:bg-zinc-900 dark:border-zinc-800 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b dark:border-zinc-800">
          <img
            src="/admin/logo.png"
            alt="Alanya"
            width={36}
            height={36}
            className="shrink-0 rounded-lg shadow-sm object-contain"
          />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">Alanya Admin</span>
          )}
        </div>

        <nav aria-label="Navigation principale" className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-1">
            {pinned.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                collapsed={collapsed}
                badge={badgeFor(item)}
                pinned
                pinLimitReached={pinsAtMax}
                onTogglePin={() => togglePin(item.href)}
                onNavigate={() => router.push(item.href)}
              />
            ))}

            {!pinsAreDefault && !collapsed && (
              <button
                onClick={() => setPinnedHrefs([...DEFAULT_PINNED_HREFS])}
                className="w-full rounded-md px-3 py-1.5 text-left text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                Réinitialiser les épingles
              </button>
            )}

            {!collapsed && pinsAtMax && (
              <p className="px-3 py-1 text-[10px] text-zinc-400">
                {MAX_PINNED} épingles au maximum
              </p>
            )}
          </div>

          <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />

          {collapsed ? (
            // Replié, il n'y a plus de place pour un titre de section : les
            // entrées restent atteignables, séparées par famille, et le
            // libellé passe en infobulle. L'épinglage, lui, attend le dépliage.
            groups.map((group, index) => (
              <div key={group.id}>
                {index > 0 && (
                  <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavButton
                      key={item.href}
                      item={item}
                      active={isNavItemActive(pathname, item.href)}
                      collapsed
                      badge={badgeFor(item)}
                      onNavigate={() => router.push(item.href)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-0.5">
              {groups.map((group) => {
                const open = openGroups.has(group.id);
                const containsActive = activeGroup === group.id;
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={open}
                      aria-controls={`nav-group-${group.id}`}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                      <span className="flex-1 truncate text-left">{group.label}</span>
                      {/* Repliée, la section dit quand même qu'elle contient la
                          page courante : sinon l'état actif disparaît. */}
                      {!open && containsActive && (
                        <>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"
                            aria-hidden
                          />
                          <span className="sr-only">Contient la page courante</span>
                        </>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          !open && "-rotate-90"
                        )}
                        aria-hidden
                      />
                    </button>

                    <div
                      id={`nav-group-${group.id}`}
                      hidden={!open}
                      className="ml-3 mt-1 space-y-1 border-l border-zinc-200 pl-2 dark:border-zinc-800"
                    >
                      {group.items.map((item) => (
                        <NavButton
                          key={item.href}
                          item={item}
                          active={isNavItemActive(pathname, item.href)}
                          collapsed={false}
                          badge={badgeFor(item)}
                          pinned={false}
                          pinLimitReached={pinsAtMax}
                          onTogglePin={() => togglePin(item.href)}
                          onNavigate={() => router.push(item.href)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />

          <div className="space-y-1">
            {secondary.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                collapsed={collapsed}
                badge={badgeFor(item)}
                pinned={pinnedHrefs.includes(item.href)}
                pinLimitReached={pinsAtMax}
                onTogglePin={() => togglePin(item.href)}
                onNavigate={() => router.push(item.href)}
              />
            ))}
          </div>
        </nav>

        <div className="border-t dark:border-zinc-800 p-2 space-y-1">
          {!collapsed && user && (
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors truncate"
            >
              <UserCircle className="h-5 w-5 shrink-0 text-indigo-500" />
              <span className="truncate">{user.nom || user.email}</span>
            </button>
          )}
          <button
            onClick={() => { adminLogout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between h-16 px-6 border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Identité seule : « Mon profil » n'a qu'une porte, en bas de la
                barre latérale. Trois liens vers la même page encombraient le
                menu sans rien ajouter. */}
            <div className="flex items-center gap-2 p-1.5" title={user?.nom}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nom}
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                />
              ) : null}
              <div className={`h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ${user?.avatarUrl ? "hidden" : ""}`}>
                {user?.nom ? user.nom.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "AD"}
              </div>
            </div>
          </div>
        </header>

        {/* Hors du conteneur défilant : une alerte qui remonte avec la page
            se perd dès qu'on descend dans une liste. */}
        <AdminAlerts />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
