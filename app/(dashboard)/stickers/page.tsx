"use client";

/**
 * Catalogue des packs officiels.
 *
 * Un pack ne se supprime jamais : il se publie puis s'archive (contrat §7).
 * La liste dit donc où en est chacun dans cette chaîne, et prévient tant qu'un
 * brouillon n'a pas de quoi passer la publication.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Package, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { StickersPageHeader } from "@/components/stickers/StickersPageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCreateStickerPack, useStickerPacks } from "@/hooks/useStickers";
import { resolveTranslation } from "@/lib/content-locales";
import {
  STICKER_PACK_MIN,
  STICKER_PACK_STATUS_LABEL,
  STICKER_PACK_STATUS_STYLE,
  STICKER_VISIBILITY_LABEL,
} from "@/lib/sticker-labels";
import { cn } from "@/lib/utils";
import type { StickerPackRow, StickerPackStatus } from "@/types";

type Filtre = StickerPackStatus | "";

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "", label: "Tous" },
  { value: 0, label: "Brouillons" },
  { value: 1, label: "Publiés" },
  { value: 2, label: "Archivés" },
];

const VIDE: Record<string, string> = {
  "": "Aucun pack pour l'instant. Créez le premier.",
  "0": "Aucun brouillon en attente.",
  "1": "Aucun pack publié.",
  "2": "Aucun pack archivé.",
};

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/** Vignette de couverture, ou repli sobre quand aucune n'est choisie. */
function Cover({ pack }: { pack: StickerPackRow }) {
  if (pack.coverUrl) {
    return (
      <img
        src={pack.coverUrl}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-800 dark:bg-zinc-900"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-300 dark:border-zinc-700 dark:text-zinc-600">
      <Package className="h-6 w-6" />
    </div>
  );
}

function PackCard({ pack }: { pack: StickerPackRow }) {
  const nom = resolveTranslation(pack.nameI18n, "fr") || pack.code;
  const incomplet = pack.status === 0 && pack.stickerCount < STICKER_PACK_MIN;
  return (
    <Link
      href={`/stickers/${pack.id}`}
      className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
    >
      <Cover pack={pack} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{nom}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              STICKER_PACK_STATUS_STYLE[pack.status],
            )}
          >
            {STICKER_PACK_STATUS_LABEL[pack.status]}
          </span>
          {pack.isPremium === 1 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              Plus
            </span>
          )}
        </div>
        <p className="mt-1 truncate font-mono text-xs text-zinc-400">
          {pack.code} · {STICKER_VISIBILITY_LABEL[pack.visibility]} · v{pack.version}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {pack.stickerCount} sticker{pack.stickerCount > 1 ? "s" : ""}
          {incomplet && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              — minimum {STICKER_PACK_MIN} pour publier
            </span>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className="text-xs text-zinc-400">{fmtDate(pack.updatedAt)}</span>
        <ChevronRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-indigo-500" />
      </div>
    </Link>
  );
}

/** Création d'un brouillon : le code est facultatif, le nom français suffit. */
function NewPackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { addToast } = useToast();
  const create = useCreateStickerPack();
  const [code, setCode] = useState("");
  const [nomFr, setNomFr] = useState("");

  function submit() {
    if (!nomFr.trim()) return;
    create.mutate(
      {
        code: code.trim() || undefined,
        name_i18n: { fr: nomFr.trim() },
      },
      {
        onSuccess: (res) => {
          addToast({ title: "Pack créé", description: "Complétez les traductions avant de publier.", variant: "success" });
          onOpenChange(false);
          setCode("");
          setNomFr("");
          router.push(`/stickers/${res.id}`);
        },
        onError: (e: Error & { response?: { data?: { error?: string } } }) =>
          addToast({
            title: "Échec de la création",
            description: e.response?.data?.error || e.message,
            variant: "error",
          }),
      },
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau pack"
      description="Il démarre en brouillon, sans stickers. Les autres langues et la couverture se règlent dans l'éditeur."
      confirmLabel="Créer"
      pending={create.isPending}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-pack-name" className="text-sm font-medium">
            Nom (français)
          </label>
          <Input
            id="new-pack-name"
            value={nomFr}
            maxLength={80}
            placeholder="Les Classiques"
            onChange={(e) => setNomFr(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-pack-code" className="text-sm font-medium">
            Code <span className="font-normal text-zinc-400">(facultatif)</span>
          </label>
          <Input
            id="new-pack-code"
            value={code}
            maxLength={40}
            placeholder="derive-du-nom-si-vide"
            className="font-mono"
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Immuable une fois posé : il identifie le pack dans la charge utile des messages.
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}

export default function StickersPage() {
  const { can } = usePermissions();
  const canWrite = can("stickers.write");
  const [filtre, setFiltre] = useState<Filtre>("");
  const [recherche, setRecherche] = useState("");
  const rechercheDifferee = useDebouncedValue(recherche);
  const [creation, setCreation] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useStickerPacks({
    status: filtre === "" ? undefined : filtre,
    q: rechercheDifferee.trim() || undefined,
  });
  const packs = data ?? [];

  if (!can("stickers.read")) {
    return (
      <p className="py-20 text-center text-sm text-zinc-500">
        Accès réservé à l&apos;équipe d&apos;administration.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <StickersPageHeader
        subtitle="Les packs officiels, du brouillon à la publication."
        refreshing={isFetching}
        onRefresh={() => refetch()}
        actions={
          canWrite ? (
            <Button onClick={() => setCreation(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nouveau pack
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filtrer les packs" className="flex flex-wrap gap-1.5">
          {FILTRES.map((f) => {
            const actif = f.value === filtre;
            return (
              <button
                key={f.label}
                type="button"
                aria-pressed={actif}
                onClick={() => setFiltre(f.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  actif
                    ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {data && (
          <p className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
            {packs.length} pack{packs.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom ou un code…"
          className="pl-9 pr-9"
          aria-label="Rechercher un pack"
        />
        {recherche && (
          <button
            type="button"
            onClick={() => setRecherche("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} message="Impossible de charger les packs de stickers." />
      ) : packs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">Aucun pack</p>
            <p className="mt-1 text-sm text-zinc-500">
              {rechercheDifferee
                ? "Aucun résultat pour cette recherche."
                : VIDE[String(filtre)]}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packs.map((p) => (
            <PackCard key={p.id} pack={p} />
          ))}
        </div>
      )}

      <NewPackDialog open={creation} onOpenChange={setCreation} />
    </div>
  );
}
