"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminRole } from "@/lib/admin-role";
import {
  Calendar,
  Clock,
  Hash,
  KeyRound,
  MapPin,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import type { AdminProfile } from "@/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

interface ProfileHeroProps {
  profile: AdminProfile;
  onEdit: () => void;
}

/**
 * Bandeau d'identité pleine largeur.
 *
 * Direction A : les quatre informations deviennent une simple ligne de faits
 * séparés par l'espace, sans cases ni filets verticaux. Un seul filet
 * horizontal sépare le pied du reste de la carte.
 */
export function ProfileHero({ profile, onEdit }: ProfileHeroProps) {
  const role = adminRole(profile.typeCompte);

  const meta = [
    {
      label: "AlanyaID",
      value: `#${profile.alanyaID}`,
      icon: Hash,
    },
    {
      label: "Pays",
      value: profile.paysLibelle || "Non renseigné",
      icon: MapPin,
    },
    {
      label: "Membre depuis",
      value: formatDate(profile.createdAt),
      icon: Calendar,
    },
    {
      label: "Dernière connexion",
      value: formatDate(profile.lastSeen, true),
      icon: Clock,
    },
  ];

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm bg-white dark:bg-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-44 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 shrink-0 shadow-sm">
          <AvatarImage src={profile.avatarUrl || undefined} alt={profile.nom} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white">
            {getInitials(profile.nom)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {profile.nom}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {role.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              @{profile.pseudo}
            </span>
            {profile.email && (
              <>
                <span
                  aria-hidden
                  className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600"
                />
                <span className="truncate">{profile.email}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {role.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              document
                .getElementById("permissions-card")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            <KeyRound className="mr-1.5 h-4 w-4" />
            Voir mes droits
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Ligne de faits : un seul filet horizontal, sans séparateurs verticaux. */}
      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-zinc-100 px-6 py-3.5 dark:border-zinc-800">
        {meta.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              <item.icon className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
              {item.label}
            </p>
            <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}