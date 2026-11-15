"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileDetailsCard } from "@/components/profile/ProfileDetailsCard";
import { PermissionsCard } from "@/components/profile/PermissionsCard";
import { AvatarCard } from "@/components/profile/AvatarCard";
import { SecurityCard } from "@/components/profile/SecurityCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import type { AdminProfile } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading, isError } = useAdminProfile();
  const [localProfile, setLocalProfile] = useState<AdminProfile | null>(null);
  const [editing, setEditing] = useState(false);

  const displayProfile = localProfile || profile;

  function handleEdit() {
    setEditing(true);
    document
      .getElementById("details-card")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-indigo-500" />
            Mon profil
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Vos informations, vos droits et la sécurité de votre compte
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-52 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 h-80 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="lg:col-span-6 h-80 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="lg:col-span-7 h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="lg:col-span-5 h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm mb-3">Erreur de chargement du profil</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && displayProfile && (
        <div className="space-y-4">
          <ProfileHero profile={displayProfile} onEdit={handleEdit} />

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <ProfileDetailsCard
                profile={displayProfile}
                editing={editing}
                onEditingChange={setEditing}
                onProfileUpdate={(updated) => setLocalProfile(updated)}
              />
            </div>
            <div className="lg:col-span-6">
              <PermissionsCard
                permissions={displayProfile.permissions ?? []}
                typeCompte={displayProfile.typeCompte}
              />
            </div>
            <div className="lg:col-span-7">
              <AvatarCard
                profile={displayProfile}
                onProfileUpdate={(updated) => setLocalProfile(updated)}
              />
            </div>
            <div className="lg:col-span-5">
              <SecurityCard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
