"use client";

/**
 * Vérifications — la file des dossiers d'identité.
 *
 * La file par défaut est celle qui attend une décision. « Nom modifié » réunit
 * les coches accordées dont le titulaire a changé de nom depuis : la coche est
 * tombée d'elle-même, il reste à confirmer le nouveau nom ou à révoquer.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterChips } from "@/components/billing/BillingPageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { useVerificationCount, useVerifications } from "@/hooks/useVerification";
import { fmtDateTime, fmtDay } from "@/lib/billing-labels";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL } from "@/lib/verification-labels";
import { cn } from "@/lib/utils";
import type { VerificationQueue } from "@/types";

const EMPTY: Record<VerificationQueue, string> = {
  pending: "Aucun dossier à instruire. La file est à jour.",
  documents: "Aucun dossier n'attend de pièce.",
  renamed: "Aucune coche à réexaminer.",
  decided: "Aucune décision pour l'instant.",
  all: "Aucun dossier.",
};

export default function VerificationsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [queue, setQueue] = useState<VerificationQueue>("pending");
  const { data, isLoading, isFetching, isError, refetch } = useVerifications(queue);
  const { data: count } = useVerificationCount();
  const rows = data ?? [];

  if (!can("verifications.read")) {
    return <p className="py-20 text-center text-sm text-zinc-500">Accès réservé à l&apos;équipe d&apos;administration.</p>;
  }

  const n = (v?: number) => (v ? ` · ${v}` : "");
  const options: { value: VerificationQueue; label: string }[] = [
    { value: "pending", label: `À instruire${n(count?.pending)}` },
    { value: "documents", label: `Pièce demandée${n(count?.documents)}` },
    { value: "renamed", label: `Nom modifié${n(count?.renamed)}` },
    { value: "decided", label: "Décidés" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BadgeCheck className="h-6 w-6 text-indigo-500" />
            Vérifications
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Les dossiers d&apos;identité : la pièce et le selfie, puis la décision. Chaque ouverture de pièce est journalisée.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="shrink-0" aria-label="Actualiser">
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      <FilterChips label="Files de dossiers" options={options} value={queue} onChange={setQueue} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isError ? (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-red-500">
                Impossible de charger les dossiers — la migration 081 est-elle appliquée ?
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">{EMPTY[queue]}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead>
                  <TableHead>Nom déclaré</TableHead>
                  <TableHead>{queue === "decided" ? "Décidé le" : "Déposé le"}</TableHead>
                  <TableHead className="text-center">Pièces</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/verifications/${r.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={r.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-indigo-100 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {(r.userName ?? "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/verifications/${r.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate font-medium text-zinc-900 hover:text-indigo-600 hover:underline dark:text-zinc-100"
                          >
                            {r.userName || `Compte ${r.alanyaId}`}
                          </Link>
                          <span className="block truncate text-xs text-zinc-400">@{r.pseudo} · #{r.alanyaId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.claimedName}
                      {r.nameChanged && (
                        <span className="block text-xs text-amber-600 dark:text-amber-400">
                          affiché aujourd&apos;hui : {r.userName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-zinc-500">
                      {queue === "decided" ? fmtDay(r.decidedAt) : fmtDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{r.documents}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", REQUEST_STATUS_CLASS[r.status])}>
                        {r.nameChanged ? "Nom modifié" : REQUEST_STATUS_LABEL[r.status]}
                      </Badge>
                      {r.reviewerName && r.status !== "pending" && (
                        <span className="mt-0.5 block text-xs text-zinc-400">par {r.reviewerName}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
