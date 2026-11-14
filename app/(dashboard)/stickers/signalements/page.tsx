"use client";

/**
 * File de modération des stickers personnels signalés.
 *
 * Le retrait supprime le fichier et bloque son empreinte côté serveur : un
 * ré-envoi identique est ensuite refusé. La décision est journalisée sous la
 * permission `stickers.moderate`.
 */

import { useState } from "react";
import { ImageOff, ShieldCheck, ShieldQuestion, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { StickersPageHeader } from "@/components/stickers/StickersPageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useStickerReports, useTakedownStickerAsset } from "@/hooks/useStickers";
import { stickerReportReasonLabel, stickerReportStatusLabel } from "@/lib/sticker-labels";
import { cn } from "@/lib/utils";
import type { StickerReportRow } from "@/types";

function age(iso: string | null): string {
  if (!iso) return "date inconnue";
  const heures = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${heures} h`;
  return `il y a ${Math.floor(heures / 24)} j`;
}

const erreurServeur = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
  (e instanceof Error ? e.message : undefined);

export default function StickerReportsPage() {
  const { can } = usePermissions();
  const canModerate = can("stickers.moderate");
  const { addToast } = useToast();
  const { data, isLoading, isFetching, isError, refetch } = useStickerReports();
  const takedown = useTakedownStickerAsset();

  const [aRetirer, setARetirer] = useState<StickerReportRow | null>(null);
  const [apercu, setApercu] = useState<StickerReportRow | null>(null);

  const rapports = data ?? [];
  const enAttente = rapports.filter((r) => r.assetStatus === 0).length;

  function confirmerRetrait() {
    if (!aRetirer) return;
    takedown.mutate(aRetirer.assetId, {
      onSuccess: () => {
        addToast({ title: "Sticker retiré", description: "Le fichier est supprimé et son empreinte bloquée.", variant: "success" });
        setARetirer(null);
      },
      onError: (e) => {
        addToast({ title: "Retrait refusé", description: erreurServeur(e), variant: "error" });
        setARetirer(null);
      },
    });
  }

  if (!canModerate) {
    return (
      <p className="py-20 text-center text-sm text-zinc-500">
        Accès réservé aux modérateurs (<code className="font-mono">stickers.moderate</code>).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <StickersPageHeader
        subtitle="Les stickers personnels signalés, les plus anciens d'abord."
        refreshing={isFetching}
        onRefresh={() => refetch()}
      />

      {enAttente > 0 && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          <strong>{enAttente}</strong> sticker{enAttente > 1 ? "s" : ""} encore actif{enAttente > 1 ? "s" : ""} dans
          la file.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} message="Impossible de charger les signalements." />
      ) : rapports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <ShieldQuestion className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">Aucun signalement</p>
            <p className="mt-1 text-sm text-zinc-500">Rien n&apos;attend de décision.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rapports.map((r) => {
            const retire = r.assetStatus === 1;
            return (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={() => setApercu(r)}
                    className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900"
                    aria-label="Agrandir l'aperçu"
                  >
                    {r.thumbUrl || r.url ? (
                      <img src={r.thumbUrl || r.url} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageOff className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {stickerReportReasonLabel(r.reason)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          retire
                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
                        )}
                      >
                        {retire ? "Retiré" : stickerReportStatusLabel(r.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Signalé par {r.reporterNom ?? r.reporterPseudo ?? "un compte supprimé"} · {age(r.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Asset #{r.assetId} · compte #{r.reporterId}
                    </p>

                    {canModerate && !retire && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setARetirer(r)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Retirer le sticker
                        </Button>
                      </div>
                    )}
                    {retire && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Fichier supprimé, empreinte bloquée
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={apercu != null} onOpenChange={(o) => !o && setApercu(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {apercu ? stickerReportReasonLabel(apercu.reason) : ""}
            </DialogTitle>
            <DialogDescription>
              Aperçu du sticker signalé. Le retrait supprime le fichier pour tout le monde.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            {apercu && (apercu.url || apercu.thumbUrl) ? (
              <img src={apercu.url || apercu.thumbUrl || ""} alt="" className="max-h-[60vh] max-w-full object-contain" />
            ) : (
              <p className="text-sm text-zinc-500">Image indisponible.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={aRetirer != null}
        onOpenChange={(o) => !o && setARetirer(null)}
        title="Retirer ce sticker ?"
        description="Le fichier est supprimé et son empreinte ajoutée à la liste de blocage : le même contenu ne pourra plus être envoyé. Les messages déjà reçus afficheront « Sticker retiré »."
        confirmLabel="Retirer"
        variant="destructive"
        pending={takedown.isPending}
        onConfirm={confirmerRetrait}
      />
    </div>
  );
}
