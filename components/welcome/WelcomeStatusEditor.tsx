"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  Radio,
  Save,
  Trash2,
  Undo2,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import type { PreviewContent } from "@/components/preview/PreviewStage";
import { StatusBackgroundPicker } from "@/components/preview/StatusBackgroundPicker";
import type { PreviewLang } from "@/components/preview/types";
import { useSaveWelcomeStatus, useWelcomeStatus } from "@/hooks/useWelcome";
import { cn } from "@/lib/utils";
import { emptyStatusBlock } from "@/lib/welcome-status";
import {
  WELCOME_STATUS_TEXT_MAX,
  type WelcomeStatusBlock,
  type WelcomeStatusConfig,
} from "@/types";
import {
  CONTENT_LOCALE_LABELS,
  resolveTranslation,
  untranslatedRequiredLocales,
} from "@/lib/content-locales";

const TYPES = [
  { value: 0, label: "Texte", icon: FileText },
  { value: 1, label: "Image", icon: ImageIcon },
  { value: 2, label: "Vidéo", icon: Video },
] as const;

const EMPTY: WelcomeStatusConfig = {
  enabled: false,
  blocks: [],
  updatedAt: null,
  updatedBy: null,
  supportsMultiple: true,
};

interface WelcomeStatusEditorProps {
  senderName?: string;
  senderAvatar?: string | null;
}

const SERVER_TOO_OLD =
  "Ce serveur n'enregistre qu'un seul élément : déployez la version qui gère les statuts multiples avant d'en ajouter d'autres.";

/**
 * Ce qui empêche un élément d'être livré, ou `null` s'il est complet.
 *
 * Miroir de `statusBlockError`
 * (Alanya-Backend/src/services/welcomeService.js) : l'éditeur doit refuser avec
 * la même règle que le serveur, sinon l'administrateur découvre le refus au
 * moment d'activer.
 */
function blockError(block: WelcomeStatusBlock, index: number): string | null {
  const n = index + 1;
  if (block.type === 0 && !block.translations.fr?.trim()) {
    return `Élément ${n} : un statut texte exige un texte en français.`;
  }
  const missing = untranslatedRequiredLocales(block.translations);
  if (missing.length) {
    return `Élément ${n} : traduction manquante — ${missing
      .map((l) => CONTENT_LOCALE_LABELS[l])
      .join(", ")}.`;
  }
  if (block.type !== 0 && !block.mediaUrl.trim()) {
    return `Élément ${n} : un statut ${block.type === 1 ? "image" : "vidéo"} exige un média.`;
  }
  const tooLong = Object.values(block.translations).find(
    (v) => (v ?? "").length > WELCOME_STATUS_TEXT_MAX,
  );
  if (tooLong != null) {
    return `Élément ${n} : texte limité à ${WELCOME_STATUS_TEXT_MAX} caractères.`;
  }
  return null;
}

/**
 * Statut de bienvenue — réglage global, hors versionnement du message.
 *
 * Conséquence assumée sur l'interface : l'interrupteur enregistre tout de suite
 * (il doit faire ce qu'il dit), tandis que le contenu passe par un bouton
 * « Enregistrer ». Sans cette distinction, activer le statut publierait aussi
 * une rédaction en cours.
 */
export function WelcomeStatusEditor({ senderName, senderAvatar }: WelcomeStatusEditorProps) {
  const { data, isLoading } = useWelcomeStatus();
  const saveMutation = useSaveWelcomeStatus();
  const { addToast } = useToast();

  const [form, setForm] = useState<WelcomeStatusConfig>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [lang, setLang] = useState<PreviewLang>("fr");
  /** Élément montré dans l'aperçu — un seul statut s'affiche à la fois. */
  const [selected, setSelected] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
      setDirty(false);
    }
  }, [data]);

  const blocks = form.blocks;
  // Supprimer le dernier élément laisse `selected` au-delà de la liste : on le
  // ramène ici plutôt qu'à chacun de ses trois points d'usage.
  const selectedIndex = Math.min(selected, blocks.length - 1);
  const current = blocks[selectedIndex];
  /** Serveur d'avant la 071 : un seul élément est enregistrable. */
  const locked = !form.supportsMultiple && blocks.length >= 1;

  function patchBlocks(next: WelcomeStatusBlock[]) {
    setForm((f) => ({ ...f, blocks: next.map((b, i) => ({ ...b, sortOrder: i })) }));
    setDirty(true);
  }

  function updateBlock(index: number, patch: Partial<WelcomeStatusBlock>) {
    patchBlocks(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBlock(type: number) {
    patchBlocks([...blocks, emptyStatusBlock(type, blocks.length)]);
    setSelected(blocks.length);
  }

  function removeBlock(index: number) {
    patchBlocks(blocks.filter((_, i) => i !== index));
    setSelected((s) => (s > index ? s - 1 : s));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    patchBlocks(next);
    setSelected(j);
  }

  const contentError = useMemo(
    () => form.blocks.map(blockError).find((m) => m != null) ?? null,
    [form.blocks],
  );

  const previewContent = useMemo<PreviewContent>(
    () => ({
      mode: "status",
      // Le statut porte toutes ses langues ; l'app choisit selon la locale du
      // téléphone, avec la chaîne de repli quand la traduction manque.
      text: current ? resolveTranslation(current.translations, lang) : "",
      type: current?.type ?? 0,
      mediaUrl: current?.mediaUrl ?? "",
      backgroundColor: current?.backgroundColor ?? "",
      senderName: senderName || "Alanya",
      senderAvatar,
    }),
    [current, lang, senderName, senderAvatar],
  );

  function save(next: Partial<WelcomeStatusConfig>, successTitle: string) {
    saveMutation.mutate(
      { ...form, ...next },
      {
        onSuccess: () => {
          setDirty(false);
          addToast({ title: successTitle, variant: "success" });
        },
        onError: (e: Error & { response?: { data?: { error?: string } } }) =>
          addToast({
            title: "Échec",
            description: e.response?.data?.error || e.message,
            variant: "error",
          }),
      },
    );
  }

  /**
   * Rend le formulaire à la dernière version enregistrée.
   *
   * `data` et non `EMPTY` : le cache react-query est réécrit à chaque
   * enregistrement réussi, il porte donc l'état du serveur, interrupteur
   * compris — celui-ci s'enregistre seul et ne doit pas retomber ici.
   */
  function discardChanges() {
    setForm(data ?? EMPTY);
    // L'élément affiché a pu être supprimé ou déplacé par les modifications
    // qu'on vient d'annuler : repartir du premier est le seul rang sûr.
    setSelected(0);
    setDirty(false);
    setConfirmDiscard(false);
  }

  function toggleEnabled() {
    const next = !form.enabled;
    if (next && (contentError || !blocks.length)) {
      addToast({
        title: "Contenu incomplet",
        description: contentError ?? "Ajoutez au moins un élément avant d'activer.",
        variant: "error",
      });
      return;
    }
    setForm((f) => ({ ...f, enabled: next }));
    save({ enabled: next }, next ? "Statut de bienvenue activé" : "Statut de bienvenue désactivé");
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-amber-500" />
              Statut de bienvenue
            </CardTitle>
            <CardDescription>
              Chaque élément devient un statut de 24 h, publié dans cet ordre pour chaque
              nouvel inscrit et visible de lui seul
            </CardDescription>
          </div>

          <EnabledSwitch
            checked={form.enabled}
            pending={saveMutation.isPending}
            onChange={toggleEnabled}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Ajouter
              </span>
              {TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  title={locked ? SERVER_TOO_OLD : undefined}
                  onClick={() => addBlock(t.value)}
                >
                  <t.icon className="mr-1 h-4 w-4" /> {t.label}
                </Button>
              ))}
            </div>

            {/* Mieux vaut interdire l'ajout que laisser le deuxième élément
                disparaître à l'enregistrement : le serveur d'avant la 071 ne
                lit que le statut unique. */}
            {locked && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400">
                {SERVER_TOO_OLD}
              </p>
            )}

            {blocks.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Aucun élément
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Le statut ne part pas tant qu&apos;il est vide, même actif.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {blocks.map((block, index) => (
                <StatusBlockCard
                  key={block.id ?? `new-${index}`}
                  block={block}
                  index={index}
                  total={blocks.length}
                  lang={lang}
                  selected={index === selectedIndex}
                  error={blockError(block, index)}
                  onSelect={() => setSelected(index)}
                  onUpdate={(patch) => updateBlock(index, patch)}
                  onMove={(dir) => moveBlock(index, dir)}
                  onRemove={() => removeBlock(index)}
                />
              ))}
            </div>

            {contentError && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400">
                {contentError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button
                onClick={() => save({}, "Statut enregistré")}
                disabled={!dirty || !!contentError || saveMutation.isPending}
                variant="outline"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Enregistrer le statut
              </Button>
              {dirty && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDiscard(true)}
                    disabled={saveMutation.isPending}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    Annuler les modifications
                  </Button>
                  <span className="text-xs text-amber-600 dark:text-amber-500">
                    Modifications non enregistrées
                  </span>
                </>
              )}
              <span className="ml-auto text-xs text-zinc-400">
                Prend effet immédiatement, sans publication
              </span>
            </div>
          </div>

          <div className="self-start xl:sticky xl:top-6">
            <PreviewPanel
              content={previewContent}
              lang={lang}
              onLangChange={setLang}
              modalTitle="Statut de bienvenue"
            />
            {blocks.length > 1 && (
              <p className="mt-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Élément {selectedIndex + 1} sur {blocks.length} —
                cliquez une carte pour l&apos;afficher
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {/* Rendu par un portail : sa place dans l'arbre n'a pas d'incidence. */}
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Annuler les modifications ?"
        description="Le statut revient à sa dernière version enregistrée. Ce qui n'a pas été enregistré est perdu."
        confirmLabel="Annuler les modifications"
        cancelLabel="Continuer l'édition"
        variant="destructive"
        onConfirm={discardChanges}
      />
    </Card>
  );
}

/* ── Carte d'élément ─────────────────────────────────────────────────────── */

interface StatusBlockCardProps {
  block: WelcomeStatusBlock;
  index: number;
  total: number;
  lang: PreviewLang;
  selected: boolean;
  error: string | null;
  onSelect: () => void;
  onUpdate: (patch: Partial<WelcomeStatusBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function StatusBlockCard({
  block,
  index,
  total,
  lang,
  selected,
  error,
  onSelect,
  onUpdate,
  onMove,
  onRemove,
}: StatusBlockCardProps) {
  const meta = TYPES.find((t) => t.value === block.type) ?? TYPES[0];
  const Icon = meta.icon;
  const activeText = block.translations[lang] ?? "";
  const remaining = WELCOME_STATUS_TEXT_MAX - activeText.length;
  const missing = untranslatedRequiredLocales(block.translations);

  return (
    <div
      onFocusCapture={onSelect}
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-white transition-colors dark:bg-zinc-900",
        selected
          ? "border-amber-300 dark:border-amber-700"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800">
          {index + 1}
        </span>
        <Icon className="h-4 w-4 text-zinc-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {meta.label}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Monter"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Descendre"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            aria-label="Supprimer l'élément"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <Label>Nature</Label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const active = block.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onUpdate({ type: t.value })}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400",
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            {block.type === 0 ? "Texte" : "Légende"} {lang.toUpperCase()}
          </Label>
          <textarea
            value={activeText}
            maxLength={WELCOME_STATUS_TEXT_MAX}
            rows={3}
            placeholder={block.type === 0 ? "Bienvenue sur Alanya !" : "Légende (optionnelle)"}
            onChange={(e) =>
              onUpdate({ translations: { ...block.translations, [lang]: e.target.value } })
            }
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between text-xs">
            {missing.length > 0 ? (
              <span className="text-red-600 dark:text-red-400">
                Traduction obligatoire :{" "}
                {missing.map((l) => CONTENT_LOCALE_LABELS[l]).join(", ")}.
              </span>
            ) : (
              <span />
            )}
            <span className={cn("tabular-nums", remaining < 20 ? "text-amber-600" : "text-zinc-400")}>
              {remaining}
            </span>
          </div>
        </div>

        {block.type === 0 ? (
          <StatusBackgroundPicker
            value={block.backgroundColor}
            onChange={(backgroundColor) => onUpdate({ backgroundColor })}
          />
        ) : (
          <div className="space-y-2">
            <Label>Média</Label>
            {block.mediaUrl ? (
              <p className="truncate text-xs text-zinc-500">{block.mediaUrl}</p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Obligatoire pour un statut {block.type === 1 ? "image" : "vidéo"}.
              </p>
            )}
            <FileUpload
              endpoint="/upload/official"
              accept={block.type === 1 ? "image/*" : "video/*"}
              maxSize={50 * 1024 * 1024}
              onUploadComplete={(url) => onUpdate({ mediaUrl: url })}
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

function EnabledSwitch({
  checked,
  pending,
  onChange,
}: {
  checked: boolean;
  pending: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "text-sm font-medium",
          checked ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500",
        )}
      >
        {checked ? "Actif" : "Inactif"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Activer le statut de bienvenue"
        disabled={pending}
        onClick={onChange}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
