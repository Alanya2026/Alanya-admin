"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-red-300 dark:text-red-900 mb-4">
        <AlertTriangle className="h-12 w-12 mx-auto" />
      </div>
      <h1 className="text-lg font-semibold">Une erreur est survenue</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
        Une erreur inattendue s&apos;est produite. Si elle persiste, rechargez la page ou reconnectez-vous.
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-400 mt-2 font-mono">Réf. {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-6">
        <RotateCcw className="h-4 w-4 mr-1.5" /> Réessayer
      </Button>
    </div>
  );
}
