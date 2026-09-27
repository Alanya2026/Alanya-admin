"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * État d'erreur de chargement, avec relance.
 *
 * Le squelette dit « ça arrive », le vide dit « il n'y a rien » — ici on dit
 * « ça a échoué », faute de quoi un échec API ressemble à une liste vide.
 */
export function ErrorState({ onRetry, title = "Erreur de chargement", message }: {
  onRetry?: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-red-300 dark:text-red-900 mb-3">
        <AlertTriangle className="h-10 w-10 mx-auto" />
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{title}</p>
      {message && <p className="text-xs text-zinc-400 mt-1">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Réessayer
        </Button>
      )}
    </div>
  );
}
