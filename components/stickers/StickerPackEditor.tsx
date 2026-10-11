"use client";

/**
 * Éditeur d'un pack officiel.
 *
 * Trois cartes : l'état de publication et ses deux gestes, la fiche localisée
 * (onglets FR/EN/中文 avec le repli nommé), puis les stickers (envoi multiple,
 * grille, couverture, retrait). Rien n'est publié implicitement : le serveur
 * refuse un pack incomplet et l'écran montre ce qui manque avant d'essayer.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Circle,
  ImagePlus,
  Loader2,
  Lock,
  Rocket,
  Save,
  Star,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LangTabs } from "@/components/ui/lang-tabs";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useArchiveStickerPack,
  useDeleteSticker,
  usePublishStickerPack,
  useStickerPack,
  useUpdateSticker,
  useUpdateStickerPack,
  useUploadStickerFiles,
} from "@/hooks/useStickers";
import {
  CONTENT_LOCALE_LABELS,
  resolveTranslation,
  type ContentLocale,
  type Translations,
} from "@/lib/content-locales";
import {
  fallbackPlaceholder,
  formatOctets,
  STICKER_FILE_ACCEPT,
  STICKER_PACK_MIN,
  STICKER_PACK_STATUS_LABEL,
  STICKER_PACK_STATUS_STYLE,
  STICKER_UPLOAD_MAX,
  STICKER_VISIBILITY_LABEL,
} from "@/lib/sticker-labels";
import { cn } from "@/lib/utils";
import type {
  StickerPackIncomplete,
  StickerPackPatchPayload,
  StickerPackRow,
  StickerPackSticker,
} from "@/types";

interface FormState {
  nameI18n: Required<Translations>;
  descriptionI18n: Required<Translations>;
  author: string;
  isPremium: boolean;
  sortOrder: string;
}

const LOCALES: ContentLocale[] = ["fr", "en", "zh"];

/** Ne transmet que les langues réellement remplies (vide = absent). */
function toI18n(raw: Translations): Translations {
  const out: Translations = {};
  for (const l of LOCALES) {
    const v = raw[l]?.trim();
    if (v) out[l] = v;
  }
  return out;
}

/** Vide l'objet : le serveur stocke alors `NULL` côté description. */
function i18nOrNull(raw: Translations): Translations | null {
  const out = toI18n(raw);
  return Object.keys(out).length ? out : null;
}

function fromServer(pack: StickerPackRow): FormState {
  return {
    nameI18n: { fr: pack.nameI18n?.fr ?? "", en: pack.nameI18n?.en ?? "", zh: pack.nameI18n?.zh ?? "" },
    descriptionI18n: {
      fr: pack.descriptionI18n?.fr ?? "",
      en: pack.descriptionI18n?.en ?? "",
      zh: pack.descriptionI18n?.zh ?? "",
    },
    author: pack.author ?? "",
    isPremium: pack.isPremium === 1,
    sortOrder: String(pack.sortOrder ?? 0),
  };
}

function serveurIncomplet(e: unknown): StickerPackIncomplete | null {
  const data = (e as { response?: { data?: StickerPackIncomplete } })?.response?.data;
  return data?.code === "STICKER_PACK_INCOMPLETE" ? data : null;
}

const erreurServeur = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
  (e instanceof Error ? e.message : undefined);

export function StickerPackEditor({ id }: { id: number }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canWrite = can("stickers.write");
  const canPublish = can("stickers.publish");
  const { addToast } = useToast();

  const { data, isLoading, isError, refetch } = useStickerPack(id);
  const updatePack = useUpdateStickerPack(id);
  const upload = useUploadStickerFiles(id);
  const updateSticker = useUpdateSticker(id);
  const removeSticker = useDeleteSticker(id);
  const publish = usePublishStickerPack(id);
  const archive = useArchiveStickerPack(id);

  const [lang, setLang] = useState<ContentLocale>("fr");
  const [form, setForm] = useState<FormState | null>(null);
  const initialise = useRef(false);
  const [aSupprimer, setASupprimer] = useState<StickerPackSticker | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [emojiLot, setEmojiLot] = useState("");
  const [progression, setProgression] = useState(0);
  const fichierRef = useRef<HTMLInputElement>(null);

  const pack = data?.pack;
  const stickers = data?.stickers ?? [];

  // Première charge seulement : un rafraîchissement (après envoi ou
  // publication) ne doit pas effacer une saisie en cours dans la fiche.
  useEffect(() => {
    if (data && !initialise.current) {
      setForm(fromServer(data.pack));
      initialise.current = true;
    }
  }, [data]);

  const serveurForm = useMemo(() => (pack ? fromServer(pack) : null), [pack]);
  const dirty = Boolean(form && serveurForm && JSON.stringify(form) !== JSON.stringify(serveurForm));

  const nomRempli = Boolean(form?.nameI18n.fr.trim());
  const resteFrEn = !form?.nameI18n.fr.trim() || !form?.nameI18n.en.trim();
  const nombreOk = stickers.length >= STICKER_PACK_MIN;
  const couvertureOk = pack?.coverStickerId != null;
  const complet = !resteFrEn && nombreOk && couvertureOk;

  function patch(p: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  /** Recopie le champ traduit et remplace une seule langue (clé calculée). */
  function majTraductions(
    champ: "nameI18n" | "descriptionI18n",
    locale: ContentLocale,
    valeur: string,
  ) {
    setForm((f) => {
      if (!f) return f;
      const suivant = { ...f[champ] } as Required<Translations>;
      suivant[locale] = valeur;
      return { ...f, [champ]: suivant };
    });
  }

  function sauvegarder() {
    if (!form || !nomRempli) return;
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const payload: StickerPackPatchPayload = {
      name_i18n: toI18n(form.nameI18n),
      description_i18n: i18nOrNull(form.descriptionI18n),
      author: form.author.trim() || null,
      is_premium: form.isPremium,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };
    updatePack.mutate(payload, {
      onSuccess: () => addToast({ title: "Pack enregistré", variant: "success" }),
      onError: (e) => addToast({ title: "Échec de l'enregistrement", description: erreurServeur(e), variant: "error" }),
    });
  }

  function annuler() {
    if (pack) setForm(fromServer(pack));
  }

  function definirCouverture(sticker: StickerPackSticker) {
    if (!canWrite || pack?.coverStickerId === sticker.id) return;
    updatePack.mutate(
      { cover_sticker_id: sticker.id },
      {
        onSuccess: () => addToast({ title: "Couverture choisie", variant: "success" }),
        onError: (e) => addToast({ title: "Échec", description: erreurServeur(e), variant: "error" }),
      },
    );
  }

  function confirmerRetrait() {
    if (!aSupprimer) return;
    removeSticker.mutate(aSupprimer.id, {
      onSuccess: () => {
        addToast({ title: "Sticker retiré", variant: "success" });
        setASupprimer(null);
      },
      onError: (e) => {
        addToast({ title: "Retrait refusé", description: erreurServeur(e), variant: "error" });
        setASupprimer(null);
      },
    });
  }

  function ajouterFichiers(liste: FileList | null) {
    if (!liste) return;
    const ajoutes = [...fichiers];
    let refuse = 0;
    for (const f of Array.from(liste)) {
      if (ajoutes.length >= STICKER_UPLOAD_MAX) {
        refuse += 1;
        continue;
      }
      if (!["image/png", "image/webp"].includes(f.type)) {
        refuse += 1;
        continue;
      }
      ajoutes.push(f);
    }
    setFichiers(ajoutes);
    if (refuse > 0) {
      addToast({
        title: "Fichiers ignorés",
        description: `${refuse} fichier(s) : PNG ou WebP attendus, ${STICKER_UPLOAD_MAX} au plus par envoi.`,
        variant: "error",
      });
    }
    if (fichierRef.current) fichierRef.current.value = "";
  }

  function envoyer() {
    if (!fichiers.length) return;
    upload.mutate(
      { files: fichiers, emoji: emojiLot, onProgress: setProgression },
      {
        onSuccess: (crees) => {
          const reutilises = crees.filter((s) => s.reutilise).length;
          addToast({
            title: `${crees.length} sticker${crees.length > 1 ? "s" : ""} ajouté${crees.length > 1 ? "s" : ""}`,
            description: reutilises
              ? `${reutilises} fichier(s) déjà présent(s), réutilisé(s) sans réenvoi.`
              : undefined,
            variant: "success",
          });
          setFichiers([]);
          setEmojiLot("");
          setProgression(0);
        },
        onError: (e) => {
          setProgression(0);
          addToast({ title: "Envoi refusé", description: erreurServeur(e), variant: "error" });
        },
      },
    );
  }

  function publier() {
    publish.mutate(undefined, {
      onSuccess: () => addToast({ title: "Pack publié", variant: "success" }),
      onError: (e) => {
        const incomplet = serveurIncomplet(e);
        addToast(
          incomplet
            ? {
                title: "Publication refusée",
                description: `Il manque : ${incomplet.missing.join(", ")}.`,
                variant: "error",
              }
            : { title: "Échec de la publication", description: erreurServeur(e), variant: "error" },
        );
      },
    });
  }

  function archiver() {
    archive.mutate(undefined, {
      onSuccess: () => addToast({ title: "Pack archivé", variant: "success" }),
      onError: (e) => addToast({ title: "Échec de l'archivage", description: erreurServeur(e), variant: "error" }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!can("stickers.read")) {
    return (
      <p className="py-20 text-center text-sm text-zinc-500">
        Accès réservé à l&apos;équipe d&apos;administration.
      </p>
    );
  }

  if (isError || !data || !form) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/stickers")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour aux packs
        </Button>
        <ErrorState onRetry={() => refetch()} message="Impossible de charger ce pack." />
      </div>
    );
  }

  const nomPack = resolveTranslation(data.pack.nameI18n, "fr") || data.pack.code;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => router.push("/stickers")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour aux packs
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{nomPack}</h1>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STICKER_PACK_STATUS_STYLE[data.pack.status])}>
            {STICKER_PACK_STATUS_LABEL[data.pack.status]}
          </span>
          {data.pack.isPremium === 1 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              Plus
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-400">
          {data.pack.code} · {STICKER_VISIBILITY_LABEL[data.pack.visibility]} · v{data.pack.version}
        </p>
      </div>

      {!canWrite && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : la modification demande la permission <code className="font-mono">stickers.write</code>.
        </div>
      )}

      {/* 1. Publication */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Publication</CardTitle>
          <CardDescription>
            Un pack publié ne se supprime plus : il s&apos;archive, pour que les messages déjà envoyés
            gardent leur image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            <ChecklistItem ok={Boolean(data.pack.nameI18n?.fr?.trim())} label="Nom en français" />
            <ChecklistItem ok={Boolean(data.pack.nameI18n?.en?.trim())} label="Nom en anglais" />
            <ChecklistItem ok={couvertureOk} label="Icône de couverture choisie" />
            <ChecklistItem
              ok={nombreOk}
              label={`Au moins ${STICKER_PACK_MIN} stickers (${stickers.length}/${STICKER_PACK_MIN})`}
            />
          </ul>

          {!canPublish ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400">
              <Lock className="h-4 w-4 shrink-0" />
              La publication et l&apos;archivage sont réservés au super-admin (<code className="font-mono">stickers.publish</code>).
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.pack.status !== 1 && (
                <Button
                  onClick={publier}
                  disabled={!complet || publish.isPending}
                  title={complet ? undefined : "Complétez la liste de contrôle ci-dessus"}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {publish.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-1 h-4 w-4" />
                  )}
                  Publier
                </Button>
              )}
              {data.pack.status === 1 && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={archiver}
                  disabled={archive.isPending}
                >
                  {archive.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-1 h-4 w-4" />
                  )}
                  Archiver
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Fiche localisée */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Fiche du pack</CardTitle>
              <CardDescription>
                Le français et l&apos;anglais sont obligatoires pour publier ; le reste se replie.
              </CardDescription>
            </div>
            <LangTabs value={lang} onChange={setLang} translations={form.nameI18n} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pack-name">
                Nom ({CONTENT_LOCALE_LABELS[lang]})
                {lang !== "fr" && <span className="ml-1 font-normal text-zinc-400">facultatif</span>}
              </Label>
              <Input
                id="pack-name"
                value={form.nameI18n[lang]}
                maxLength={80}
                disabled={!canWrite}
                placeholder={
                  fallbackPlaceholder(form.nameI18n, lang) || (lang === "fr" ? "Les Classiques" : `Nom (${CONTENT_LOCALE_LABELS[lang]})`)
                }
                onChange={(e) => majTraductions("nameI18n", lang, e.target.value)}
              />
              <RepliHint translations={form.nameI18n} locale={lang} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pack-author">
                Auteur <span className="font-normal text-zinc-400">(facultatif)</span>
              </Label>
              <Input
                id="pack-author"
                value={form.author}
                maxLength={80}
                disabled={!canWrite}
                placeholder="Alanya"
                onChange={(e) => patch({ author: e.target.value })}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Crédité dans la fiche du pack, côté application.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pack-desc">Description ({CONTENT_LOCALE_LABELS[lang]})</Label>
            <Textarea
              id="pack-desc"
              rows={2}
              maxLength={500}
              value={form.descriptionI18n[lang]}
              disabled={!canWrite}
              placeholder={
                fallbackPlaceholder(form.descriptionI18n, lang) || "Ce que le pack raconte, en une phrase."
              }
              onChange={(e) => majTraductions("descriptionI18n", lang, e.target.value)}
            />
            <RepliHint translations={form.descriptionI18n} locale={lang} />
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.isPremium}
                disabled={!canWrite}
                onChange={(e) => patch({ isPremium: e.target.checked })}
              />
              Pack réservé aux abonnés Plus
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="pack-order">Ordre d&apos;affichage</Label>
              <Input
                id="pack-order"
                inputMode="numeric"
                value={form.sortOrder}
                disabled={!canWrite}
                className="w-28 tabular-nums"
                onChange={(e) => patch({ sortOrder: e.target.value.trim() })}
              />
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button onClick={sauvegarder} disabled={!dirty || !nomRempli || updatePack.isPending} variant="outline">
                {updatePack.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Enregistrer
              </Button>
              {dirty && (
                <>
                  <Button variant="ghost" onClick={annuler} disabled={updatePack.isPending}>
                    <Undo2 className="mr-1 h-4 w-4" />
                    Annuler
                  </Button>
                  <span className="text-xs text-amber-600 dark:text-amber-500">
                    Modifications non enregistrées
                  </span>
                </>
              )}
              {!nomRempli && (
                <span className="text-xs text-red-500">Le nom français est obligatoire.</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Stickers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Stickers{" "}
            <span className="font-normal text-zinc-400">
              ({stickers.length}/{STICKER_UPLOAD_MAX})
            </span>
          </CardTitle>
          <CardDescription>
            PNG ou WebP 512×512, 1 Mo au plus chacun. Le serveur vérifie, ré-encode et déduplique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {canWrite && (
            <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-emoji">
                    Emoji du lot <span className="font-normal text-zinc-400">(facultatif)</span>
                  </Label>
                  <Input
                    id="upload-emoji"
                    value={emojiLot}
                    maxLength={16}
                    placeholder="😂"
                    className="w-28 text-center"
                    onChange={(e) => setEmojiLot(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-files">Fichiers</Label>
                  <input
                    ref={fichierRef}
                    id="upload-files"
                    type="file"
                    multiple
                    accept={STICKER_FILE_ACCEPT}
                    disabled={upload.isPending || stickers.length >= STICKER_UPLOAD_MAX}
                    onChange={(e) => ajouterFichiers(e.target.files)}
                    className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700 disabled:opacity-60"
                  />
                </div>
                <Button
                  onClick={envoyer}
                  disabled={!fichiers.length || upload.isPending}
                  className="shrink-0"
                >
                  {upload.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-4 w-4" />
                  )}
                  Envoyer
                  {fichiers.length > 0 && ` (${fichiers.length})`}
                </Button>
              </div>

              {upload.isPending && (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                      style={{ width: `${progression}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{progression}%</p>
                </div>
              )}

              {fichiers.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {fichiers.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="max-w-[10rem] truncate">{f.name}</span>
                      <button
                        type="button"
                        aria-label={`Retirer ${f.name}`}
                        onClick={() => setFichiers((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-full p-0.5 text-zinc-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {stickers.length >= STICKER_UPLOAD_MAX && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Le plafond de {STICKER_UPLOAD_MAX} stickers par pack est atteint.
                </p>
              )}
            </div>
          )}

          {stickers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
              <ImagePlus className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">Aucun sticker</p>
              <p className="mt-1 text-sm text-zinc-500">
                Un pack se publie à partir de {STICKER_PACK_MIN} stickers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stickers.map((s) => (
                <StickerTile
                  key={s.id}
                  sticker={s}
                  estCouverture={data.pack.coverStickerId === s.id}
                  canWrite={canWrite}
                  enRetrait={removeSticker.isPending}
                  onSetCover={() => definirCouverture(s)}
                  onRemove={() => setASupprimer(s)}
                  onEmoji={(emoji) =>
                    updateSticker.mutate(
                      { stickerId: s.id, payload: { emoji } },
                      {
                        onError: (e) =>
                          addToast({ title: "Échec de l'emoji", description: erreurServeur(e), variant: "error" }),
                      },
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={aSupprimer != null}
        onOpenChange={(o) => !o && setASupprimer(null)}
        title="Retirer ce sticker ?"
        description="Le fichier est détaché du pack. Les messages déjà envoyés restent affichés tant que le pack n'est pas republié ; le serveur refuse le retrait sur un pack publié."
        confirmLabel="Retirer"
        variant="destructive"
        pending={removeSticker.isPending}
        onConfirm={confirmerRetrait}
      />
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
      )}
      <span className={cn(ok ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500")}>{label}</span>
    </li>
  );
}

/** Rappelle la langue qui servira de repli quand l'onglet courant est vide. */
function RepliHint({ translations, locale }: { translations: Translations; locale: ContentLocale }) {
  if (locale === "fr" && !translations.fr?.trim()) return null;
  const repli = fallbackPlaceholder(translations, locale);
  if (!repli) return null;
  return (
    <p className="text-xs text-zinc-400">
      Champ vide : l&apos;application affichera <span className="font-mono">{repli}</span>.
    </p>
  );
}

function StickerTile({
  sticker,
  estCouverture,
  canWrite,
  enRetrait,
  onSetCover,
  onRemove,
  onEmoji,
}: {
  sticker: StickerPackSticker;
  estCouverture: boolean;
  canWrite: boolean;
  enRetrait: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  onEmoji: (emoji: string) => void;
}) {
  const [emoji, setEmoji] = useState(sticker.emoji);
  useEffect(() => setEmoji(sticker.emoji), [sticker.emoji]);
  const retire = sticker.assetStatus === 1;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900",
        estCouverture ? "border-indigo-400 dark:border-indigo-600" : "border-zinc-200 dark:border-zinc-800",
        retire && "opacity-60",
      )}
    >
      <div className="absolute left-2 top-2 z-10 rounded-md bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
        #{sticker.position}
      </div>
      {estCouverture && (
        <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <BadgeCheck className="h-3 w-3" />
          Couverture
        </div>
      )}

      <div className="flex aspect-square items-center justify-center bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%),linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3 dark:bg-zinc-800">
        <img
          src={sticker.thumbUrl || sticker.url}
          alt={sticker.emoji || "sticker"}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="space-y-2 p-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={emoji}
            maxLength={16}
            disabled={!canWrite}
            aria-label={`Emoji du sticker ${sticker.position}`}
            className="h-8 w-16 px-1 text-center text-base"
            onChange={(e) => setEmoji(e.target.value)}
            onBlur={() => {
              const v = emoji.trim();
              if (v !== sticker.emoji.trim()) onEmoji(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="ml-auto text-[11px] tabular-nums text-zinc-400">
            {sticker.width && sticker.height ? `${sticker.width}×${sticker.height}` : ""}
            {sticker.bytes != null ? ` · ${formatOctets(sticker.bytes)}` : ""}
          </span>
        </div>

        {retire && (
          <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            Fichier retiré
          </p>
        )}

        {canWrite && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 flex-1 px-2 text-xs"
              disabled={estCouverture}
              onClick={onSetCover}
            >
              <Star className="mr-1 h-3.5 w-3.5" />
              Couverture
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              aria-label={`Retirer le sticker ${sticker.position}`}
              disabled={enRetrait}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
