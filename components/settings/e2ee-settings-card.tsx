"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useE2eeSettings, useUpdateE2eeSettings } from "@/hooks/useE2eeSettings";
import { Clock, KeyRound, Loader2 } from "lucide-react";

/** Lit « 12, 34 56 » en [12, 34, 56] ; rend null si un élément n'est pas un alanyaID. */
function lireIds(texte: string): number[] | null {
  const morceaux = texte.split(/[\s,;]+/).filter(Boolean);
  const ids = morceaux.map((m) => Number(m));
  return ids.every((n) => Number.isInteger(n) && n > 0) ? ids : null;
}

/**
 * Chiffrement de bout en bout : deux crans et une cohorte.
 *
 * Le cran 2 n'a d'effet que si le cran 1 est ouvert : un appareil qui n'a pas
 * publié ses clés ne peut rien recevoir de chiffré. L'écran l'empêche plutôt
 * que de laisser un réglage qui ne fait rien.
 */
export function E2eeSettingsCard({ isSuper }: { isSuper: boolean }) {
  const { data, isLoading, isError } = useE2eeSettings();
  const update = useUpdateE2eeSettings();
  const { addToast } = useToast();

  const [ids, setIds] = useState("");
  const [pourcent, setPourcent] = useState("0");

  useEffect(() => {
    if (!data) return;
    setIds(data.cohortIds.join(", "));
    setPourcent(String(data.cohortPercent));
  }, [data]);

  const appliquer = (payload: Parameters<typeof update.mutate>[0]) =>
    update.mutate(payload, {
      onSuccess: () => addToast({ title: "Chiffrement mis à jour", variant: "success" }),
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
        addToast({
          title: "Réglage refusé",
          description: msg?.message ?? msg?.error ?? "Erreur serveur",
          variant: "error",
        });
      },
    });

  const idsLus = lireIds(ids);
  const pourcentLu = Number(pourcent);
  const pourcentValide = Number.isInteger(pourcentLu) && pourcentLu >= 0 && pourcentLu <= 100;
  const cohorteModifiee =
    !!data &&
    (pourcentLu !== data.cohortPercent ||
      JSON.stringify(Array.from(new Set(idsLus ?? [])).sort((a, b) => a - b)) !==
        JSON.stringify(data.cohortIds));
  const verrouille = !isSuper || isError || update.isPending;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-base">Chiffrement de bout en bout</CardTitle>
        </div>
        <CardDescription>
          Messages texte à deux. Ne concerne que les comptes de la cohorte ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading || !data ? (
          isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Réglage indisponible : l&apos;état n&apos;a pas pu être chargé.
            </p>
          ) : (
            <Skeleton className="h-24 w-full" />
          )
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">1. Publication des clés</p>
                <p className="text-sm text-zinc-500">
                  Les appareils de la cohorte créent et publient leurs clés. Rien ne change encore
                  pour les messages.
                </p>
              </div>
              <Switch
                checked={data.enrolEnabled}
                disabled={verrouille || (data.enrolEnabled && data.activateEnabled)}
                onCheckedChange={(v) => appliquer({ enrolEnabled: v })}
                aria-label="Publication des clés"
                className="mt-0.5 shrink-0"
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">2. Activation des conversations</p>
                <p className="text-sm text-zinc-500">
                  Une conversation entre deux comptes de la cohorte passe en chiffré quand tous leurs
                  appareils ont publié leurs clés. C&apos;est sans retour pour cette conversation.
                </p>
                {!data.enrolEnabled && (
                  <p className="text-xs text-amber-600">Ouvrez d&apos;abord la publication des clés.</p>
                )}
              </div>
              <Switch
                checked={data.activateEnabled}
                disabled={verrouille || (!data.enrolEnabled && !data.activateEnabled)}
                onCheckedChange={(v) => appliquer({ activateEnabled: v })}
                aria-label="Activation des conversations"
                className="mt-0.5 shrink-0"
              />
            </div>

            <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="text-sm font-medium">Cohorte</p>
              <div className="space-y-2">
                <Label htmlFor="e2ee-ids">Comptes inclus (alanyaID, séparés par des virgules)</Label>
                <Input
                  id="e2ee-ids"
                  value={ids}
                  onChange={(e) => setIds(e.target.value)}
                  placeholder="ex. 12, 345"
                  disabled={!isSuper}
                />
                {idsLus === null && (
                  <p className="text-xs text-red-600">Uniquement des alanyaID (entiers positifs).</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="e2ee-pct">Part de tous les comptes (%)</Label>
                <Input
                  id="e2ee-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={pourcent}
                  onChange={(e) => setPourcent(e.target.value)}
                  disabled={!isSuper}
                  className="w-28"
                />
                {!pourcentValide && <p className="text-xs text-red-600">Entier de 0 à 100.</p>}
              </div>
              <Button
                onClick={() => appliquer({ cohortIds: idsLus ?? [], cohortPercent: pourcentLu })}
                disabled={verrouille || idsLus === null || !pourcentValide || !cohorteModifiee}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer la cohorte
              </Button>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Une bascule met jusqu&apos;à 30 secondes à se propager aux serveurs.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
