"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ScrollText } from "lucide-react";

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
import { ErrorState } from "@/components/ui/error-state";
import { useAudit, useAuditActions } from "@/hooks/useAudit";
import { cn } from "@/lib/utils";

const PAGE = 50;
const MAX = 200;

/** Cible cliquable quand on sait où elle mène. */
function targetHref(type: string | null, id: string | null): string | null {
  if (!id) return null;
  if (type === "user") return `/users/${id}`;
  if (type === "group") return `/groups/${id}`;
  return null;
}

export default function AuditPage() {
  const router = useRouter();
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const { data: entries, isLoading, isFetching, isError, refetch } = useAudit({
    action: action || undefined,
    limit,
  });
  const { data: actions } = useAuditActions();

  const unmapped = useMemo(
    () => (actions ?? []).find((a) => a.action === "unmapped")?.n ?? 0,
    [actions],
  );

  const rows = entries ?? [];
  const atCap = limit >= MAX;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ScrollText className="h-7 w-7 text-indigo-600" />
            Activité admin
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Chaque action qui modifie quelque chose, avec son auteur et son motif
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setLimit(PAGE);
            }}
            className="flex h-10 w-52 items-center rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes les actions</option>
            {(actions ?? []).map((a) => (
              <option key={a.action} value={a.action}>
                {a.action} ({a.n})
              </option>
            ))}
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

      {/* Une route mutante qu'aucune entrée ne décrit ressort en `unmapped`.
          C'est un trou dans la carte du middleware, pas un incident : le dire
          ici est ce qui empêche qu'il reste des mois sans être vu. */}
      {unmapped > 0 && (
        <button
          type="button"
          onClick={() => {
            setAction("unmapped");
            setLimit(PAGE);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{unmapped}</strong> action{unmapped > 1 ? "s" : ""} sur une route que la
            carte du journal ne décrit pas — le verbe métier manque.
          </span>
        </button>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} action{rows.length > 1 ? "s" : ""}
            {action ? ` — ${action}` : ""}
          </CardTitle>
          <CardDescription>
            De la plus récente à la plus ancienne. Les lectures ne sont pas journalisées,
            ni les actions refusées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Quand</TableHead>
                  <TableHead>Qui</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="whitespace-nowrap">Origine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <UsersTableRowsSkeleton count={6} />}

                {!isLoading && !isFetching && isError && (
                  <TableRow>
                    <TableCell colSpan={6}><ErrorState onRetry={() => refetch()} /></TableCell>
                  </TableRow>
                )}

                {!isLoading && !isFetching && !isError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-zinc-500">
                      Aucune action enregistrée{action ? " pour ce filtre" : ""}.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  rows.map((e) => {
                    const href = targetHref(e.targetType, e.targetId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-zinc-500">
                          {new Date(e.createdAt).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.adminNom ? (
                            <span className="font-medium">{e.adminNom}</span>
                          ) : (
                            <span className="text-zinc-400 italic">compte supprimé</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 font-mono text-xs",
                              e.action === "unmapped"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                            )}
                            title={e.route}
                          >
                            {e.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.targetId ? (
                            href ? (
                              <button
                                type="button"
                                onClick={() => router.push(href)}
                                className="text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                {e.targetType} #{e.targetId}
                              </button>
                            ) : (
                              <span className="text-zinc-500">
                                {e.targetType ?? "—"} {e.targetId}
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-400">{e.targetType ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {e.reason || <span className="text-zinc-400">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-zinc-400">
                          {e.ip ?? "—"} · {e.statusCode}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Pas de troncature silencieuse : si on s'arrête, on dit pourquoi. */}
          {!isLoading && rows.length >= limit && (
            <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              {atCap ? (
                <span className="text-sm text-zinc-500">
                  Affichage limité aux {MAX} dernières actions — filtrez par action pour
                  aller plus loin.
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
