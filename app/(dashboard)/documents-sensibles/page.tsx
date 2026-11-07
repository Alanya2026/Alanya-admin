"use client";

/**
 * Documents sensibles — enquête par empreinte (super-admin).
 *
 * Une copie signée porte une empreinte de 128 bits. On la saisit avec un
 * motif ; le serveur dit qui l'a fait sortir, depuis quelle session, ce
 * qu'est devenu le document, et retrace TOUT son historique : envoi,
 * consultations, autres copies. Chaque recherche est journalisée à notre nom,
 * empreinte inconnue comprise — l'interface le rappelle avant d'envoyer.
 *
 * Rien n'est relancé tout seul : vérifier une autre copie depuis l'historique
 * remplit le champ, et c'est l'administrateur qui envoie.
 */

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, ClipboardPaste, Copy, FileText, Fingerprint, History, Loader2,
  MonitorSmartphone, Search, Send, ShieldAlert, UserRound, UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useVerifierEmpreinte } from "@/hooks/useDocumentsSensibles";
import { ACCOUNT_TYPE_LABELS } from "@/lib/account-labels";
import { formatDisplay } from "@/lib/alanya-phone";
import {
  ETAT_DOCUMENT_LABEL, GESTE_CLASS, STATUT_CLASS, STATUT_LABEL, dateEnquete, formaterEmpreinte,
  gesteLabel, motifValide, normaliserEmpreinte, saisieEmpreinte, tailleLisible, typeMediaLabel,
} from "@/lib/empreinte";
import { cn } from "@/lib/utils";
import type { EmpreinteFiche, EmpreintePersonne, GesteSensible } from "@/types";

const MONO = "font-mono tabular-nums tracking-wide";

const CONNEXION_LABEL: Record<string, string> = {
  password: "mot de passe",
  register: "inscription",
  qr: "QR code",
};

type ErreurApi = { response?: { status?: number; data?: { code?: string; error?: string } } };

function messageErreur(e: unknown): string {
  const r = (e as ErreurApi)?.response;
  switch (r?.data?.code ?? r?.status) {
    case "FINGERPRINT_NOT_FOUND":
    case 404:
      return "Aucune copie ne porte cette empreinte. La recherche a été notée au journal.";
    case "INVALID_FINGERPRINT":
    case 422:
      return "Empreinte mal formée : il faut 32 caractères hexadécimaux.";
    case "REASON_REQUIRED":
      return "Indiquez le motif de la recherche (trois caractères au moins).";
    case "INSUFFICIENT_ROLE":
    case 403:
      return "Réservé au super-administrateur.";
    default:
      return "La recherche a échoué. Réessayez dans un instant.";
  }
}

// ── Petites briques ──────────────────────────────────────────────────────

function Ligne({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? "—"}</dd>
    </div>
  );
}

function Quand({ iso }: { iso: string | null | undefined }) {
  const d = dateEnquete(iso);
  return (
    <span className="tabular-nums">
      {d.locale}
      {d.utc && <span className="ml-1.5 text-xs text-zinc-500">({d.utc})</span>}
    </span>
  );
}

function GesteBadge({ geste }: { geste: GesteSensible }) {
  return <Badge className={cn("border-0 font-medium", GESTE_CLASS[geste])}>{gesteLabel(geste)}</Badge>;
}

const numero = (n: string | null) => (n ? formatDisplay(n) : null);

function PersonneCarte({ titre, p, icone, enfants }: {
  titre: string; p: EmpreintePersonne; icone: ReactNode; enfants?: ReactNode;
}) {
  const supprime = p.statut === "supprime";
  const initiale = (p.nom || p.pseudo || "?").trim().charAt(0).toUpperCase();
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">{icone}{titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
            <AvatarFallback>{supprime ? "—" : initiale}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {supprime ? "Compte supprimé" : p.nom || p.pseudo || "Sans nom"}
            </p>
            <p className="text-xs text-zinc-500 tabular-nums">
              {[numero(p.numero), `#${p.id}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          {!supprime && (
            <Link href={`/users/${p.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Fiche
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("border-0", STATUT_CLASS[p.statut])}>{STATUT_LABEL[p.statut]}</Badge>
          {p.typeCompte != null && (
            <Badge variant="outline">{ACCOUNT_TYPE_LABELS[p.typeCompte] ?? `Type ${p.typeCompte}`}</Badge>
          )}
          {p.suppressionPrevueLe && (
            <Badge variant="outline">Suppression le {dateEnquete(p.suppressionPrevueLe).locale}</Badge>
          )}
        </div>
        {supprime && (
          <p className="text-xs text-zinc-500">
            La trace survit à la suppression du compte : il ne reste que son numéro interne.
          </p>
        )}
        {enfants}
      </CardContent>
    </Card>
  );
}

// ── Résultat ─────────────────────────────────────────────────────────────

function Fiche({ f, onVerifier }: { f: EmpreinteFiche; onVerifier: (empreinte: string) => void }) {
  const { addToast } = useToast();
  const s = f.session;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(formaterEmpreinte(f.empreinte));
      addToast({ title: "Empreinte copiée", variant: "success" });
    } catch {
      /* presse-papiers refusé : rien à faire */
    }
  };

  // L'envoi n'est pas une ligne de la table de traces : on le reconstitue
  // depuis le message, quand il existe encore.
  const envoi = f.document.envoyeLe
    ? { date: f.document.envoyeLe, nom: f.expediteur.statut === "supprime" ? null : f.expediteur.nom, id: f.expediteur.id }
    : null;

  return (
    <div className="space-y-6">
      {/* Bandeau */}
      <Card className="border-0 shadow-sm ring-1 ring-amber-200 dark:ring-amber-900/60">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GesteBadge geste={f.geste} />
              <span className="text-sm text-zinc-500">Copie sortie le</span>
              <span className="text-sm font-medium"><Quand iso={f.date} /></span>
            </div>
            <p className={cn(MONO, "text-lg font-semibold")}>{formaterEmpreinte(f.empreinte)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={copier}>
            <Copy className="mr-1.5 h-4 w-4" /> Copier
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <PersonneCarte
          titre="Auteur de la copie"
          p={f.auteur}
          icone={<UserRound className="h-4 w-4 text-indigo-600" />}
          enfants={
            <dl className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <Ligne label="Appareil déclaré">{f.appareil}</Ligne>
              {s && !s.connue && (
                <Ligne label="Session">
                  <span className={MONO}>#{s.appareilId}</span>
                  <span className="ml-1.5 text-xs text-zinc-500">plus en base</span>
                </Ligne>
              )}
              {s?.connue && (
                <>
                  <Ligne label="Session">
                    <span className={MONO}>#{s.appareilId}</span>
                    {s.nom && <> · {s.nom}</>}
                    {s.plateforme && <span className="text-zinc-500"> ({s.plateforme})</span>}
                  </Ligne>
                  <Ligne label="Adresse IP"><span className={MONO}>{s.ip}</span></Ligne>
                  <Ligne label="Ouverte le">
                    <Quand iso={s.ouverteLe} />
                    {s.connexion && <span className="text-zinc-500"> · par {CONNEXION_LABEL[s.connexion] ?? s.connexion}</span>}
                  </Ligne>
                  <Ligne label="Dernière activité"><Quand iso={s.derniereActivite} /></Ligne>
                  {s.revoqueeLe && <Ligne label="Révoquée le"><Quand iso={s.revoqueeLe} /></Ligne>}
                </>
              )}
              {!s && <Ligne label="Session">Non enregistrée (application ancienne)</Ligne>}
            </dl>
          }
        />
        <PersonneCarte
          titre="Expéditeur du document"
          p={f.expediteur}
          icone={<Send className="h-4 w-4 text-indigo-600" />}
        />
      </div>

      {s?.connue && (s.autresComptes?.length ?? 0) > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-red-200 dark:ring-red-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MonitorSmartphone className="h-4 w-4 text-red-600" />
              Autres comptes connectés depuis le même appareil
            </CardTitle>
            <CardDescription>Même identifiant matériel que la session qui a fait sortir la copie.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {s.autresComptes!.map((c) => (
              <Link
                key={c.id}
                href={`/users/${c.id}`}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {c.nom || "Sans nom"} <span className="text-xs text-zinc-500 tabular-nums">· {numero(c.numero) ?? `#${c.id}`}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document et conversation */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-indigo-600" /> Document
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 lg:grid-cols-2">
          <dl>
            <Ligne label="Nom">{f.document.nom ?? <span className="text-zinc-500">inconnu</span>}</Ligne>
            <Ligne label="Type">{typeMediaLabel(f.document.type)} · {tailleLisible(f.document.taille)}</Ligne>
            <Ligne label="Message"><span className={MONO}>#{f.document.msgID}</span></Ligne>
            <Ligne label="Envoyé le">{f.document.envoyeLe ? <Quand iso={f.document.envoyeLe} /> : "—"}</Ligne>
            <Ligne label="État">
              <span className={cn(f.document.etat !== "present" && "text-amber-700 dark:text-amber-400")}>
                {ETAT_DOCUMENT_LABEL[f.document.etat]}
              </span>
            </Ligne>
          </dl>
          <dl>
            <Ligne label="Conversation">
              <span className={MONO}>#{f.conversation.id}</span>
              {!f.conversation.existe && <span className="ml-1.5 text-zinc-500">supprimée</span>}
            </Ligne>
            {f.conversation.existe && (
              <>
                <Ligne label="Nature">
                  {f.conversation.groupe ? (
                    <Link href={`/groups/${f.conversation.id}`} className="text-indigo-600 hover:underline">
                      Groupe « {f.conversation.nom || "sans nom"} »
                    </Link>
                  ) : "Conversation à deux"}
                </Ligne>
                <Ligne label="Membres actuels">{f.conversation.membres}</Ligne>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Historique du document */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-indigo-600" /> Historique du document
          </CardTitle>
          <CardDescription>
            Envoi, chaque ouverture dans la visionneuse protégée et chaque copie signée, dans l&apos;ordre.
            {f.historique.tronque && " Limité aux 500 premiers événements."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-0 border-l border-zinc-200 pl-5 dark:border-zinc-800">
            {envoi && (
              <li className="relative pb-4">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-zinc-500 tabular-nums">{dateEnquete(envoi.date).locale}</span>
                  <Badge className="border-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Envoi</Badge>
                  <span>{envoi.nom ?? `Compte supprimé #${envoi.id}`}</span>
                </div>
              </li>
            )}
            {f.historique.evenements.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "relative -ml-2 rounded-lg py-2 pl-2 pr-2",
                  e.cetteCopie && "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900/60",
                )}
              >
                <span
                  className={cn(
                    "absolute -left-[1.1rem] top-3.5 h-2.5 w-2.5 rounded-full",
                    e.empreinte ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600",
                  )}
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-zinc-500 tabular-nums">{dateEnquete(e.date).locale}</span>
                  <GesteBadge geste={e.geste} />
                  {e.personne.supprime ? (
                    <span className="text-zinc-500">Compte supprimé #{e.personne.id}</span>
                  ) : (
                    <Link href={`/users/${e.personne.id}`} className="hover:underline">
                      {e.personne.nom || numero(e.personne.numero) || `#${e.personne.id}`}
                    </Link>
                  )}
                  {e.appareil && <span className="text-xs text-zinc-500">· {e.appareil}</span>}
                  {e.empreinte && (
                    e.cetteCopie ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">← cette copie</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onVerifier(e.empreinte!)}
                        className={cn(MONO, "text-xs text-indigo-600 hover:underline")}
                        title="Préparer la vérification de cette copie"
                      >
                        {formaterEmpreinte(e.empreinte).slice(0, 9)}…
                      </button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Autres copies de l'auteur */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Copies sorties par l&apos;auteur</CardTitle>
            <CardDescription>
              {f.sortiesAuteur.total} copie{f.sortiesAuteur.total > 1 ? "s" : ""} signée{f.sortiesAuteur.total > 1 ? "s" : ""} au total, celle-ci comprise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {f.sortiesAuteur.dernieres.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune autre copie.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {f.sortiesAuteur.dernieres.map((c) => (
                  <li key={c.empreinte} className="flex items-center gap-2 py-2 text-sm">
                    <span className="w-28 shrink-0 text-xs text-zinc-500 tabular-nums">{dateEnquete(c.date).locale}</span>
                    <span className="min-w-0 flex-1 truncate">{c.document.nom ?? `Message #${c.document.msgID}`}</span>
                    <GesteBadge geste={c.geste} />
                    <button
                      type="button"
                      onClick={() => onVerifier(c.empreinte)}
                      className={cn(MONO, "text-xs text-indigo-600 hover:underline")}
                      title="Préparer la vérification de cette copie"
                    >
                      {formaterEmpreinte(c.empreinte).slice(0, 9)}…
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vérifications précédentes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-indigo-600" /> Vérifications de cette empreinte
            </CardTitle>
            <CardDescription>Qui a cherché cette copie, quand, et pourquoi — la présente recherche comprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {f.verifications.map((v, i) => (
                <li key={`${v.date}-${i}`} className="py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 tabular-nums">{dateEnquete(v.date).locale}</span>
                    <span className="font-medium">{v.admin?.nom ?? (v.admin ? `#${v.admin.id}` : "Administrateur supprimé")}</span>
                  </div>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{v.motif ?? "—"}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

function Enquete() {
  const params = useSearchParams();
  const [saisie, setSaisie] = useState(() => saisieEmpreinte(params.get("empreinte") ?? ""));
  const [motif, setMotif] = useState("");
  const [fiche, setFiche] = useState<EmpreinteFiche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const verifier = useVerifierEmpreinte();
  const champ = useRef<HTMLInputElement>(null);

  // Lien depuis le journal : l'empreinte arrive préremplie, le motif reste à
  // saisir — la recherche ne part jamais seule.
  useEffect(() => {
    const e = params.get("empreinte");
    if (e) setSaisie(saisieEmpreinte(e));
  }, [params]);

  const empreinte = normaliserEmpreinte(saisie);
  const pret = !!empreinte && motifValide(motif) && !verifier.isPending;

  const lancer = () => {
    if (!empreinte || !motifValide(motif)) return;
    setErreur(null);
    verifier.mutate(
      { empreinte, reason: motif.trim() },
      {
        onSuccess: (f) => setFiche(f),
        onError: (e) => {
          setFiche(null);
          setErreur(messageErreur(e));
        },
      },
    );
  };

  const coller = async () => {
    try {
      setSaisie(saisieEmpreinte(await navigator.clipboard.readText()));
    } catch {
      champ.current?.focus();
    }
  };

  const preparer = (e: string) => {
    setSaisie(formaterEmpreinte(e));
    setErreur(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    champ.current?.focus();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Fingerprint className="h-7 w-7 text-indigo-600" />
          Documents sensibles
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Retrouver qui a fait sortir une copie signée, et retracer l&apos;historique du document
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Vérifier une empreinte</CardTitle>
          <CardDescription>
            L&apos;empreinte est écrite sur la copie (pied de page, métadonnées). Collez-la telle quelle : espaces et casse sont indifférents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              lancer();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="empreinte" className="text-sm font-medium">Empreinte</label>
              <div className="flex gap-2">
                <Input
                  id="empreinte"
                  ref={champ}
                  value={saisie}
                  onChange={(e) => setSaisie(saisieEmpreinte(e.target.value))}
                  placeholder="3F9A 0C1E 5B7D 0000 1111 2222 3333 ABCD"
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(MONO, "text-base")}
                />
                <Button type="button" variant="outline" onClick={coller} title="Coller">
                  <ClipboardPaste className="h-4 w-4" />
                </Button>
              </div>
              {saisie && !empreinte && (
                <p className="text-xs text-zinc-500">
                  {saisie.replace(/\s/g, "").length}/32 caractères
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="motif" className="text-sm font-medium">
                Motif <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex. : signalement #482 — contrat retrouvé sur un groupe public"
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-1.5 text-xs text-zinc-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                La recherche sera journalisée à votre nom avec ce motif, même si l&apos;empreinte est inconnue.
              </p>
              <Button type="submit" disabled={!pret} className="shrink-0">
                {verifier.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
                Vérifier
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {erreur}
        </div>
      )}

      {fiche && <Fiche f={fiche} onVerifier={preparer} />}

      {!fiche && !erreur && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-zinc-500">
          <UsersRound className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
          Auteur, session, document et historique complet s&apos;afficheront ici.
        </div>
      )}
    </div>
  );
}

export default function DocumentsSensiblesPage() {
  const { can, isLoading } = usePermissions();
  if (isLoading) return null;
  if (!can("documents.trace")) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center text-sm text-zinc-500">
        <ShieldAlert className="h-8 w-8" />
        Réservé au super-administrateur.
      </div>
    );
  }
  return (
    <Suspense fallback={null}>
      <Enquete />
    </Suspense>
  );
}
