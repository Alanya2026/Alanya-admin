"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateAdminProfile } from "@/hooks/useAdminProfile";
import { useToast } from "@/components/ui/toast";
import { Loader2, Mail, MapPin, Pencil, Phone, Save, User, X } from "lucide-react";
import type { AdminProfile } from "@/types";

interface ProfileDetailsCardProps {
  profile: AdminProfile;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onProfileUpdate?: (updated: AdminProfile) => void;
}

/**
 * Coordonnées du compte, modifiables sur place.
 *
 * Remplace les deux cartes « lecture » puis « formulaire » qui répétaient les
 * mêmes trois champs. Les lignes non modifiables (téléphone, pays) restent
 * visibles mais ne promettent pas une action qu'elles n'ont pas.
 */
export function ProfileDetailsCard({
  profile,
  editing,
  onEditingChange,
  onProfileUpdate,
}: ProfileDetailsCardProps) {
  const { addToast } = useToast();
  const updateMutation = useUpdateAdminProfile();

  const [nom, setNom] = useState(profile.nom);
  const [pseudo, setPseudo] = useState(profile.pseudo);
  const [email, setEmail] = useState(profile.email || "");

  // Quand un enregistrement aboutit, le profil reçu du serveur fait foi :
  // on réaligne les champs pour que la prochaine ouverture parte du bon état.
  useEffect(() => {
    setNom(profile.nom);
    setPseudo(profile.pseudo);
    setEmail(profile.email || "");
  }, [profile.nom, profile.pseudo, profile.email]);

  function startEditing() {
    setNom(profile.nom);
    setPseudo(profile.pseudo);
    setEmail(profile.email || "");
    onEditingChange(true);
  }

  function cancelEditing() {
    setNom(profile.nom);
    setPseudo(profile.pseudo);
    setEmail(profile.email || "");
    onEditingChange(false);
  }

  function handleSave() {
    if (!nom.trim() || !pseudo.trim()) {
      addToast({
        title: "Champs incomplets",
        description: "Le nom et le pseudo ne peuvent pas être vides.",
        variant: "error",
      });
      return;
    }

    updateMutation.mutate(
      {
        nom: nom.trim(),
        pseudo: pseudo.trim(),
        email: email.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          addToast({ title: "Profil mis à jour", variant: "success" });
          onEditingChange(false);
          onProfileUpdate?.(data);
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
          addToast({
            title: "Erreur",
            description: err.response?.data?.error || "Échec de la mise à jour",
            variant: "error",
          });
        },
      },
    );
  }

  return (
    <Card
      id="details-card"
      className="flex h-full flex-col border-0 shadow-sm bg-white dark:bg-zinc-900 scroll-mt-6"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-indigo-500" />
            Coordonnées
          </CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profil-nom">Nom complet</Label>
              <Input
                id="profil-nom"
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profil-pseudo">Pseudo</Label>
              <Input
                id="profil-pseudo"
                value={pseudo}
                onChange={(event) => setPseudo(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profil-email">Email</Label>
              <Input
                id="profil-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Enregistrer
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="mr-1 h-4 w-4" />
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <DetailRow icon={User} label="Nom complet" value={profile.nom} />
            <DetailRow icon={User} label="Pseudo" value={`@${profile.pseudo}`} />
            <DetailRow
              icon={Mail}
              label="Email"
              value={profile.email || "Non renseigné"}
            />
            <DetailRow
              icon={Phone}
              label="Téléphone"
              value={profile.alanyaPhone || "Non renseigné"}
            />
            <DetailRow
              icon={MapPin}
              label="Pays"
              value={profile.paysLibelle || "Non renseigné"}
            />
          </div>
        )}

        <p className="mt-auto pt-4 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          Le téléphone et le pays se modifient depuis la fiche du membre, pas
          ici.
        </p>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0 dark:border-zinc-800">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
      </div>
    </div>
  );
}
