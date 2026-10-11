"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  UsersRound,
  Video,
  Image as ImageIcon,
  Settings,
  MapPin,
  Route,
  LogOut,
  ChevronLeft,
  Menu,
  Megaphone,
  UserCircle,
  HandHeart,
  Eraser,
  HeartPulse,
  ScrollText,
  Flag,
  CreditCard,
  Sticker,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AdminAlerts } from "@/components/layout/AdminAlerts";
import { cn } from "@/lib/utils";
import { isAuthenticated, adminLogout, getAdminUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect, useState } from "react";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * La navigation se filtre sur les mêmes permissions que les routes du serveur,
 * lues depuis `/admin/me`. Une entrée qui mènerait à une page répondant 403
 * apprend à l'équipe à ignorer les erreurs — mieux vaut ne pas l'afficher.
 */
const navItemsAll = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "stats.read" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "stats.read" },
  { href: "/trips", label: "Trajets", icon: Route, permission: "trips.read" },
  { href: "/users", label: "Utilisateurs", icon: Users, permission: "users.read" },
  // Lecture au niveau admin ; les réglages et les plans exigent billing.settings
  // et billing.plans, vérifiés par la page et par le serveur.
  { href: "/billing", label: "Abonnement", icon: CreditCard, permission: "billing.read" },
  // Vérifications : pages conservées hors menu (comptes business plus tard).
  { href: "/groups", label: "Groupes", icon: UsersRound, permission: "groups.read" },
  { href: "/meetings", label: "Réunions", icon: Video, permission: "meetings.read" },
  { href: "/medias", label: "Médias", icon: ImageIcon, permission: "media.read" },
  { href: "/geolocation", label: "Géolocalisation", icon: MapPin, permission: "stats.read" },
  { href: "/broadcasts", label: "Diffusions", icon: Megaphone, permission: "broadcasts.read" },
  { href: "/reports", label: "Signalements", icon: Flag, permission: "reports.read" },
  { href: "/welcome", label: "Bienvenue", icon: HandHeart, permission: "welcome.read" },
  // Catalogue officiel : lecture par tout administrateur (stickers.read) ;
  // l'écriture, la publication et la modération gardent leurs permissions
  // propres, vérifiées par chaque page et par le serveur.
  { href: "/stickers", label: "Stickers", icon: Sticker, permission: "stickers.read" },
  // Gardée sur une permission d'écriture, à dessein : la page était réservée au
  // super-admin, et la lecture seule des purges ne suffisait pas à l'ouvrir.
  { href: "/purges", label: "Purges", icon: Eraser, permission: "purges.settings" },
  // Lisible par tout administrateur, délibérément : un journal que seul son
  // lecteur le plus puissant peut consulter ne protège personne de lui.
  { href: "/audit", label: "Activité admin", icon: ScrollText, permission: "audit.read" },
  // Sur `stats.read` plutôt qu'une permission dédiée : créer une permission
  // aurait imposé une migration et une reconfiguration de tous les rôles pour
  // une page en lecture seule, qui n'expose que des compteurs et des messages
  // d'erreur techniques — rien qu'un lecteur de statistiques ne puisse voir.
  { href: "/sante", label: "Santé du service", icon: HeartPulse, permission: "stats.read" },
  { href: "/settings", label: "Paramètres", icon: Settings, permission: "settings.read" },
  { href: "/profile", label: "Mon profil", icon: UserCircle, permission: "profile.read" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  // Avant tout retour anticipé : les hooks s'appellent dans le même ordre à
  // chaque rendu.
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthenticated(auth);
    setReady(true);
    if (!auth && !USE_MOCK) {
      router.replace('/login');
    }
  }, [router]);

  if (!ready) return null;

  if (!authenticated && !USE_MOCK) {
    return null;
  }

  const user = getAdminUser();
  // Tant que le profil charge, `can` répond faux et la barre reste vide : une
  // entrée qui apparaît une seconde trop tard vaut mieux qu'une qui s'affiche
  // puis disparaît.
  const navItems = navItemsAll.filter((item) => can(item.permission));

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

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                )}
              >
                <span className="relative shrink-0">
                  <item.icon className="h-5 w-5" />
                </span>
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </button>
            );
          })}
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
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Mon profil"
            >
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
            </button>
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
