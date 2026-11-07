"use client";

/**
 * Purges de rétention.
 *
 * Ces balayages suppriment définitivement des fichiers et des lignes.
 * L'écran répond à trois questions qu'on ne pouvait pas poser avant : qu'est-ce
 * qui va être supprimé, est-ce que ça tourne vraiment, et comment l'arrêter
 * sans redéployer.
 *
 * L'ordre est délibéré — volumétrie d'abord, commandes ensuite : on ne coupe ni
 * ne relance une suppression définitive sans avoir vu ce qu'elle s'apprête à
 * faire.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { PurgesContentSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/ui/toast";
import { usePermissions } from "@/hooks/usePermissions";
import { usePurges, useRunPurge, useUpdatePurge } from "@/hooks/usePurges";
import { cn } from "@/lib/utils";
import type { PurgeRun, PurgeSetting } from "@/types";
import {
  AlertTriangle, CheckCircle2, Clock, Database, Eraser, FileImage,
  Loader2, Megaphone, Power, RefreshCw, Route, ShieldAlert, Smile, Sparkles,
  TriangleAlert, Vault, XCircle,
} from "lucide-react";

const n = (v: number) => v.toLocaleString("fr-FR");

const octets = (v: number) => {
  if (!v) return "0 o";
  const u = ["o", "Ko", "Mo", "Go"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  return `${(v / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const dateLongue = (s: string | null) =>
  s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

const dateCourte = (s: string | null) =>
  s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Identité visuelle par purge — repérage immédiat dans la liste. */
const IDENTITE: Record<string, { icon: typeof Eraser; couleur: string }> = {
  media: { icon: FileImage, couleur: "#6366f1" },
  broadcast: { icon: Megaphone, couleur: "#0ea5e9" },
  story: { icon: Smile, couleur: "#ec4899" },
  welcome_status: { icon: Sparkles, couleur: "#a855f7" },
  trip: { icon: Route, couleur: "#f59e0b" },
  data_retention: { icon: Database, couleur: "#10b981" },
  safebox: { icon: Vault, couleur: "#64748b" },
};

/**
 * Traduit « ce qui serait supprimé » en langage lisible.
 *
 * La forme des statistiques varie d'une purge à l'autre (fichiers et octets
 * pour les médias, lignes par table pour la rétention générale, points et
 * trajets pour les traces GPS) : la traduction se fait ici plutôt que d'un
 * schéma commun côté serveur, qui aurait aplati l'information utile.
 */
function resumeStats(p: PurgeSetting): { total: number; lignes: string[] } {
  const s = p.stats as Record<string, never> | null;
  if (!s) return { total: 0, lignes: [] };

  if (p.name === "media") {
    const f = Number(s.fichiers) || 0;
    return {
      total: f,
      lignes: [
        `${n(f)} fichier${f > 1 ? "s" : ""} — ${octets(Number(s.octets) || 0)}`,
        s.plusAncien ? `le plus ancien remonte au ${dateLongue(String(s.plusAncien))}` : "",
      ].filter(Boolean),
    };
  }

  if (p.name === "data_retention") {
    // Tableau et non objet indexé : les noms de tables sont des valeurs, pour
    // survivre à la conversion camelCase appliquée aux clés par lib/api.ts.
    const cibles = (s.parCible || []) as Array<{
      table: string; lignes?: number; retention?: string; erreur?: string;
    }>;
    const total = cibles.reduce((acc, c) => acc + (c.lignes || 0), 0);
    return {
      total,
      lignes: cibles
        .filter((c) => (c.lignes || 0) > 0 || c.erreur)
        .map((c) => (c.erreur
          ? `${c.table} : erreur`
          : `${c.table} : ${n(c.lignes || 0)} ligne(s) au-delà de ${c.retention}`)),
    };
  }

  if (p.name === "story") {
    const l = Number(s.lignes) || 0;
    return {
      total: l,
      lignes: [
        `${n(l)} story${l > 1 ? "s" : ""} au-delà de la rétention`,
        s.plusAncienne
          ? `la plus ancienne a été publiée le ${dateLongue(String(s.plusAncienne))}`
          : "",
      ].filter(Boolean),
    };
  }

  if (p.name === "trip") {
    const exp = (s.expired || {}) as { points?: number; trips?: number };
    const sto = (s.stored || {}) as { points?: number; trips?: number };
    return {
      total: (exp.points || 0) + (exp.trips || 0),
      lignes: [
        `${n(exp.points || 0)} position(s) et ${n(exp.trips || 0)} trajet(s) échus`,
        `en base : ${n(sto.points || 0)} position(s), ${n(sto.trips || 0)} trajet(s)`,
      ],
    };
  }

  if (p.name === "safebox") {
    // Seuls les deux premiers comptes partent à la corbeille : les orphelins sont
    // des fichiers déjà sortis de tout coffre, qui n'attendent que MEGA.
    const corbeille = Number(s.corbeilleEchue) || 0;
    const abandons = Number(s.envoisAbandonnes) || 0;
    const orphelins = Number(s.orphelins) || 0;
    return {
      total: corbeille + abandons + orphelins,
      lignes: [
        `${n(corbeille)} élément(s) en corbeille depuis plus de 30 jours`,
        `${n(abandons)} envoi(s) abandonné(s), ${n(orphelins)} fichier(s) sans propriétaire chez MEGA`,
        `stocké : ${n(Number(s.blobsStockes) || 0)} fichier(s) — ${octets(Number(s.octetsStockes) || 0)}`,
        // Signalés, jamais supprimés : la page Coffre-fort les liste.
        Number(s.perdusChezMega) > 0 ? `${n(Number(s.perdusChezMega))} fichier(s) perdu(s) chez MEGA — voir la page Coffre-fort` : "",
      ].filter(Boolean),
    };
  }

  if (p.name === "e2ee_envelope") {
    const remises = Number(s.remises) || 0;
    const attente = Number(s.enAttente) || 0;
    const cles = Number(s.clesServies) || 0;
    return {
      total: remises + attente + cles,
      lignes: [
        `${n(remises)} enveloppe(s) remise(s), ${n(attente)} jamais remise(s)`,
        `${n(cles)} clé(s) à usage unique déjà servie(s)`,
      ],
    };
  }

  const l = Number(s.lignes) || 0;
  const suffixe = s.retentionFigee ? ` au-delà de ${s.retentionFigee}` : "";
  return { total: l, lignes: [`${n(l)} ligne${l > 1 ? "s" : ""}${suffixe}`] };
}

/**
 * Ce qu'un passage a supprimé, lu dans `result` (journal `purge_runs`).
 *
 * Même logique que `resumeStats` : chaque purge renvoie sa propre forme. Les
 * clés passent par la conversion camelCase de lib/api.ts (`job_queue` →
 * `jobQueue`), d'où la somme pour la rétention générale plutôt qu'un détail
 * par table.
 */
function resumeResultat(name: string, brut: unknown): string | null {
  let r = brut;
  if (typeof r === "string") {
    try { r = JSON.parse(r); } catch { return null; }
  }
  if (!r || typeof r !== "object") return null;
  const v = r as Record<string, unknown>;
  const k = (cle: string) => Number(v[cle]) || 0;

  switch (name) {
    case "media":
      return `${n(k("files"))} fichier(s)`;
    case "broadcast":
      return `${n(k("accuses"))} accusé(s)`;
    case "story":
      return `${n(k("statut"))} story(s), ${n(k("fichiers"))} fichier(s)`;
    case "welcome_status":
      return `${n(k("purged"))} statut(s)`;
    case "trip":
      return `${n(k("points"))} position(s), ${n(k("trips"))} trajet(s)`;
    case "backup_key_access":
      return `${n(k("supprimees"))} ligne(s)`;
    case "e2ee_envelope":
      return `${n(k("remises") + k("enAttente"))} enveloppe(s), ${n(k("clesServies"))} clé(s)`;
    case "safebox": {
      if (typeof v.ignore === "string") return `rien fait : ${v.ignore}`;
      const c = (v.corbeille || {}) as { fichiers?: number; dossiers?: number };
      return `${n((c.fichiers || 0) + (c.dossiers || 0))} élément(s) de corbeille, ${n(k("supprimes"))} fichier(s) chez MEGA`
        + (k("echecs") ? `, ${n(k("echecs"))} échec(s)` : "")
        + (k("rapproches") ? `, ${n(k("rapproches"))} rapproché(s)` : "")
        + (k("perdus") ? `, ${n(k("perdus"))} perdu(s) chez MEGA` : "");
    }
    case "data_retention":
      return `${n(Object.values(v).reduce<number>((acc, x) => acc + (Number(x) || 0), 0))} ligne(s)`;
    default:
      return null;
  }
}

function LigneHistorique({ run }: { run: PurgeRun }) {
  const supprime = run.ok ? resumeResultat(run.name, run.result) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
      {run.ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
      )}
      <span className="tabular-nums">{dateCourte(run.ranAt)}</span>
      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
        {run.triggerSource === "manual" ? "manuelle" : "auto"}
      </Badge>
      {run.byAdmin && <span className="truncate max-w-[14rem]">par {run.byAdmin}</span>}
      {supprime && <span className="tabular-nums">· {supprime}</span>}
      {run.durationMs != null && <span className="tabular-nums">· {n(run.durationMs)} ms</span>}
      {run.error && <span className="truncate text-red-500">· {run.error}</span>}
    </div>
  );
}

function CartePurge({ purge, superAdmin }: { purge: PurgeSetting; superAdmin: boolean }) {
  const { addToast } = useToast();
  const maj = useUpdatePurge();
  const run = useRunPurge();
  const [confirme, setConfirme] = useState(false);
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});

  const { total, lignes } = resumeStats(purge);
  const enCours = maj.isPending || run.isPending;
  const { icon: Icon, couleur } = IDENTITE[purge.name] ?? { icon: Eraser, couleur: "#6366f1" };
  const modifie = Object.keys(brouillon).length > 0;

  const basculer = () => {
    maj.mutate(
      { name: purge.name, enabled: !purge.enabled },
      {
        onSuccess: (r) =>
          addToast({
            title: r.enabled ? "Purge réactivée" : "Purge désactivée",
            description: r.enabled
              ? "Le balayage automatique reprend au prochain tour."
              : "Le balayage automatique ne s'exécutera plus. La purge manuelle reste possible.",
            variant: "success",
          }),
        onError: () => addToast({ title: "Échec de la mise à jour", variant: "error" }),
      },
    );
  };

  const enregistrerReglages = () => {
    const overrides: Record<string, number | null> = {};
    for (const k of purge.knobs) {
      const v = brouillon[k.key];
      if (v === undefined) continue;
      overrides[k.key] = v === "" ? null : Number(v);
    }
    if (!Object.keys(overrides).length) return;
    maj.mutate(
      { name: purge.name, overrides },
      {
        onSuccess: () => {
          setBrouillon({});
          addToast({
            title: "Durées mises à jour",
            description: "Une valeur hors bornes est ramenée au plus proche autorisé.",
            variant: "success",
          });
        },
        onError: () => addToast({ title: "Échec de la mise à jour", variant: "error" }),
      },
    );
  };

  return (
    <Card
      className={cn(
        "border-0 shadow-sm bg-white dark:bg-zinc-900 transition-opacity",
        !purge.enabled && "opacity-75",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: `${couleur}1a` }}
            >
              <Icon className="h-5 w-5" style={{ color: couleur }} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold tracking-tight">{purge.label}</h2>
                {purge.enabled ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                    active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                    désactivée
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{purge.description}</p>
              {purge.updatedBy && (
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Dernier réglage par {purge.updatedBy} · {dateCourte(purge.updatedAt)}
                </p>
              )}
            </div>
          </div>
          {superAdmin && (
            <Button
              variant={purge.enabled ? "outline" : "default"}
              size="sm"
              disabled={enCours}
              onClick={basculer}
              className="shrink-0"
            >
              {maj.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-1.5 h-4 w-4" />
              )}
              {purge.enabled ? "Désactiver" : "Activer"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Volumétrie — délibérément avant les commandes. */}
        <div
          className={cn(
            "rounded-lg border p-3",
            total > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40",
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            {purge.statsErreur ? (
              <TriangleAlert className="h-4 w-4 text-red-500" />
            ) : total > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {purge.statsErreur
              ? "Comptage indisponible"
              : total > 0
                ? "Serait supprimé au prochain passage"
                : "Rien à supprimer pour l'instant"}
          </div>
          {purge.statsErreur ? (
            <p className="text-xs text-red-500">{purge.statsErreur}</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {lignes.map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
        </div>

        {/* Durées de rétention */}
        {purge.knobs.length > 0 ? (
          <div className="space-y-2">
            {purge.knobs.map((k) => {
              const surcharge = k.valeur !== k.defaut;
              return (
                <div key={k.key} className="flex flex-wrap items-center gap-2 text-sm">
                  <label
                    className="min-w-[13rem] text-zinc-600 dark:text-zinc-400"
                    htmlFor={`${purge.name}-${k.key}`}
                  >
                    {k.label}
                  </label>
                  <input
                    id={`${purge.name}-${k.key}`}
                    type="number"
                    min={k.min}
                    max={k.max}
                    disabled={!superAdmin || enCours}
                    value={brouillon[k.key] ?? String(k.valeur)}
                    onChange={(e) => setBrouillon((b) => ({ ...b, [k.key]: e.target.value }))}
                    className="h-8 w-24 rounded-md border bg-background px-2 tabular-nums disabled:opacity-60"
                  />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {k.unit} · de {k.min} à {k.max}
                  </span>
                  {surcharge && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      défaut : {k.defaut}
                    </Badge>
                  )}
                </div>
              );
            })}
            {superAdmin && modifie && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={enregistrerReglages} disabled={enCours}>
                  Enregistrer les durées
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBrouillon({})} disabled={enCours}>
                  Annuler
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Durées figées dans le code pour cette purge — non modifiables ici.
          </p>
        )}

        {/* Historique : c'est lui qui distingue « rien à supprimer » de « ne tourne pas ». */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <Clock className="h-3.5 w-3.5" /> Dernières exécutions
          </div>
          {purge.runs.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Aucune exécution enregistrée — le journal ne démarre qu&apos;avec cette version.
            </p>
          ) : (
            purge.runs.map((r) => <LigneHistorique key={r.id} run={r} />)
          )}
        </div>

        {superAdmin && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button variant="outline" size="sm" disabled={enCours} onClick={() => setConfirme(true)}>
              {run.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="mr-1.5 h-4 w-4" />
              )}
              Purger maintenant
            </Button>
            {!purge.enabled && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Possible même désactivée : seul le balayage automatique est coupé.
              </span>
            )}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirme}
        onOpenChange={setConfirme}
        title={`Purger « ${purge.label} » maintenant ?`}
        description={
          total > 0
            ? `${lignes.join(" · ")}. Cette suppression est définitive et sans retour.`
            : "Rien ne semble à supprimer pour l'instant : l'exécution sera sans effet."
        }
        confirmLabel="Purger"
        variant="destructive"
        pending={run.isPending}
        onConfirm={() => {
          setConfirme(false);
          run.mutate(purge.name, {
            onSuccess: () =>
              addToast({ title: `Purge « ${purge.label} » exécutée`, variant: "success" }),
            onError: (e: unknown) =>
              addToast({
                title: "Échec de la purge",
                description:
                  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
                  || (e instanceof Error ? e.message : undefined),
                variant: "error",
              }),
          });
        }}
      />
    </Card>
  );
}

export default function PurgesPage() {
  const { can } = usePermissions();
  const superAdmin = can("purges.settings");
  const { data, isLoading, isFetching, isError, refetch } = usePurges();

  // Même règle que la page Rétention des traces : le squelette couvre le
  // premier chargement, jamais un refetch en fond — sinon les compteurs
  // clignoteraient à chaque bascule d'interrupteur.
  const showSkeleton = isLoading || (isFetching && !data);

  const recap = useMemo(() => {
    const purges = data || [];
    return {
      actives: purges.filter((p) => p.enabled).length,
      totales: purges.length,
      aSupprimer: purges.reduce((acc, p) => acc + resumeStats(p).total, 0),
      enEchec: purges.filter((p) => p.runs.some((r) => !r.ok)).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Eraser className="h-6 w-6 text-indigo-500" />
            Purges de rétention
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ce que le serveur supprime automatiquement, et quand. Les suppressions sont définitives.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {!superAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : seul un super-administrateur peut modifier ou déclencher une purge.
        </div>
      )}

      {isError && (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm mb-3">
            Impossible de charger les purges — le serveur est-il à jour ?
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      )}

      {!isError && showSkeleton && <PurgesContentSkeleton />}

      {!isError && !showSkeleton && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Purges actives"
              value={`${recap.actives} / ${recap.totales}`}
              icon={Power}
              color="#10b981"
              subtitle={
                recap.actives === recap.totales
                  ? "toutes en service"
                  : `${recap.totales - recap.actives} coupée(s)`
              }
            />
            <StatCard
              title="En attente de suppression"
              value={recap.aSupprimer}
              icon={AlertTriangle}
              color="#f59e0b"
              subtitle="fichiers et lignes, tous balayages confondus"
            />
            <StatCard
              title="Purges en échec"
              value={recap.enEchec}
              icon={TriangleAlert}
              color={recap.enEchec > 0 ? "#ef4444" : "#71717a"}
              subtitle={
                recap.enEchec > 0
                  ? "une exécution récente a échoué"
                  : "aucun échec récent"
              }
            />
          </div>

          <div className="grid gap-4">
            {data.map((p) => (
              <CartePurge key={p.name} purge={p} superAdmin={superAdmin} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
