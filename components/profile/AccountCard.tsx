"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminRole } from "@/lib/admin-role";
import { Calendar, Clock, Hash, Info, ShieldCheck } from "lucide-react";
import type { AdminProfile } from "@/types";

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

interface AccountCardProps {
  profile: AdminProfile;
}

/** Rôle et dates du compte : des faits, pas des champs à modifier. */
export function AccountCard({ profile }: AccountCardProps) {
  const role = adminRole(profile.typeCompte);

  const rows = [
    { label: "Identifiant", value: `#${profile.alanyaID}`, icon: Hash },
    { label: "Inscrit le", value: formatDate(profile.createdAt), icon: Calendar },
    {
      label: "Dernière connexion",
      value: formatDate(profile.lastSeen, true),
      icon: Clock,
    },
  ];

  return (
    <Card className="flex h-full flex-col border-0 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Info className="h-4 w-4 text-indigo-500" />
          Compte
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
            Rôle
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            {role.label}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {role.description}
          </p>
        </div>

        <div className="mt-3 space-y-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2.5 last:border-0 dark:border-zinc-800"
            >
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <row.icon className="h-3.5 w-3.5" />
                {row.label}
              </span>
              <span className="text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-4 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          Ces informations viennent du serveur et ne se modifient pas ici.
        </p>
      </CardContent>
    </Card>
  );
}
