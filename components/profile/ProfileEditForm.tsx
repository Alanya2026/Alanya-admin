"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { useUpdateAdminProfile } from "@/hooks/useAdminProfile";
import { useToast } from "@/components/ui/toast";
import { Loader2, Save, Pencil, X, Camera } from "lucide-react";
import type { AdminProfile } from "@/types";

interface ProfileEditFormProps {
  profile: AdminProfile;
  onProfileUpdate?: (updated: AdminProfile) => void;
}

export function ProfileEditForm({ profile, onProfileUpdate }: ProfileEditFormProps) {
  const { addToast } = useToast();
  const updateMutation = useUpdateAdminProfile();
  const [editing, setEditing] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  const [nom, setNom] = useState(profile.nom);
  const [pseudo, setseudo] = useState(profile.pseudo);
  const [email, setEmail] = useState(profile.email || "");

  function handleSave() {
    updateMutation.mutate(
      { nom: nom.trim(), pseudo: pseudo.trim(), email: email.trim() || undefined },
      {
        onSuccess: (data) => {
          addToast({ title: "Profil mis à jour", variant: "success" });
          setEditing(false);
          onProfileUpdate?.(data);
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
          addToast({
            title: "Erreur",
            description: err.response?.data?.error || "Échec de la mise à jour",
            variant: "error",
          });
        },
      }
    );
  }

  function handleAvatarUpload(url: string) {
    updateMutation.mutate(
      { avatarUrl: url },
      {
        onSuccess: (data) => {
          addToast({ title: "Photo de profil mise à jour", variant: "success" });
          setShowAvatarUpload(false);
          onProfileUpdate?.(data);
        },
        onError: () => {
          addToast({ title: "Erreur", description: "Échec de la mise à jour de la photo", variant: "error" });
        },
      }
    );
  }

  function handleCancel() {
    setNom(profile.nom);
    setseudo(profile.pseudo);
    setEmail(profile.email || "");
    setEditing(false);
  }

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Modifier le profil</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar upload toggle */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAvatarUpload(!showAvatarUpload)}
            className="text-xs text-indigo-600 dark:text-indigo-400"
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            {showAvatarUpload ? "Masquer" : "Changer la photo de profil"}
          </Button>
          {showAvatarUpload && (
            <FileUpload
              endpoint="/upload/avatar"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              onUploadComplete={handleAvatarUpload}
            />
          )}
        </div>

        {editing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pseudo">Pseudo</Label>
              <Input id="pseudo" value={pseudo} onChange={(e) => setseudo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Enregistrer
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm text-zinc-500">Nom</span>
              <span className="text-sm font-medium">{profile.nom}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm text-zinc-500">Pseudo</span>
              <span className="text-sm font-medium">@{profile.pseudo}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm text-zinc-500">Email</span>
              <span className="text-sm font-medium">{profile.email || "—"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
