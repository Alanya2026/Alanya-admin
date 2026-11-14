"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersTableRowsSkeleton } from "@/components/skeletons";
import { useBackupKeyAccess, useBackupKeyAccessSummary } from "@/hooks/useBackupKeys";
import { cn } from "@/lib/utils";

const PAGE = 50;
const MAX = 200;

/**
 * Journal des délivrances de clé de sauvegarde.
 *
 * ── Pourquoi cet écran existe ──
 *
 * `GET /api/backup/key` rend la clé qui déchiffre la sauvegarde d'un compte. La
 * conception assume que le serveur puisse déchiffrer — ce n'est pas du bout en
 * bout — mais elle l'assortit d'une contrepartie : que chaque délivrance laisse
 * une trace consultable. Cette trace vivait dans la sortie du serveur, hors de
 * portée d'ici, et disparaissait à la rotation des journaux.
 *
 * ── Ce que cet écran cherche à faire voir ──
 *
 * Pas la liste — elle est longue et répétitive par nature, chaque inscrit
 * demandant sa clé à chaque sauvegarde. Ce qui compte est l'anomalie : une série
 * de refus, qui signale un secret mal déployé bien avant que les inscrits ne se
 * plaignent, et un nombre d'adresses IP hors de proportion avec le nombre de
 * comptes, qui n'a pas d'explication innocente.
 */
export default function BackupKeysPage() {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"" | "servie" | "refusee">("");
  const [limit, setLimit] = useState(PAGE);

  const { data: entries, isLoading, isFetching, refetch } = useBackupKeyAccess({
    outcome: outcome || undefined,
    limit,
  });
  const { data: vue } = useBackupKeyAccessSummary(7);

  const rows = entries ?? [];
  const atCap = limit >= MAX;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <KeyRound className="h-7 w-7 text-indigo-600" />
            Clés de sauvegarde
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Qui a obtenu de quoi déchiffrer sa sauvegarde, et quand
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value as "" | "servie" | "refusee");
              setLimit(PAGE);
            }}
            className="flex h-10 w-44 items-center rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tout</option>
            <option value="servie">Délivrées</option>
            <option value="refusee">Refusées</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
            aria-label="Actualiser"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Un refus n'est pas un incident isolé : le serveur refuse de servir une
          clé tant que le secret vaut encore son marqueur de déploiement. Une
          série signale donc une configuration incomplète — et pendant ce temps,
          AUCUNE sauvegarde ne peut être écrite. */}
      {vue && vue.refus > 0 && (
        <button
          type="button"
          onClick={() => {
            setOutcome("refusee");
            setLimit(PAGE);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{vue.refus}</strong> refus sur {vue.days} jours. Tant qu&apos;une clé
            est refusée, le compte concerné ne peut ni sauvegarder ni restaurer.
          </span>
        </button>
      )}

      {vue && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Délivrances" value={vue.total} hint={`sur ${vue.days} jours`} />
          <Stat label="Refus" value={vue.refus} accent={vue.refus > 0} />
          <Stat label="Comptes distincts" value={vue.comptes} />
          {/* Nettement plus d'adresses que de comptes n'a pas d'explication
              innocente : c'est le signal qu'on vient chercher ici. */}
          <Stat
            label="Adresses distinctes"
            value={vue.adresses}
            accent={vue.comptes > 0 && vue.adresses > vue.comptes * 3}
          />
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} accès
            {outcome ? ` — ${outcome === "refusee" ? "refusés" : "délivrés"}` : ""}
          </CardTitle>
          <CardDescription>
            Du plus récent au plus ancien. Une version de clé précisée signale une
            restauration ; son absence, une sauvegarde ordinaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Quand</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="whitespace-nowrap">Origine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <UsersTableRowsSkeleton count={6} />}

                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                      Aucun accès enregistré{outcome ? " pour ce filtre" : ""}.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-zinc-500">
                        {new Date(e.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${e.alanyaId}`)}
                          className="text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {e.compteNom || `#${e.alanyaId}`}
                        </button>
                        {e.kid != null && (
                          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            restauration · clé v{e.kid}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 font-mono text-xs",
                            e.outcome === "refusee"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                          )}
                        >
                          {e.outcome === "refusee" ? "refusée" : "délivrée"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {e.reason || <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap text-xs tabular-nums text-zinc-400"
                        title={e.userAgent ?? undefined}
                      >
                        {e.ip ?? "—"}
                        {e.deviceId ? ` · ${e.deviceId}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Pas de troncature silencieuse : si on s'arrête, on dit pourquoi. */}
          {!isLoading && rows.length >= limit && (
            <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              {atCap ? (
                <span className="text-sm text-zinc-500">
                  Affichage limité aux {MAX} derniers accès — filtrez pour aller plus loin.
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setLimit((n) => Math.min(n + PAGE, MAX))}
                  disabled={isFetching}
                >
                  Charger {PAGE} de plus
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            accent && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}
