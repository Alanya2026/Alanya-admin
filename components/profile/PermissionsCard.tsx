"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminRole } from "@/lib/admin-role";
import {
  groupGrantedPermissions,
  type PermissionGroupId,
} from "@/lib/permissions";
import {
  BarChart3,
  Check,
  ChevronRight,
  KeyRound,
  Megaphone,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

const GROUP_VISUALS: Record<
  PermissionGroupId,
  { icon: React.ElementType; tone: string }
> = {
  comptes: {
    icon: Users,
    tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  moderation: {
    icon: ShieldCheck,
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  },
  contenus: {
    icon: Megaphone,
    tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
  },
  pilotage: {
    icon: BarChart3,
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
  },
  systeme: {
    icon: Settings2,
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  },
  autres: {
    icon: KeyRound,
    tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

interface PermissionsCardProps {
  permissions: string[];
  typeCompte: number;
}

/**
 * Carte des droits d'administration.
 *
 * Le premier niveau se lit sans connaître un seul code : cinq groupes métier,
 * un libellé clair et un compteur. Le détail complet (libellé simple + code
 * technique en second plan) s'ouvre dans une boîte de dialogue, pour ne pas
 * transformer la page en table de routage.
 */
export function PermissionsCard({ permissions, typeCompte }: PermissionsCardProps) {
  const [open, setOpen] = useState(false);
  const groups = groupGrantedPermissions(permissions);
  const total = groups.reduce((sum, group) => sum + group.permissions.length, 0);
  const role = adminRole(typeCompte);

  return (
    <>
      <Card
        id="permissions-card"
        className="flex h-full flex-col border-0 shadow-sm bg-white dark:bg-zinc-900 scroll-mt-6"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="h-4 w-4 text-indigo-500" />
                Ce que vous pouvez faire
              </CardTitle>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Les actions autorisées par votre rôle de {role.label.toLowerCase()}.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              {total}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col">
          {groups.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aucun droit d&apos;administration n&apos;est attaché à ce compte.
            </p>
          ) : (
            <ul className="space-y-3">
              {groups.map((group) => {
                const visual = GROUP_VISUALS[group.id];
                const Icon = visual.icon;
                return (
                  <li key={group.id} className="flex items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {group.label}
                        </p>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                          {group.permissions.length} droit
                          {group.permissions.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {group.summary}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-auto pt-5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => setOpen(true)}
              disabled={total === 0}
            >
              <span>Voir le détail des {total} droits</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
              Calculés par le serveur à chaque connexion. Aucun code technique
              n&apos;est nécessaire pour les comprendre.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vos droits, en clair</DialogTitle>
            <DialogDescription>
              Votre rôle de {role.label.toLowerCase()} donne {total} droits.
              Chaque ligne commence par ce qu&apos;elle permet ; le code
              technique est affiché en petit dessous, pour les développeurs.
            </DialogDescription>
          </DialogHeader>

          <div className="-mr-1 mt-4 max-h-[62vh] space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => {
              const visual = GROUP_VISUALS[group.id];
              const Icon = visual.icon;
              return (
                <section key={group.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${visual.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {group.label}
                    </h3>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {group.permissions.length} droit
                      {group.permissions.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="space-y-2 border-l border-zinc-100 pl-3 dark:border-zinc-800">
                    {group.permissions.map((permission) => (
                      <li key={permission.code} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                            {permission.label}
                          </p>
                          {permission.note && (
                            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {permission.note}
                            </p>
                          )}
                          <code className="mt-0.5 inline-block font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            {permission.code}
                          </code>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
