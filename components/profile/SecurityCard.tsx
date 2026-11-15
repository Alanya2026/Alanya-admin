"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";
import { AlertTriangle, KeyRound, Lock } from "lucide-react";

/**
 * Sécurité du compte.
 *
 * Le formulaire de mot de passe sort du flux de la page : il n'a pas besoin
 * d'être visible en permanence, et ses trois champs allongeaient la page pour
 * un usage rare. Il s'ouvre dans une boîte de dialogue, qui se ferme une fois
 * le changement réussi.
 */
export function SecurityCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="flex h-full flex-col border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Lock className="h-4 w-4 text-indigo-500" />
            Sécurité
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Mot de passe
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Choisissez un mot de passe long et unique.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              Changer
            </Button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Toute modification du mot de passe notifie les super-admins.
            </span>
          </div>

        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Saisissez votre mot de passe actuel, puis le nouveau à deux
              reprises. Les super-admins seront prévenus du changement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <PasswordChangeForm embedded onSuccess={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
