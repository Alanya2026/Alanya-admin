"use client";

/**
 * Carte « Numéros » de la fiche utilisateur.
 *
 * Les numéros successifs du compte, achetés ou attribués par l'administration.
 * C'est la réponse aux deux questions du support : « quel était mon ancien
 * numéro ? » et « j'ai payé, pourquoi mon numéro n'a pas changé ? » — ce
 * second cas s'affiche en tête quand un changement payé attend son numéro.
 */

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPhoneHistory } from "@/hooks/useUsers";
import { formatDisplay } from "@/lib/alanya-phone";
import { fmtDay } from "@/lib/billing-labels";
import { formatFcfa } from "@/lib/plan-pricing";
import type { PhoneHistoryEntry } from "@/types";

function origin(entry: PhoneHistoryEntry): string {
  if (entry.source === "purchase") {
    return entry.amount != null ? `Acheté · ${formatFcfa(entry.amount)}` : "Acheté";
  }
  return entry.changedByName ? `Par ${entry.changedByName}` : "Par l'administration";
}

export function PhoneHistoryCard({ userId }: { userId: number }) {
  const { data, isLoading, isError, refetch } = useUserPhoneHistory(userId);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Numéros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
        )}

        {isError && (
          <div className="text-center">
            <p className="mb-2 text-xs text-red-500">Historique indisponible.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
          </div>
        )}

        {data && (
          <>
            {data.pendingCredit && (
              <p className="rounded-md bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Changement payé le {fmtDay(data.pendingCredit.createdAt)} : le numéro choisi a été pris
                entre-temps. L&apos;utilisateur doit en choisir un autre, sans repayer.
              </p>
            )}

            {data.history.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Aucun changement de numéro.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.history.map((h) => (
                  <li key={h.id} className="py-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                      <span className="text-zinc-500">{formatDisplay(h.oldPhone)}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-zinc-400" aria-label="devient" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDisplay(h.newPhone)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {fmtDay(h.changedAt)} · {origin(h)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {data.history.length > 0 && (
              <p className="text-[11px] text-zinc-400">
                Un ancien numéro reste en quarantaine {data.quarantineDays} jours : seul son ancien titulaire peut le reprendre.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
