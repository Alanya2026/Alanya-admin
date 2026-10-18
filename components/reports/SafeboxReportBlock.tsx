"use client";

/**
 * Fichier du coffre-fort signalé dans une discussion (message de type 11).
 *
 * Décision du 18/10/2026, trois gestes, du plus léger au plus lourd :
 *  A. voir l'aperçu du fichier, déchiffré par le serveur — on juge sans
 *     télécharger jusqu'à 1 Go ;
 *  B. retirer tous ses partages : plus personne ne le télécharge, mais les
 *     copies déjà enregistrées dans des coffres restent ;
 *  C. le supprimer partout, copies comprises, puis chez MEGA. Irréversible :
 *     super-admin seulement.
 *
 * Chaque geste s'inscrit dans l'historique du signalement. Il ne le clôt pas :
 * « Sanction appliquée » reste la décision de la personne qui modère.
 */

import { useState } from "react";
import { Ban, FileText, Film, Images, Loader2, Music, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDeleteReportSafebox, useReportSafebox, useRevokeReportSafebox } from "@/hooks/useReports";
import type { Report, SafeboxFamily } from "@/types";

const ICONE: Record<SafeboxFamily, typeof Images> = {
  albums: Images,
  videos: Film,
  audios: Music,
  documents: FileText,
};

const FAMILLE: Record<SafeboxFamily, string> = {
  albums: "photo",
  videos: "vidéo",
  audios: "audio",
  documents: "document",
};

const octets = (v: number) => {
  if (!v) return "0 o";
  const u = ["o", "Ko", "Mo", "Go"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  return `${(v / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const erreurServeur = (e: unknown) =>
  (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
  || (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

export function SafeboxReportBlock({
  report,
  canHandle,
  canDelete,
}: {
  report: Report;
  canHandle: boolean;
  canDelete: boolean;
}) {
  const { addToast } = useToast();
  const { data, isLoading, isError } = useReportSafebox(report.id);
  const retirer = useRevokeReportSafebox();
  const supprimer = useDeleteReportSafebox();
  const [geste, setGeste] = useState<"revoke" | "delete" | null>(null);
  const [note, setNote] = useState("");

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Fichier du coffre-fort…
      </p>
    );
  }
  if (isError || !data) {
    return <p className="text-sm italic text-zinc-400">Fichier du coffre-fort introuvable pour ce signalement.</p>;
  }

  const Icone = ICONE[data.family] ?? FileText;
  const copies = Math.max(0, data.vaults - 1);

  const confirmer = () => {
    const appel = geste === "delete" ? supprimer : retirer;
    appel.mutate(
      { id: report.id, note: note.trim() || undefined },
      {
        onSuccess: (r) => {
          setGeste(null);
          setNote("");
          addToast({
            title: geste === "delete" ? "Fichier supprimé partout" : "Partages retirés",
            description: geste === "delete"
              ? "Coffres de l'expéditeur et des destinataires, puis MEGA."
              : `${(r as { revoked: number }).revoked} partage(s) retiré(s) : plus aucun téléchargement.`,
            variant: "success",
          });
        },
        onError: (e) => addToast({ title: "Échec", description: erreurServeur(e), variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {data.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu en data: déchiffré par le serveur
          <img
            src={data.preview}
            alt={`Aperçu de ${data.name}`}
            className="max-h-48 w-full rounded-md bg-zinc-100 object-contain sm:w-56 dark:bg-zinc-800"
          />
        ) : (
          <div className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-md bg-zinc-100 text-xs text-zinc-400 sm:w-56 dark:bg-zinc-800">
            <Icone className="h-8 w-8" />
            {data.previewError ? "aperçu illisible" : "pas d'aperçu"}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="break-words text-sm font-medium">📦 {data.name}</p>
          <p className="text-xs text-zinc-500">
            {FAMILLE[data.family] ?? "fichier"} · {octets(data.plainBytes)} · envoyé le{" "}
            {new Date(data.createdAt).toLocaleString("fr-FR")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.fileDeleted && <Badge variant="secondary">supprimé</Badge>}
            {!data.fileDeleted && data.trashed && <Badge variant="secondary">à la corbeille de l&apos;expéditeur</Badge>}
            {data.revokedAt && <Badge variant="secondary">partages retirés par la modération</Badge>}
          </div>
          {!data.fileDeleted && (
            <p className="text-xs text-zinc-500">
              Dans {data.vaults} coffre{data.vaults > 1 ? "s" : ""}
              {copies > 0 ? ` (dont ${copies} copie${copies > 1 ? "s" : ""} enregistrée${copies > 1 ? "s" : ""})` : ""}
              {" · "}
              {data.activeShares} partage{data.activeShares > 1 ? "s" : ""} actif{data.activeShares > 1 ? "s" : ""}
              {data.recipients != null ? ` · reçu par ${data.recipients} personne${data.recipients > 1 ? "s" : ""}` : ""}
            </p>
          )}
        </div>
      </div>

      {!data.fileDeleted && (canHandle || canDelete) && (
        <div className="flex flex-wrap gap-2">
          {canHandle && data.activeShares > 0 && (
            <Button variant="outline" size="sm" onClick={() => setGeste("revoke")}>
              <Ban className="mr-1.5 h-4 w-4" /> Retirer tous les partages
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => setGeste("delete")}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Supprimer partout
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={geste != null}
        onOpenChange={(o) => {
          if (!o) {
            setGeste(null);
            setNote("");
          }
        }}
        title={geste === "delete" ? "Supprimer ce fichier partout ?" : "Retirer tous les partages ?"}
        description={
          geste === "delete"
            ? `Irréversible. Le fichier disparaît du coffre de l'expéditeur${copies > 0 ? ` et des ${copies} copie(s) enregistrée(s) par d'autres` : ""}, puis chez MEGA, qui n'en garde aucune copie.`
            : "Plus personne ne pourra le télécharger : la carte affiche « Fichier retiré par la modération ». Les copies déjà enregistrées dans des coffres restent — « Supprimer partout » les efface."
        }
        confirmLabel={geste === "delete" ? "Supprimer partout" : "Retirer"}
        variant={geste === "delete" ? "destructive" : "default"}
        pending={retirer.isPending || supprimer.isPending}
        onConfirm={confirmer}
      >
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (facultative) — ce que vous avez constaté"
          maxLength={500}
        />
      </ConfirmDialog>
    </div>
  );
}
