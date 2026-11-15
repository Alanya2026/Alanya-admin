"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangeAdminPassword } from "@/hooks/useAdminProfile";
import { useToast } from "@/components/ui/toast";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

interface PasswordChangeFormProps {
  /**
   * Dans une boîte de dialogue, la carte et son titre feraient doublon avec
   * l'en-tête du dialogue : on ne rend alors que les champs.
   */
  embedded?: boolean;
  onSuccess?: () => void;
}

export function PasswordChangeForm({
  embedded = false,
  onSuccess,
}: PasswordChangeFormProps) {
  const { addToast } = useToast();
  const changeMutation = useChangeAdminPassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function handleChange() {
    if (newPassword !== confirmPassword) {
      addToast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "error" });
      return;
    }
    if (newPassword.length < 6) {
      addToast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "error" });
      return;
    }

    changeMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          addToast({
            title: "Mot de passe modifié",
            description: "Votre mot de passe a été changé avec succès. Les super-admins ont été notifiés.",
            variant: "success",
          });
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          onSuccess?.();
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
          addToast({
            title: "Erreur",
            description: err.response?.data?.error || "Échec du changement de mot de passe",
            variant: "error",
          });
        },
      }
    );
  }

  const fields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Mot de passe actuel</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={showCurrent ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={showNew ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {newPassword && newPassword.length < 6 && (
          <p className="text-xs text-amber-600">Minimum 6 caractères</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
        )}
      </div>

      <Button
        onClick={handleChange}
        disabled={!currentPassword || !newPassword || !confirmPassword || changeMutation.isPending}
        className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
      >
        {changeMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Lock className="h-4 w-4 mr-1.5" />
        )}
        Modifier le mot de passe
      </Button>
    </div>
  );

  if (embedded) return fields;

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-indigo-500" />
          Changer le mot de passe
        </CardTitle>
      </CardHeader>
      <CardContent>{fields}</CardContent>
    </Card>
  );
}
