"use client";

/**
 * Coffre-fort.
 *
 * Deux volumes à ne pas confondre. « Compté » est ce que les inscrits voient
 * dans leur espace : un fichier enregistré par trois destinataires y compte
 * trois fois. « Chez MEGA » est ce qui est réellement stocké, chaque fichier
 * une fois — c'est celui-là qui est facturé.
 *
 * L'espace accordé par Alanya Plus ne se règle pas ici mais sur chaque plan
 * (page Abonnement) : il se vend avec l'abonnement.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Cloud, FileText, FileWarning, Film, HardDrive, Images, Loader2, Music, RefreshCw,
  Share2, ShieldAlert, Trash2, Upload, Vault,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatCardGridSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/ui/toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSafeboxAdmin, useUpdateSafeboxSettings } from "@/hooks/useSafebox";
import { cn } from "@/lib/utils";
import type { SafeboxAdminSettings, SafeboxFamily, SafeboxSettingsPayload } from "@/types";

const Mio = 1024 ** 2;
const Gio = 1024 ** 3;

const n = (v: number) => v.toLocaleString("fr-FR");

const octets = (v: number) => {
  if (!v) return "0 o";
  const u = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  return `${(v / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const dateLongue = (s: string | null) =>
  s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "jamais";

const FAMILLES: Array<{ cle: SafeboxFamily; libelle: string; icon: typeof Images; couleur: string }> = [
  { cle: "photos", libelle: "Photos", icon: Images, couleur: "#ec4899" },
  { cle: "videos", libelle: "Vidéos", icon: Film, couleur: "#6366f1" },
  { cle: "audios", libelle: "Audios", icon: Music, couleur: "#f59e0b" },
  { cle: "documents", libelle: "Documents", icon: FileText, couleur: "#10b981" },
];

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message
  || (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

// ── Réglages ────────────────────────────────────────────────────────────────

interface Brouillon {
  baseGo: string;
  maxFichierMo: string;
  maxFichierPlusMo: string;
  telechargements: string;
  profondeur: string;
  dossiers: string;
  extensions: Record<SafeboxFamily, string>;
}

const depuisReglages = (s: SafeboxAdminSettings): Brouillon => ({
  baseGo: String(Math.round((s.baseQuotaBytes / Gio) * 100) / 100),
  maxFichierMo: String(Math.round(s.maxFileBytes / Mio)),
  maxFichierPlusMo: String(Math.round(s.maxFileBytesPlus / Mio)),
  telechargements: String(s.shareDownloadsPerDay),
  profondeur: String(s.maxDepth),
  dossiers: String(s.maxFolders),
  extensions: Object.fromEntries(
    FAMILLES.map((f) => [f.cle, (s.extensions?.[f.cle] ?? []).join(", ")]),
  ) as Record<SafeboxFamily, string>,
});

const listeExtensions = (texte: string) =>
  Array.from(new Set(texte.split(/[\s,;]+/).map((e) => e.trim().toLowerCase().replace(/^\./, "")).filter(Boolean)));

/** Seuls les champs modifiés partent : un autre admin a pu changer le reste. */
function differences(s: SafeboxAdminSettings, b: Brouillon): { payload: SafeboxSettingsPayload; erreurs: string[] } {
  const payload: SafeboxSettingsPayload = {};
  const erreurs: string[] = [];

  // Comparaison au texte affiché, pas aux octets : un réglage qui ne tombe pas
  // juste en Go ou en Mo ne doit pas partir tout seul à chaque enregistrement.
  const affiche = depuisReglages(s);

  if (b.baseGo.trim() !== affiche.baseGo) {
    const go = Number(b.baseGo.trim().replace(",", "."));
    if (!/^\d+([.,]\d+)?$/.test(b.baseGo.trim()) || !Number.isFinite(go)) erreurs.push("Espace gratuit : un nombre de Go");
    else payload.base_quota_bytes = Math.round(go * Gio);
  }

  const champs: Array<[Exclude<keyof Brouillon, "extensions" | "baseGo">, keyof SafeboxSettingsPayload, string, number]> = [
    ["maxFichierMo", "max_file_bytes", "Taille maximale d'un fichier", Mio],
    ["maxFichierPlusMo", "max_file_bytes_plus", "Taille maximale avec Plus", Mio],
    ["telechargements", "share_downloads_per_day", "Téléchargements par jour", 1],
    ["profondeur", "max_depth", "Profondeur des dossiers", 1],
    ["dossiers", "max_folders", "Nombre de dossiers", 1],
  ];
  for (const [cle, champ, libelle, unite] of champs) {
    if (b[cle].trim() === affiche[cle]) continue;
    const v = /^\d+$/.test(b[cle].trim()) ? Number(b[cle].trim()) : NaN;
    if (!Number.isSafeInteger(v) || v < 1) { erreurs.push(`${libelle} : un entier positif`); continue; }
    (payload as Record<string, number>)[champ] = v * unite;
  }

  const exts = Object.fromEntries(FAMILLES.map((f) => [f.cle, listeExtensions(b.extensions[f.cle])])) as Record<SafeboxFamily, string[]>;
  for (const f of FAMILLES) {
    if (exts[f.cle].some((e) => !/^[a-z0-9]{1,10}$/.test(e))) erreurs.push(`${f.libelle} : extensions en lettres et chiffres`);
  }
  const extsModifiees = FAMILLES.some((f) => exts[f.cle].join(",") !== (s.extensions?.[f.cle] ?? []).join(","));
  if (extsModifiees) payload.extensions = exts;

  return { payload, erreurs };
}

function CarteReglages({ reglages, modifiable }: { reglages: SafeboxAdminSettings; modifiable: boolean }) {
  const { addToast } = useToast();
  const maj = useUpdateSafeboxSettings();
  const [brouillon, setBrouillon] = useState<Brouillon>(() => depuisReglages(reglages));
  const [base, setBase] = useState(reglages);
  // Les réglages ont changé côté serveur (rechargement, autre admin) : on repart d'eux.
  if (base !== reglages) {
    setBase(reglages);
    setBrouillon(depuisReglages(reglages));
  }
  const { payload, erreurs } = useMemo(() => differences(reglages, brouillon), [reglages, brouillon]);
  const modifie = Object.keys(payload).length > 0;
  const set = (cle: keyof Omit<Brouillon, "extensions">, v: string) => setBrouillon((b) => ({ ...b, [cle]: v }));

  const enregistrer = () => {
    if (erreurs.length || !modifie) return;
    maj.mutate(payload, {
      onSuccess: () => addToast({
        title: "Réglages enregistrés",
        description: "Les applications les reçoivent à leur prochaine ouverture du coffre.",
        variant: "success",
      }),
      onError: (e) => addToast({ title: "Enregistrement refusé", description: serverError(e), variant: "error" }),
    });
  };

  const champ = (libelle: string, cle: keyof Omit<Brouillon, "extensions">, suffixe: string, aide?: string) => (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{libelle}</span>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={brouillon[cle]}
          disabled={!modifiable || maj.isPending}
          onChange={(e) => set(cle, e.target.value)}
          className="pr-12 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">{suffixe}</span>
      </div>
      {aide && <p className="text-xs text-zinc-500 dark:text-zinc-400">{aide}</p>}
    </label>
  );

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Réglages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {champ("Espace gratuit", "baseGo", "Go", "L'espace avec Plus se règle sur chaque plan (Abonnement).")}
          {champ("Fichier max.", "maxFichierMo", "Mo", "Envoi et partage, sans abonnement.")}
          {champ("Fichier max. avec Plus", "maxFichierPlusMo", "Mo")}
          {champ("Téléchargements d'un fichier reçu", "telechargements", "/ 24 h", "Par destinataire. L'expéditeur n'est pas limité.")}
          {champ("Profondeur des dossiers", "profondeur", "niv.")}
          {champ("Dossiers par coffre", "dossiers", "max.")}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Extensions par famille</legend>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Décide du dossier racine d&apos;un fichier. Une extension absente des quatre listes va dans Documents.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAMILLES.map((f) => (
              <label key={f.cle} className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <f.icon className="h-3.5 w-3.5" style={{ color: f.couleur }} />
                  {f.libelle}
                </span>
                <Input
                  value={brouillon.extensions[f.cle]}
                  disabled={!modifiable || maj.isPending}
                  onChange={(e) => setBrouillon((b) => ({ ...b, extensions: { ...b.extensions, [f.cle]: e.target.value } }))}
                  className="font-mono text-xs"
                />
              </label>
            ))}
          </div>
        </fieldset>

        {erreurs.length > 0 && (
          <ul className="space-y-0.5 text-xs text-red-500">
            {erreurs.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        {modifiable && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Baisser l&apos;espace gratuit ne supprime rien : un coffre au-delà ne peut plus rien ajouter.
            </p>
            <span className="flex-1" />
            {modifie && (
              <Button variant="ghost" disabled={maj.isPending} onClick={() => setBrouillon(depuisReglages(reglages))}>
                Annuler
              </Button>
            )}
            <Button disabled={!modifie || erreurs.length > 0 || maj.isPending} onClick={enregistrer}>
              {maj.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SafeboxPage() {
  const { can } = usePermissions();
  const superAdmin = can("safebox.settings");
  const { data, isLoading, isFetching, isError, error, refetch } = useSafeboxAdmin();
  const nonInstalle = (error as { response?: { status?: number } } | null)?.response?.status === 503;

  const totalFamilles = data
    ? Math.max(1, FAMILLES.reduce((acc, f) => acc + (data.byFamily[f.cle]?.bytes || 0), 0))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Vault className="h-6 w-6 text-indigo-500" />
            Coffre-fort
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Fichiers chiffrés des inscrits chez MEGA, conservés sans limite de durée.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="shrink-0">
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {!superAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : seul un super-administrateur peut modifier les réglages.
        </div>
      )}

      {isError && (
        <ErrorState
          onRetry={() => refetch()}
          title={nonInstalle ? "Coffre-fort non installé" : "Impossible de charger le coffre-fort"}
          message={nonInstalle ? "La migration 101 n'est pas appliquée sur ce serveur." : "Le serveur est-il à jour ?"}
        />
      )}

      {!isError && isLoading && <StatCardGridSkeleton count={4} />}

      {!isError && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Coffres ouverts"
              value={data.totals.vaults}
              icon={Vault}
              color="#6366f1"
              subtitle={`${n(data.totals.files)} fichier(s)`}
            />
            <StatCard
              title="Stocké chez MEGA"
              value={octets(data.totals.megaBytes)}
              icon={HardDrive}
              color="#0ea5e9"
              subtitle={`compté dans les espaces : ${octets(data.totals.countedBytes)}`}
            />
            <StatCard
              title="Corbeilles"
              value={octets(data.totals.trashBytes)}
              icon={Trash2}
              color="#71717a"
              subtitle="vidées au bout de 30 jours"
            />
            <StatCard
              title="Partages (30 j)"
              value={data.totals.shares30d}
              icon={Share2}
              color="#10b981"
              subtitle={`${n(data.totals.shareDownloads30d)} téléchargement(s)`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Par famille</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {FAMILLES.map((f) => {
                  const v = data.byFamily[f.cle] ?? { files: 0, bytes: 0 };
                  return (
                    <div key={f.cle} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <f.icon className="h-4 w-4" style={{ color: f.couleur }} />
                        <span className="font-medium">{f.libelle}</span>
                        <span className="flex-1" />
                        <span className="tabular-nums text-zinc-500">{n(v.files)} · {octets(v.bytes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${(v.bytes / totalFamilles) * 100}%`, backgroundColor: f.couleur }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> {n(data.totals.pendingUploads)} envoi(s) en cours
                  </span>
                  <span className="flex items-center gap-1">
                    <Cloud className="h-3.5 w-3.5" /> rapprochement MEGA : {dateLongue(data.settings.lastReconcileAt)}
                    {data.totals.lostFiles === 0 ? " · aucun fichier perdu" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Plus gros coffres</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.topUsers.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-zinc-500">Aucun fichier pour l&apos;instant.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inscrit</TableHead>
                        <TableHead className="text-right">Fichiers</TableHead>
                        <TableHead className="text-right">Espace</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topUsers.map((u) => (
                        <TableRow key={u.alanyaID}>
                          <TableCell>
                            <Link href={`/users/${u.alanyaID}`} className="font-medium hover:underline">
                              {u.name || `#${u.alanyaID}`}
                            </Link>
                            {u.phone && <span className="block text-xs text-zinc-500 tabular-nums">{u.phone}</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{n(u.files)}</TableCell>
                          <TableCell className="text-right tabular-nums">{octets(u.bytes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fichiers dont le contenu a disparu chez MEGA (rapprochement
              hebdomadaire, migration 106). Rien ne se récupère : la liste sert
              à prévenir leurs propriétaires, qui ont peut-être l'original. */}
          {data.totals.lostFiles != null && data.totals.lostFiles > 0 && (
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileWarning className="h-4 w-4 text-red-500" />
                  Fichiers perdus chez MEGA : {n(data.totals.lostFiles)}
                </CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Leur contenu manquait au dernier rapprochement. L&apos;application les affiche « endommagés » ;
                  un contenu retrouvé la semaine suivante est démarqué tout seul.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead className="text-right">Taille</TableHead>
                      <TableHead className="text-right">Constaté</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.lost ?? []).map((l) => (
                      <TableRow key={l.fileId}>
                        <TableCell className="max-w-[16rem] truncate">{l.name}</TableCell>
                        <TableCell>
                          <Link href={`/users/${l.alanyaID}`} className="hover:underline">
                            {l.ownerName || `#${l.alanyaID}`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{octets(l.plainBytes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dateLongue(l.lostAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <CarteReglages reglages={data.settings} modifiable={superAdmin} />
        </>
      )}
    </div>
  );
}
