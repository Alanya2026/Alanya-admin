"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/toast";
import { useUpdateAdminProfile } from "@/hooks/useAdminProfile";
import { Camera, Info } from "lucide-react";
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

interface AvatarCardProps {
  profile: AdminProfile;
  onProfileUpdate?: (updated: AdminProfile) => void;
}

/** Photo de profil : l'aperçu reste visible pendant que l'envoi se fait. */
export function AvatarCard({ profile, onProfileUpdate }: AvatarCardProps) {
  const { addToast } = useToast();
  const updateMutation = useUpdateAdminProfile();
  const [showUpload, setShowUpload] = useState(false);

  function handleUpload(url: string) {
    updateMutation.mutate(
      { avatarUrl: url },
      {
        onSuccess: (data) => {
          addToast({ title: "Photo de profil mise à jour", variant: "success" });
          setShowUpload(false);
          onProfileUpdate?.(data);
        },
        onError: () => {
          addToast({
            title: "Erreur",
            description: "Échec de la mise à jour de la photo",
            variant: "error",
          });
        },
      },
    );
  }

  return (
    <Card
      id="carte-photo"
      className="flex h-full flex-col border-0 shadow-sm bg-white dark:bg-zinc-900 scroll-mt-6"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Camera className="h-4 w-4 text-indigo-500" />
          Photo &amp; apparence
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.nom} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white">
              {getInitials(profile.nom)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {profile.nom}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Cette photo apparaît à côté de vos actions dans le panneau.
            </p>

            {!showUpload && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowUpload(true)}
                disabled={updateMutation.isPending}
              >
                <Camera className="mr-1.5 h-4 w-4" />
                Changer la photo
              </Button>
            )}
          </div>
        </div>

        {showUpload && (
          <div className="mt-4 space-y-2">
            <FileUpload
              endpoint="/upload/avatar"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              onUploadComplete={handleUpload}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                JPG, PNG ou WebP · 5 Mo maximum.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-start gap-2 pt-5 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            La photo est visible à côté de vos actions dans le panneau. Vous
            pouvez la changer à tout moment.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
