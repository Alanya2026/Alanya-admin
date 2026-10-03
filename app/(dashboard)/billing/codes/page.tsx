"use client";

/**
 * Codes d'activation : ceux que génère l'administration (tests, ventes
 * manuelles) et ceux qu'émettra le site de paiement.
 *
 * La liste ne montre jamais un code, seulement ses quatre derniers symboles :
 * le serveur n'en garde que l'empreinte. Générer ou annuler un code décide de
 * l'argent des autres — réservé au super-administrateur.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, KeyRound, Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { BillingPageHeader, FilterChips } from "@/components/billing/BillingPageHeader";
import { CodesGenerateDialog } from "@/components/billing/CodesGenerateDialog";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useBillingCodes, useBillingSettings, useRevokeBillingCode,
} from "@/hooks/useBilling";
import { CODE_STATUS_CLASS, CODE_STATUS_LABEL } from "@/lib/billing-codes";
import { fmtDay } from "@/lib/billing-labels";
import { formatFcfa } from "@/lib/plan-pricing";
import type { BillingCodeRow, BillingCodeStatus } from "@/types";

const PAGE = 50;

const FILTERS: { value: BillingCodeStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tous" },
  { value: "available", label: "Disponibles" },
  { value: "redeemed", label: "Utilisés" },
  { value: "expired", label: "Expirés" },
  { value: "revoked", label: "Annulés" },
];

const EMPTY: Record<string, string> = {
  all: "Aucun code pour l'instant. Générez-en un lot, ou attendez les ventes du site.",
  available: "Aucun code disponible.",
  redeemed: "Aucun code n'a encore été utilisé.",
  expired: "Aucun code expiré.",
  revoked: "Aucun code annulé.",
};

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

export default function BillingCodesPage() {
  const { can } = usePermissions();
  const { addToast } = useToast();
  const [status, setStatus] = useState<BillingCodeStatus | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [toRevoke, setToRevoke] = useState<BillingCodeRow | null>(null);
  const [reason, setReason] = useState("");

  // La recherche part 350 ms après la dernière frappe, pas à chaque lettre.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, isError, refetch } = useBillingCodes({
    status, search: search || undefined, limit: PAGE, offset,
  });
  const { data: settings } = useBillingSettings();
  const revoke = useRevokeBillingCode();
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const canGenerate = can("billing.codes");
  const trialModel = settings?.model === 2;

  if (!can("billing.read")) {
    return <p className="py-20 text-center text-sm text-zinc-500">Accès réservé à l&apos;équipe d&apos;administration.</p>;
  }

  const closeRevoke = () => { setToRevoke(null); setReason(""); };
  const submitRevoke = () => {
    if (!toRevoke || reason.trim().length < 3) return;
    revoke.mutate({ id: toRevoke.id, reason: reason.trim() }, {
      onSuccess: () => { addToast({ title: "Code annulé", variant: "success" }); closeRevoke(); },
      onError: (e) => addToast({ title: "Annulation refusée", description: serverError(e), variant: "error" }),
    });
  };

  return (
    <div className="space-y-6">
      <BillingPageHeader
        subtitle="Les codes qui débloquent une année d'abonnement : générés ici, ou émis par le site de paiement."
        refreshing={isFetching}
        onRefresh={() => refetch()}
      />

      {settings && !trialModel && (
        <div className="flex gap-2.5 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Le régime en vigueur est <strong>Alanya Plus</strong>. Les codes fonctionnent aussi dans ce régime
            (ils donnent une période), mais ils sont pensés pour le régime <strong>essai</strong> — voir{" "}
            <Link href="/billing" className="underline hover:text-indigo-600">les réglages</Link>.
          </p>
        </div>
      )}

      {!canGenerate && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : seul un super-administrateur peut générer ou annuler des codes.
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Filtrer les codes"
          options={FILTERS}
          value={status}
          onChange={(v) => { setStatus(v); setOffset(0); }}
        />
        <div className="flex items-center gap-2">
          <Input
            aria-label="Rechercher un code"
            placeholder="Fin du code, libellé, commande, contact…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full lg:w-72"
          />
          {canGenerate && (
            <Button onClick={() => setGenerateOpen(true)} className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              Générer des codes
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isError ? (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-red-500">
                Impossible de charger les codes — la migration 090 est-elle appliquée ?
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              {search ? "Aucun code ne correspond à cette recherche." : EMPTY[status ?? "all"]}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Valable jusqu&apos;au</TableHead>
                  <TableHead>Utilisé par</TableHead>
                  {canGenerate && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-sm">
                      <KeyRound className="mr-1.5 inline h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-zinc-400">•••••-•••••-•</span>{r.hint}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.source === "web" ? "Site de paiement" : "Administration"}
                      {(r.label || r.orderRef || r.buyerContact) && (
                        <span className="block max-w-56 truncate text-xs text-zinc-400" title={r.label || r.orderRef || r.buyerContact || ""}>
                          {r.label || r.orderRef || r.buyerContact}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${CODE_STATUS_CLASS[r.status]}`}>{CODE_STATUS_LABEL[r.status]}</Badge>
                      {r.status === "revoked" && r.revokeReason && (
                        <span className="block max-w-48 truncate text-xs text-zinc-400" title={r.revokeReason}>{r.revokeReason}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {r.durationMonths} mois
                      <span className="block text-xs text-zinc-400">
                        {r.amountPaid > 0 ? formatFcfa(r.amountPaid) : "offert"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-zinc-500">{fmtDay(r.expiresAt)}</TableCell>
                    <TableCell className="text-sm">
                      {r.redeemedBy ? (
                        <>
                          <Link href={`/users/${r.redeemedBy}`} className="font-medium hover:text-indigo-600 hover:underline">
                            {r.redeemedByName || `Compte ${r.redeemedBy}`}
                          </Link>
                          <span className="block text-xs text-zinc-400">{fmtDay(r.redeemedAt)}</span>
                        </>
                      ) : "—"}
                    </TableCell>
                    {canGenerate && (
                      <TableCell className="text-right">
                        {r.status === "available" && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setToRevoke(r)}>
                            Annuler
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && total > PAGE && (
        <div className="flex items-center justify-between text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          <span>{offset + 1}–{Math.min(offset + PAGE, total)} sur {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Suivant</Button>
          </div>
        </div>
      )}

      <CodesGenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      <ConfirmDialog
        open={toRevoke != null}
        onOpenChange={(o) => !o && closeRevoke()}
        title="Annuler ce code ?"
        description={toRevoke
          ? `Le code se terminant par ${toRevoke.hint} ne pourra plus être utilisé. Un code déjà activé ne s'annule pas.`
          : undefined}
        confirmLabel="Annuler le code"
        variant="destructive"
        pending={revoke.isPending}
        onConfirm={submitRevoke}
      >
        <div className="space-y-1.5">
          <label htmlFor="revoke-reason" className="text-sm font-medium">Motif</label>
          <Textarea
            id="revoke-reason"
            rows={2}
            maxLength={255}
            value={reason}
            placeholder="Erreur de lot, code compromis…"
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Obligatoire. Enregistré dans l&apos;activité admin avec votre nom.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
