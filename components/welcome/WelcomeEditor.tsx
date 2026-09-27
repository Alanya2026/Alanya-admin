"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MessageSquare,
  MousePointerClick,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { RichTextArea } from "@/components/ui/rich-text-area";
import { EditorialAssist } from "@/components/ui/editorial-assist";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import type { PreviewContent } from "@/components/preview/PreviewStage";
import type { PreviewLang } from "@/components/preview/types";
import { welcomeBlocksToMessages } from "@/lib/preview/welcome-blocks-to-messages";
import {
  CONTENT_LOCALES,
  CONTENT_LOCALE_LABELS,
  untranslatedRequiredLocales,
  type ContentLocale,
  type Translations,
} from "@/lib/content-locales";
import { cn } from "@/lib/utils";
import type { WelcomeBlock, WelcomeBlockType, WelcomeCtaButton } from "@/types";

const ROUTE_OPTIONS = [
  { value: "profile", label: "Profil" },
  { value: "statuses", label: "Statuts" },
  { value: "help", label: "Aide et FAQ" },
];

const BLOCK_META: Record<WelcomeBlockType, { label: string; Icon: typeof MessageSquare }> = {
  text: { label: "Texte", Icon: MessageSquare },
  image: { label: "Image", Icon: ImageIcon },
  video: { label: "Vidéo", Icon: Video },
  cta: { label: "Boutons", Icon: MousePointerClick },
};

function emptyBlock(type: WelcomeBlockType, sortOrder: number): WelcomeBlock {
  if (type === "cta") {
    return {
      sortOrder,
      blockType: "cta",
      ctaJson: {
        buttons: [
          { labelFr: "Compléter mon profil", labelEn: "Complete my profile", action: "route", target: "profile" },
        ],
      },
      ctaTranslations: [
        { fr: "Compléter mon profil", en: "Complete my profile" },
      ],
    };
  }
  return { sortOrder, blockType: type, translations: {} };
}

interface WelcomeEditorProps {
  blocks: WelcomeBlock[];
  onChange: (blocks: WelcomeBlock[]) => void;
  disabled?: boolean;
  senderName?: string;
  senderAvatar?: string | null;
}

export function WelcomeEditor({
  blocks,
  onChange,
  disabled,
  senderName,
  senderAvatar,
}: WelcomeEditorProps) {
  const [lang, setLang] = useState<PreviewLang>("fr");
  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.sortOrder - b.sortOrder),
    [blocks],
  );

  // L'aperçu passe par la même transformation que le serveur : les blocs
  // deviennent des messages avant d'être rendus.
  const content = useMemo<PreviewContent>(
    () => ({
      mode: "chat",
      messages: welcomeBlocksToMessages(sorted, lang),
      senderName: senderName || "Alanya",
      senderAvatar,
      official: true,
      emptyLabel: "Ajoutez un bloc pour voir le message",
    }),
    [sorted, lang, senderName, senderAvatar],
  );

  function updateBlock(index: number, patch: Partial<WelcomeBlock>) {
    const next = sorted.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange(next.map((b, i) => ({ ...b, sortOrder: i })));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next.map((b, i) => ({ ...b, sortOrder: i })));
  }

  function removeBlock(index: number) {
    onChange(sorted.filter((_, i) => i !== index).map((b, i) => ({ ...b, sortOrder: i })));
  }

  function addBlock(type: WelcomeBlockType) {
    onChange([...sorted, emptyBlock(type, sorted.length)]);
  }

  /**
   * Traductions des boutons alignées sur le tableau `buttons`.
   *
   * Le serveur les indexe par position (`cta.0`, `cta.1`…) : un décalage entre
   * les deux tableaux attribuerait le libellé d'un bouton à un autre.
   */
  function alignedCtaTranslations(block: WelcomeBlock, count: number): Translations[] {
    return Array.from({ length: count }, (_, i) => ({ ...(block.ctaTranslations?.[i] ?? {}) }));
  }

  function updateCtaButton(blockIndex: number, btnIndex: number, patch: Partial<WelcomeCtaButton>) {
    const block = sorted[blockIndex];
    const buttons = [...(block.ctaJson?.buttons ?? [])];
    buttons[btnIndex] = { ...buttons[btnIndex], ...patch };
    updateBlock(blockIndex, { ctaJson: { buttons } });
  }

  /**
   * Libellé d'un bouton dans une langue.
   *
   * `ctaTranslations` est la forme de référence depuis la migration 053 ; les
   * `labelFr`/`labelEn` de `cta_json` sont maintenus en parallèle le temps de la
   * double écriture. N'écrire que le libellé hérité reviendrait à ne rien
   * écrire : le serveur lit la traduction d'abord.
   */
  function updateCtaLabel(
    blockIndex: number,
    btnIndex: number,
    locale: ContentLocale,
    value: string,
  ) {
    const block = sorted[blockIndex];
    const buttons = [...(block.ctaJson?.buttons ?? [])];
    const ctaTranslations = alignedCtaTranslations(block, buttons.length);
    ctaTranslations[btnIndex] = { ...ctaTranslations[btnIndex], [locale]: value };
    buttons[btnIndex] = {
      ...buttons[btnIndex],
      ...(locale === "fr" ? { labelFr: value } : {}),
      ...(locale === "en" ? { labelEn: value } : {}),
    };
    updateBlock(blockIndex, { ctaJson: { buttons }, ctaTranslations });
  }

  /**
   * Écrit plusieurs langues d'un libellé en une fois.
   *
   * `updateCtaLabel` ne sait en poser qu'une : l'appeler en boucle ferait lire
   * à chaque tour le `sorted` du rendu courant, et seul le dernier appel
   * survivrait. L'assistance rendant deux langues d'un coup, il lui faut ce
   * chemin-là.
   */
  function applyCtaLabels(blockIndex: number, btnIndex: number, patch: Translations) {
    const block = sorted[blockIndex];
    const buttons = [...(block.ctaJson?.buttons ?? [])];
    const ctaTranslations = alignedCtaTranslations(block, buttons.length);
    ctaTranslations[btnIndex] = { ...ctaTranslations[btnIndex], ...patch };
    buttons[btnIndex] = {
      ...buttons[btnIndex],
      ...(patch.fr != null ? { labelFr: patch.fr } : {}),
      ...(patch.en != null ? { labelEn: patch.en } : {}),
    };
    updateBlock(blockIndex, { ctaJson: { buttons }, ctaTranslations });
  }

  function addCtaButton(blockIndex: number) {
    const block = sorted[blockIndex];
    const buttons = [...(block.ctaJson?.buttons ?? [])];
    const ctaTranslations = alignedCtaTranslations(block, buttons.length);
    buttons.push({ labelFr: "", labelEn: "", action: "route", target: "profile" });
    ctaTranslations.push({});
    updateBlock(blockIndex, { ctaJson: { buttons }, ctaTranslations });
  }

  function removeCtaButton(blockIndex: number, btnIndex: number) {
    const block = sorted[blockIndex];
    const buttons = (block.ctaJson?.buttons ?? []).filter((_, i) => i !== btnIndex);
    const ctaTranslations = alignedCtaTranslations(
      block,
      block.ctaJson?.buttons?.length ?? 0,
    ).filter((_, i) => i !== btnIndex);
    updateBlock(blockIndex, { ctaJson: { buttons }, ctaTranslations });
  }

  // Plus de `contentKey` calculé : le corps vit dans `translations[lang]`,
  // ce qui rend l'ajout d'une langue transparent pour ce composant.

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Ajouter
          </span>
          {(Object.keys(BLOCK_META) as WelcomeBlockType[]).map((type) => {
            const { label, Icon } = BLOCK_META[type];
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => addBlock(type)}
              >
                <Icon className="mr-1 h-4 w-4" /> {label}
              </Button>
            );
          })}
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Aucun bloc dans le brouillon
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Chaque bloc devient un message distinct dans la conversation officielle.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {sorted.map((block, index) => (
            <BlockCard
              key={index}
              block={block}
              index={index}
              total={sorted.length}
              lang={lang}
              disabled={disabled}
              onUpdate={(patch) => updateBlock(index, patch)}
              onMove={(dir) => moveBlock(index, dir)}
              onRemove={() => removeBlock(index)}
              onUpdateCta={(bi, patch) => updateCtaButton(index, bi, patch)}
              onUpdateCtaLabel={(bi, locale, value) => updateCtaLabel(index, bi, locale, value)}
              onApplyCtaLabels={(bi, patch) => applyCtaLabels(index, bi, patch)}
              onAddCta={() => addCtaButton(index)}
              onRemoveCta={(bi) => removeCtaButton(index, bi)}
            />
          ))}
        </div>
      </div>

      <div className="self-start xl:sticky xl:top-6">
        <PreviewPanel
          content={content}
          lang={lang}
          onLangChange={setLang}
          modalTitle="Message de bienvenue"
        />
      </div>
    </div>
  );
}

/* ── Carte de bloc ───────────────────────────────────────────────────────── */

interface BlockCardProps {
  block: WelcomeBlock;
  index: number;
  total: number;
  lang: ContentLocale;
  disabled?: boolean;
  onUpdate: (patch: Partial<WelcomeBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdateCta: (btnIndex: number, patch: Partial<WelcomeCtaButton>) => void;
  onUpdateCtaLabel: (btnIndex: number, locale: ContentLocale, value: string) => void;
  onApplyCtaLabels: (btnIndex: number, patch: Translations) => void;
  onAddCta: () => void;
  onRemoveCta: (btnIndex: number) => void;
}

function BlockCard({
  block,
  index,
  total,
  lang,
  disabled,
  onUpdate,
  onMove,
  onRemove,
  onUpdateCta,
  onUpdateCtaLabel,
  onApplyCtaLabels,
  onAddCta,
  onRemoveCta,
}: BlockCardProps) {
  const { label, Icon } = BLOCK_META[block.blockType];
  const isMedia = block.blockType === "image" || block.blockType === "video";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800">
          {index + 1}
        </span>
        <Icon className="h-4 w-4 text-zinc-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Monter"
            disabled={disabled || index === 0}
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
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            aria-label="Supprimer le bloc"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {block.blockType !== "cta" && (
          <div className="space-y-2">
            {/* Le suffixe suit la langue active : figé sur « FR / EN », il
                annonçait « Message EN » sur l'onglet chinois. */}
            <Label>
              {block.blockType === "text" ? "Message" : "Légende"} {lang.toUpperCase()}
            </Label>
            <RichTextArea
              value={block.translations?.[lang] ?? ""}
              disabled={disabled}
              onChange={(v) =>
                onUpdate({
                  translations: { ...(block.translations ?? {}), [lang]: v },
                })
              }
              placeholder={block.blockType === "text" ? "Message…" : "Légende (optionnelle)"}
              rows={block.blockType === "text" ? 5 : 3}
            />
            {untranslatedRequiredLocales(block.translations).length > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Traduction obligatoire pour publier :{" "}
                {untranslatedRequiredLocales(block.translations)
                  .map((l) => CONTENT_LOCALE_LABELS[l])
                  .join(", ")}
                .
              </p>
            )}
            {/* Ce qui est produit ici entre dans le brouillon, pas dans la
                conversation : « Enregistrer » puis « Publier » gardent le
                dernier mot, comme pour une saisie manuelle. */}
            <EditorialAssist
              translations={block.translations ?? {}}
              kind="welcome"
              disabled={disabled}
              onApply={(t) =>
                onUpdate({ translations: { ...(block.translations ?? {}), ...t } })
              }
            />
          </div>
        )}

        {isMedia && (
          <div className="space-y-2">
            <Label>Média</Label>
            {block.mediaUrl ? (
              <p className="truncate text-xs text-zinc-500">{block.mediaUrl}</p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Aucun média — le bloc arrivera vide chez l&apos;utilisateur.
              </p>
            )}
            <FileUpload
              endpoint="/upload/official"
              accept={block.blockType === "image" ? "image/*" : "video/*"}
              disabled={disabled}
              onUploadComplete={(url) => onUpdate({ mediaUrl: url })}
            />
          </div>
        )}

        {block.blockType === "cta" && (
          <div className="space-y-3">
            {(block.ctaJson?.buttons ?? []).map((btn, bi) => {
              // `ctaTranslations` fait foi ; les libellés de `cta_json` ne sont
              // qu'un repli pour les boutons antérieurs à la migration 053.
              const labels: Translations = {
                ...(btn.labelFr ? { fr: btn.labelFr } : {}),
                ...(btn.labelEn ? { en: btn.labelEn } : {}),
                ...(block.ctaTranslations?.[bi] ?? {}),
              };
              // Le serveur écarte les boutons sans libellé ou sans cible.
              const dropped = !CONTENT_LOCALES.some((l) => labels[l]?.trim()) || !btn.target;
              // Un libellé manquant dans une langue fait disparaître le bouton
              // chez ses lecteurs : les langues requises le sont donc ici aussi,
              // dès qu'un libellé est saisi.
              const missing = untranslatedRequiredLocales(labels);
              return (
                <div
                  key={bi}
                  className={cn(
                    "space-y-2 rounded-lg border p-3",
                    dropped || missing.length
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20"
                      : "border-zinc-100 dark:border-zinc-800",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Bouton {bi + 1}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label="Supprimer le bouton"
                      disabled={disabled}
                      onClick={() => onRemoveCta(bi)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Un champ par langue active, comme pour le corps des blocs :
                      c'est ce qui rend le chinois saisissable — les deux champs
                      FR/EN figés d'avant ne laissaient aucune place aux langues
                      ajoutées après eux. */}
                  <Input
                    placeholder={`Libellé ${lang.toUpperCase()}`}
                    value={labels[lang] ?? ""}
                    disabled={disabled}
                    onChange={(e) => onUpdateCtaLabel(bi, lang, e.target.value)}
                  />
                  <select
                    className="h-9 w-full rounded-md border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-700"
                    value={btn.action === "url" ? "url" : `route:${btn.target}`}
                    disabled={disabled}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "url") {
                        onUpdateCta(bi, { action: "url", target: "https://" });
                      } else if (v.startsWith("route:")) {
                        onUpdateCta(bi, { action: "route", target: v.slice(6) });
                      }
                    }}
                  >
                    {ROUTE_OPTIONS.map((o) => (
                      <option key={o.value} value={`route:${o.value}`}>
                        {o.label}
                      </option>
                    ))}
                    <option value="url">URL externe</option>
                  </select>
                  {btn.action === "url" && (
                    <Input
                      placeholder="https://…"
                      value={btn.target}
                      disabled={disabled}
                      onChange={(e) => onUpdateCta(bi, { target: e.target.value })}
                    />
                  )}
                  {dropped && (
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      Libellé ou destination manquant — ce bouton ne sera pas envoyé.
                    </p>
                  )}
                  {!dropped && missing.length > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Libellé obligatoire en{" "}
                      {missing.map((l) => CONTENT_LOCALE_LABELS[l]).join(", ")} — sans
                      lui, le bouton disparaît chez ces lecteurs.
                    </p>
                  )}
                  {/* Pas de relecture sur trois mots : le coup d'œil la fait
                      mieux, et chaque appel se paye. */}
                  <EditorialAssist
                    translations={labels}
                    kind="cta"
                    disabled={disabled}
                    showReview={false}
                    onApply={(t) => onApplyCtaLabels(bi, t)}
                  />
                </div>
              );
            })}
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onAddCta}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter un bouton
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
