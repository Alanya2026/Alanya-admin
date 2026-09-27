"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Radio,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditorialAssist } from "@/components/ui/editorial-assist";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { LangTabs } from "@/components/ui/lang-tabs";
import {
  CONTENT_LOCALE_LABELS,
  missingRequiredLocales,
  REQUIRED_LOCALE_NAMES,
  type ContentLocale,
  resolveTranslation,
  untranslatedRequiredLocales,
  type Translations,
} from "@/lib/content-locales";

/**
 * Amorces du champ de saisie, par langue.
 *
 * Un enregistrement complet plutôt qu'un ternaire imbriqué : ajouter une
 * langue échoue alors à la compilation si son amorce manque, au lieu de
 * retomber silencieusement sur l'anglais.
 */
const PLACEHOLDERS: Record<
  ContentLocale,
  { status: string; message: string }
> = {
  fr: { status: "Votre statut\u2026", message: "Votre message\u2026" },
  en: { status: "Your status\u2026", message: "Your message\u2026" },
  zh: { status: "\u60a8\u7684\u52a8\u6001\u2026", message: "\u60a8\u7684\u6d88\u606f\u2026" },
};
import { RichTextArea } from "@/components/ui/rich-text-area";
import { useToast } from "@/components/ui/toast";
import {
  CriteriaBuilder,
  criteriaErrors,
  draftToCriteria,
  type DraftCondition,
} from "@/components/broadcasts/CriteriaBuilder";
import { RecipientEstimate, useRecipientEstimate } from "@/components/broadcasts/RecipientEstimate";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { StatusBackgroundPicker } from "@/components/preview/StatusBackgroundPicker";
import type { PreviewContent } from "@/components/preview/PreviewStage";
import type { PreviewLang } from "@/components/preview/types";
import { AccountBadgeLabel } from "@/components/account-badge";
import { useCountries } from "@/hooks/useCountries";
import { useBroadcasts, useCreateBroadcast, useOfficialAccount } from "@/hooks/useBroadcasts";
import { statutMediaType } from "@/lib/broadcast-payload";
import { formatCriteriaSummary } from "@/lib/criteria-labels";
import { broadcastToPreview, PUSH_BODY_MAX } from "@/lib/preview/broadcast-to-preview";
import type { BroadcastFormData } from "@/types";

/**
 * Nature de la diffusion.
 *
 * Attention aux deux axes distincts côté serveur : `kind` (0 message privé,
 * 1 statut 24 h) et `type` (le type média du message). « Statut 24 h » est le
 * seul choix qui change `kind` ; son `type` est déduit de l'URL du média.
 */
const NATURES = [
  { value: 0, label: "Message", hint: "Texte seul", icon: FileText, isStatus: false },
  { value: 1, label: "Image", hint: "Photo + légende", icon: ImageIcon, isStatus: false },
  { value: 2, label: "Vidéo", hint: "Vidéo + légende", icon: Video, isStatus: false },
  { value: 3, label: "Statut 24 h", hint: "Expire après 24 h", icon: Radio, isStatus: true },
] as const;

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `bc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function NewBroadcastPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const createMutation = useCreateBroadcast();
  const { refetch } = useBroadcasts();
  const { data: official, isLoading: officialLoading } = useOfficialAccount();
  const { data: countries } = useCountries();

  const [clientId, setClientId] = useState(newClientId);
  // Un enregistrement par locale plutôt qu'un useState par langue : ajouter
  // une langue dans CONTENT_LOCALES suffit désormais, sans toucher ce composant.
  const [translations, setTranslations] = useState<Translations>({});
  const [lang, setLang] = useState<PreviewLang>("fr");
  const [nature, setNature] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [criteriaDrafts, setCriteriaDrafts] = useState<DraftCondition[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [estimateMismatch, setEstimateMismatch] = useState<number | null>(null);

  const isStatut = nature === 3;
  const criteria = useMemo(() => draftToCriteria(criteriaDrafts), [criteriaDrafts]);
  const { count: estimatedCount, loading: estimateLoading } = useRecipientEstimate(criteria);

  const activeContent = translations[lang] ?? "";
  const setActiveContent = (value: string) =>
    setTranslations((prev: Translations) => ({ ...prev, [lang]: value }));

  const criteriaSummary = formatCriteriaSummary(criteria, {
    countryName: (id) => countries?.find((c) => c.idPays === id)?.libelle,
  });

  // L'aperçu passe par la dérivation réelle : kind → conversation ou statut.
  const preview = useMemo(
    () =>
      broadcastToPreview(
        {
          kind: isStatut ? 1 : 0,
          translations,
          type: isStatut ? statutMediaType(mediaUrl) : nature,
          mediaUrl,
          backgroundColor,
        },
        lang,
      ),
    [isStatut, translations, nature, mediaUrl, backgroundColor, lang],
  );

  const previewContent = useMemo<PreviewContent>(() => {
    if (preview.mode === "status") {
      return {
        mode: "status",
        text: preview.text,
        type: preview.type,
        mediaUrl: preview.mediaUrl,
        backgroundColor: preview.backgroundColor,
        senderName: official?.nom || "Alanya",
        senderAvatar: official?.avatarUrl,
      };
    }
    return {
      mode: "chat",
      messages: preview.messages,
      senderName: official?.nom || "Alanya",
      senderAvatar: official?.avatarUrl,
      official: true,
      emptyLabel: "Saisissez un contenu pour voir le rendu",
    };
  }, [preview, official]);

  const mediaRequired = nature === 1 || nature === 2;
  const errors = useMemo(() => {
    const list = criteriaErrors(criteriaDrafts);
    // Contrairement à un bloc de bienvenue, dont la légende peut légitimement
    // rester vide, une diffusion *est* son contenu : les langues requises sont
    // dues même quand rien n'est encore écrit, sinon une annonce vide partirait.
    // Les autres langues restent facultatives — les exiger bloquerait l'envoi
    // jusqu'à ce qu'un traducteur soit disponible, et le repli couvre l'absence.
    for (const loc of missingRequiredLocales(translations)) {
      list.push(`Le contenu en ${CONTENT_LOCALE_LABELS[loc]} est obligatoire.`);
    }
    if (mediaRequired && !mediaUrl.trim()) {
      list.push(`Un média est requis pour une diffusion de type ${nature === 1 ? "image" : "vidéo"}.`);
    }
    if (!official) list.push("Aucun compte officiel n'existe : la diffusion est impossible.");
    return list;
  }, [criteriaDrafts, translations, mediaRequired, mediaUrl, nature, official]);

  const canSend =
    errors.length === 0 && !createMutation.isPending && !estimateLoading && estimatedCount != null;

  function submitBroadcast(confirmedCount?: number) {
    if (!official) return;

    const data: BroadcastFormData = {
      senderId: Number(official.alanyaID),
      content: translations.fr?.trim() ?? "",
      contentEn: translations.en?.trim() || undefined,
      translations,
      type: isStatut ? statutMediaType(mediaUrl) : nature,
      mediaUrl: mediaUrl || undefined,
      backgroundColor: backgroundColor || undefined,
      criteria,
      clientId,
      kind: isStatut ? 1 : 0,
      isStatus: isStatut,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      estimate: confirmedCount ?? estimatedCount ?? undefined,
      confirmedEstimate: confirmedCount ?? estimatedCount ?? undefined,
    };

    createMutation.mutate(data, {
      onSuccess: (result) => {
        const scheduled = result && "scheduled" in result && result.scheduled;
        addToast({
          title: scheduled ? "Diffusion programmée" : isStatut ? "Statut publié" : "Diffusion lancée",
          description: scheduled
            ? `Envoi prévu le ${new Date(result.scheduledAt).toLocaleString("fr-FR")}.`
            : isStatut
              ? "Votre statut a été publié."
              : "La diffusion est en cours de traitement.",
          variant: "success",
        });
        setConfirmOpen(false);
        refetch();
        router.push("/broadcasts");
      },
      onError: (err: unknown) => {
        const resp =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { status?: number; data?: { error?: string; count?: number } } })
                .response
            : undefined;
        if (resp?.status === 409 && resp.data?.count != null) {
          setEstimateMismatch(resp.data.count);
          addToast({
            title: "Estimation modifiée",
            description: `Nouveau total : ${resp.data.count.toLocaleString("fr-FR")} destinataires. Confirmez à nouveau.`,
            variant: "error",
          });
          return;
        }
        addToast({
          title: "Erreur",
          description: resp?.data?.error || "Échec de l'envoi.",
          variant: "error",
        });
      },
    });
  }

  // Un nouveau `clientId` par visite : l'idempotence serveur ne doit pas
  // rejeter une seconde diffusion préparée dans la même session.
  useEffect(() => {
    setClientId(newClientId());
  }, []);

  const pushBody = resolveTranslation(translations, lang).trim();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Retour aux diffusions"
          onClick={() => router.push("/broadcasts")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isStatut ? "Nouveau statut officiel" : "Nouvelle diffusion"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Le contenu à gauche, le rendu réel à droite. L&apos;estimation se recalcule à chaque
            changement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Colonne formulaire ──────────────────────────────────────── */}
        <div className="space-y-5">
          <Section step={1} title="Nature" description="Ce que reçoit l'utilisateur">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NATURES.map((n) => {
                const Icon = n.icon;
                const active = nature === n.value;
                return (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() => setNature(n.value)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? n.isStatus
                          ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                          : "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        active
                          ? n.isStatus
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-400"
                      }`}
                    />
                    <span className="text-sm font-medium">{n.label}</span>
                    <span className="text-[11px] text-zinc-500">{n.hint}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Expéditeur
              </p>
              {officialLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : official ? (
                <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/40 px-3 py-2">
                  {official.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={official.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : null}
                  <AccountBadgeLabel
                    name={official.nom}
                    accountType={official.accountType ?? 2}
                    verificationStatus={official.verificationStatus ?? 0}
                    fontSize={14}
                    nameClassName="text-sm font-medium"
                  />
                  <span className="text-xs text-zinc-500">Compte officiel</span>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Aucun compte officiel n&rsquo;existe encore. Créez-le depuis{" "}
                    <Link href="/users/new" className="font-medium underline">
                      Utilisateurs → Créer un utilisateur
                    </Link>{" "}
                    avant de diffuser.
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section
            step={2}
            title="Contenu"
            description={`${REQUIRED_LOCALE_NAMES} obligatoires ; les autres langues sont facultatives et retombent sur la chaîne de repli`}
          >
            <div className="space-y-3">
              <LangTabs value={lang} onChange={setLang} translations={translations} />
              <RichTextArea
                value={activeContent}
                onChange={setActiveContent}
                placeholder={PLACEHOLDERS[lang][isStatut ? "status" : "message"]}
                rows={6}
                disabled={createMutation.isPending}
                emojiPicker={(insert) => (
                  <EmojiPicker onSelect={insert} disabled={createMutation.isPending} />
                )}
              />

              {/* Même règle et même formulation que le message et le statut de
                  bienvenue : dès qu'une langue est saisie, les langues requises
                  le sont toutes, et on les nomme. La diffusion entièrement vide
                  ne s'affiche pas en rouge ici — c'est la liste d'erreurs qui
                  bloque l'envoi, sans crier avant que rien ne soit écrit. */}
              {untranslatedRequiredLocales(translations).length > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Traduction obligatoire manquante :{" "}
                  {untranslatedRequiredLocales(translations)
                    .map((l) => CONTENT_LOCALE_LABELS[l])
                    .join(", ")}
                  .
                </p>
              )}

              {/* Une diffusion part et ne se rattrape pas : l'assistance
                  remplit les champs, la confirmation d'envoi reste le seul
                  point de non-retour, et elle est plus loin. La nature suit le
                  choix de l'administrateur — un statut ne se traduit pas comme
                  une annonce. */}
              <EditorialAssist
                translations={translations}
                kind={isStatut ? "status" : "broadcast"}
                disabled={createMutation.isPending}
                onApply={(t) =>
                  setTranslations((prev: Translations) => ({ ...prev, ...t }))
                }
              />

              {!isStatut && pushBody.length > PUSH_BODY_MAX && (
                <p className="text-xs text-zinc-500">
                  La notification push s&apos;arrête à {PUSH_BODY_MAX} caractères — actuellement{" "}
                  <strong className="tabular-nums">{pushBody.length}</strong>. Les{" "}
                  {pushBody.length - PUSH_BODY_MAX} derniers caractères ne s&apos;afficheront pas sur
                  l&apos;écran verrouillé.
                </p>
              )}

              {(nature === 1 || nature === 2 || isStatut) && (
                <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Média {isStatut ? "(optionnel)" : ""}
                  </p>
                  {mediaUrl ? (
                    <p className="truncate text-xs text-zinc-500">{mediaUrl}</p>
                  ) : mediaRequired ? (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Obligatoire pour cette nature de diffusion.
                    </p>
                  ) : null}
                  <FileUpload
                    endpoint="/upload/official"
                    accept={nature === 2 ? "video/*" : "image/*,video/*"}
                    maxSize={50 * 1024 * 1024}
                    onUploadComplete={(url) => setMediaUrl(url)}
                  />
                </div>
              )}

              {/* Un statut média recouvre tout l'écran : la couleur ne sert
                  qu'au statut texte, et le sélecteur disparaît dès qu'un média
                  est joint. */}
              {isStatut && !mediaUrl.trim() && (
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <StatusBackgroundPicker
                    value={backgroundColor}
                    onChange={setBackgroundColor}
                  />
                </div>
              )}
            </div>
          </Section>

          <Section
            step={3}
            title="Audience"
            description="Toutes les conditions doivent être vraies ; sans condition, tous les utilisateurs éligibles"
          >
            <div className="space-y-4">
              <CriteriaBuilder drafts={criteriaDrafts} onChange={setCriteriaDrafts} />
              <RecipientEstimate
                count={estimatedCount}
                loading={estimateLoading}
                summary={criteriaSummary}
              />
            </div>
          </Section>

          <Section
            step={4}
            title="Planification"
            description="Laisser vide pour diffuser immédiatement"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="datetime-local"
                  aria-label="Date et heure d'envoi"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
                />
              </div>
              {scheduledAt && (
                <>
                  <span className="text-sm text-zinc-500">
                    Heure locale de ce navigateur ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setScheduledAt("")}>
                    Effacer
                  </Button>
                </>
              )}
            </div>
          </Section>

          {errors.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {errors.map((e) => (
                <li key={e} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {e}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button variant="outline" onClick={() => router.push("/broadcasts")}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setEstimateMismatch(null);
                setConfirmOpen(true);
              }}
              disabled={!canSend}
              className={
                isStatut
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                  : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              }
            >
              {estimateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isStatut ? (
                    <Radio className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Megaphone className="mr-1.5 h-4 w-4" />
                  )}
                  {scheduledAt ? "Programmer" : "Diffuser maintenant"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Colonne aperçu ──────────────────────────────────────────── */}
        <div className="self-start lg:sticky lg:top-6">
          <PreviewPanel
            content={previewContent}
            lang={lang}
            onLangChange={setLang}
            modalTitle={isStatut ? "Statut officiel" : "Diffusion"}
          />
        </div>
      </div>

      {/* ── Confirmation ────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {scheduledAt ? "Programmer cette diffusion ?" : "Confirmer l'envoi"}
            </DialogTitle>
            <DialogDescription>
              {isStatut
                ? "Le statut sera visible 24 h par les destinataires ciblés."
                : "Le message arrivera dans la conversation officielle des destinataires."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <span className="font-mono text-2xl font-semibold tabular-nums text-amber-900 dark:text-amber-200">
                  {(estimateMismatch ?? estimatedCount)?.toLocaleString("fr-FR") ?? "—"}
                </span>
                <span className="text-sm text-amber-800 dark:text-amber-300">destinataires</span>
              </div>
              <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-300/90">
                {criteriaSummary}
              </p>
              {estimateMismatch != null && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  L&apos;estimation a changé depuis votre dernière consultation — c&apos;est ce
                  nouveau total qui sera diffusé.
                </p>
              )}
            </div>

            {scheduledAt && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Envoi programmé le{" "}
                <strong>{new Date(scheduledAt).toLocaleString("fr-FR")}</strong>. Vous pourrez
                l&apos;annuler depuis l&apos;historique tant qu&apos;il n&apos;est pas parti.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Retour
            </Button>
            <Button
              onClick={() => submitBroadcast(estimateMismatch ?? estimatedCount ?? undefined)}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Confirmer et {scheduledAt ? "programmer" : "diffuser"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Section numérotée du formulaire. */
function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800">
            {step}
          </span>
          {title}
        </CardTitle>
        {description ? <CardDescription className="pl-[34px]">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
