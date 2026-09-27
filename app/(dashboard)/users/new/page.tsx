"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateUser, useReservedAlanyaPhones, useCheckAssignablePhone } from "@/hooks/useUsers";
import { useOfficialAccount, useCreateOfficialAccount } from "@/hooks/useBroadcasts";
import { ReservedPhoneSearchSkeleton, SelectFieldSkeleton } from "@/components/skeletons";
import { useCountries } from "@/hooks/useCountries";
import { usePermissions } from "@/hooks/usePermissions";
import {
  formatDisplay,
  formatLiveInput,
  isAssignableQuery,
  isCompletePhone,
  normalize,
  validate,
} from "@/lib/alanya-phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { CreateUserPayload } from "@/types";

function randomPassword(length = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function NewUserPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { can } = usePermissions();
  const isSuper = can("users.role");
  const createMutation = useCreateUser();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();

  const [nom, setNom] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneMode, setPhoneMode] = useState<"auto" | "manual">("auto");
  const [manualPhone, setManualPhone] = useState("");
  const [idPays, setIdPays] = useState(10);
  const [avatarGender, setAvatarGender] = useState<"male" | "female">("male");
  const [typeCompte, setTypeCompte] = useState(0);
  const [accountType, setAccountType] = useState(0);
  const [confirmOfficial, setConfirmOfficial] = useState(false);

  // Le compte officiel n'a rien à saisir : le formulaire disparaît au profit
  // d'une explication et d'une confirmation.
  const isOfficial = accountType === 2;
  const { data: official, isLoading: officialLoading } = useOfficialAccount();
  const officialMutation = useCreateOfficialAccount();
  const [selectedReservedPhone, setSelectedReservedPhone] = useState("");
  const [reservedSearch, setReservedSearch] = useState("");
  const [debouncedReservedSearch, setDebouncedReservedSearch] = useState("");
  const [debouncedManualPhone, setDebouncedManualPhone] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedReservedSearch(reservedSearch), 300);
    return () => clearTimeout(timer);
  }, [reservedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedManualPhone(manualPhone), 300);
    return () => clearTimeout(timer);
  }, [manualPhone]);

  const { data: reservedData, isFetching: reservedFetching } = useReservedAlanyaPhones(
    {
      page: 1,
      limit: 20,
      q: debouncedReservedSearch || undefined,
      available: "1",
    },
    { enabled: debouncedReservedSearch.length > 0 },
  );
  const availableReservedPhones = reservedData?.items ?? [];
  const patternSuggestion = reservedData?.patternSuggestion ?? null;

  const manualCanonical = normalize(debouncedManualPhone);
  const { data: manualCheck, isFetching: manualCheckFetching } = useCheckAssignablePhone(
    manualCanonical,
    phoneMode === "manual" && !selectedReservedPhone && isCompletePhone(manualCanonical),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reserved = new URLSearchParams(window.location.search).get("reserved");
    if (!reserved) return;
    const canonical = normalize(reserved);
    setSelectedReservedPhone(canonical);
  }, []);

  useEffect(() => {
    if (countries.length === 0) return;
    setIdPays((current) =>
      countries.some((c) => c.idPays === current) ? current : countries[0].idPays,
    );
  }, [countries]);

  function handlePhoneInput(val: string) {
    setManualPhone(formatLiveInput(val));
  }

  async function createOfficial() {
    try {
      const user = await officialMutation.mutateAsync();
      addToast({ title: "Compte officiel créé", description: `${user.nom} peut désormais diffuser` });
      router.push(`/users/${user.alanyaID}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || "Erreur création";
      addToast({ title: "Échec", description: msg, variant: "error" });
    } finally {
      setConfirmOfficial(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Création irréversible et unique : on demande confirmation avant, jamais
    // au retour d'une erreur serveur.
    if (isOfficial) {
      if (official) return;
      setConfirmOfficial(true);
      return;
    }

    if (!nom.trim() || !pseudo.trim() || !password) {
      addToast({ title: "Champs requis", description: "Nom, pseudo et mot de passe obligatoires", variant: "error" });
      return;
    }

    const payload: CreateUserPayload = {
      nom: nom.trim(),
      pseudo: pseudo.trim(),
      password,
      idPays,
      avatarGender,
    };

    if (email.trim()) payload.email = email.trim().toLowerCase();

    if (selectedReservedPhone) {
      payload.alanyaPhone = selectedReservedPhone;
    } else if (phoneMode === "manual") {
      const canonical = normalize(manualPhone);
      const err = validate(canonical);
      if (err) {
        addToast({ title: "Numéro invalide", description: err, variant: "error" });
        return;
      }
      if (manualCheck && !manualCheck.assignable) {
        addToast({
          title: "Numéro indisponible",
          description: manualCheck.reason || "Ce numéro ne peut pas être attribué",
          variant: "error",
        });
        return;
      }
      payload.alanyaPhone = canonical;
    }

    if (isSuper) payload.type_compte = typeCompte;
    if (accountType !== 0) payload.account_type = accountType;

    try {
      const user = await createMutation.mutateAsync(payload);
      addToast({ title: "Utilisateur créé", description: `Compte ${user.nom} créé avec succès` });
      router.push(`/users/${user.alanyaID}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erreur création";
      addToast({ title: "Échec", description: msg, variant: "error" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Créer un utilisateur</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Genre de compte</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={accountType}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAccountType(next);
                  // Les deux axes sont exclusifs : un compte public ne doit pas
                  // ouvrir le back-office.
                  if (next !== 0) setTypeCompte(0);
                }}
              >
                <option value={0}>Personnel</option>
                <option value={1}>Business</option>
                <option value={2}>Officiel</option>
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Ce choix commande le reste du formulaire.
              </p>
            </div>

            {isOfficial ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Ce compte est la voix de l&rsquo;application.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                    <li>Son nom sera <strong>Alanya</strong> et sa photo le logo Alanya.</li>
                    <li>Il recevra le numéro réservé <strong>000</strong>.</li>
                    <li>Il sert <strong>uniquement aux diffusions</strong> : personne ne peut lui répondre, l&rsquo;appeler, l&rsquo;ajouter à un groupe ni le trouver dans la recherche.</li>
                    <li>Aucune connexion n&rsquo;est possible : ni mot de passe, ni e-mail, ni code de récupération.</li>
                    <li>Il ne peut en exister qu&rsquo;<strong>un seul</strong>.</li>
                  </ul>
                </div>

                {officialLoading ? (
                  <p className="text-sm text-zinc-500">Vérification…</p>
                ) : official ? (
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm">
                      Le compte officiel existe déjà.{" "}
                      <Link href={`/users/${official.alanyaID}`} className="underline font-medium">
                        Voir sa fiche
                      </Link>
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nom *</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Pseudo *</label>
                <Input value={pseudo} onChange={(e) => setPseudo(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Obligatoire sauf compte 3 chiffres" />
            </div>

            <div>
              <label className="text-sm font-medium">Mot de passe *</label>
              <div className="flex gap-2">
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="button" variant="outline" size="icon" onClick={() => setPassword(randomPassword())} title="Générer">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Numéro Alanya</label>
              <div className="mb-3">
                <label className="text-sm text-zinc-500 block mb-1">
                  Attribuer un numéro réservé (optionnel)
                </label>
                <p className="text-xs text-zinc-500 mb-2">
                  Recherchez dans la liste admin ou saisissez un numéro pattern complet
                  (3 ch., 4 ch., ou 8 ch. XXYYZZTT). Les patterns peuvent être attribués
                  directement sans être ajoutés à la liste.
                </p>
                {selectedReservedPhone ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1">
                      {formatDisplay(selectedReservedPhone)}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReservedPhone("")}
                    >
                      Effacer
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={reservedSearch}
                      onChange={(e) => setReservedSearch(e.target.value)}
                      placeholder="Ex. 11223344, 1234, ou libellé…"
                      className="mb-2"
                    />
                    {reservedFetching ? (
                      <ReservedPhoneSearchSkeleton count={4} />
                    ) : patternSuggestion || availableReservedPhones.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                        {patternSuggestion && (
                          <button
                            key={`pattern-${patternSuggestion.phoneCanonical}`}
                            type="button"
                            disabled={!patternSuggestion.assignable}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (!patternSuggestion.assignable) return;
                              setSelectedReservedPhone(patternSuggestion.phoneCanonical);
                              setReservedSearch("");
                            }}
                          >
                            <span className="font-mono">
                              {formatDisplay(patternSuggestion.phoneCanonical)}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {" "}
                              — {patternSuggestion.label}
                            </span>
                            {!patternSuggestion.assignable && (
                              <span className="text-red-500"> (déjà utilisé)</span>
                            )}
                          </button>
                        )}
                        {availableReservedPhones.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            onClick={() => {
                              setSelectedReservedPhone(item.phoneCanonical);
                              setReservedSearch("");
                            }}
                          >
                            <span className="font-mono">{formatDisplay(item.phoneCanonical)}</span>
                            <span className="text-zinc-500"> — {item.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : debouncedReservedSearch ? (
                      <p className="text-sm text-zinc-500">
                        {isAssignableQuery(debouncedReservedSearch)
                          ? "Aucun numéro libre trouvé dans la liste admin"
                          : "Aucun résultat — saisissez un numéro pattern complet (3, 4 ou 8 ch. XXYYZZTT)"}
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Recherchez dans la liste admin ou saisissez un pattern complet
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className={`flex gap-4 mb-3 ${selectedReservedPhone ? "opacity-50 pointer-events-none" : ""}`}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={phoneMode === "auto"} onChange={() => setPhoneMode("auto")} />
                  Auto-générer
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={phoneMode === "manual"} onChange={() => setPhoneMode("manual")} />
                  Saisie manuelle
                </label>
              </div>
              {phoneMode === "auto" ? (
                <p className={`text-sm text-zinc-500 ${selectedReservedPhone ? "opacity-50" : ""}`}>
                  8 chiffres (génération automatique, hors numéros réservés)
                </p>
              ) : (
                <>
                  <Input
                    value={manualPhone}
                    onChange={(e) => handlePhoneInput(e.target.value)}
                    placeholder="007 / 12 34 / 00 00 00 00"
                    disabled={!!selectedReservedPhone}
                    className={selectedReservedPhone ? "opacity-50" : ""}
                  />
                  {manualCheckFetching && isCompletePhone(manualCanonical) && (
                    <p className="text-xs text-zinc-500 mt-1">Vérification…</p>
                  )}
                  {manualCheck && !manualCheckFetching && (
                    <p
                      className={`text-xs mt-1 ${
                        !manualCheck.assignable
                          ? "text-red-500"
                          : manualCheck.quarantineUntil
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {manualCheck.assignable
                        ? manualCheck.hint || "Numéro disponible"
                        : manualCheck.reason || "Numéro indisponible"}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">
                    Saisie libre : patterns réservés ou numéros standard 8 chiffres
                  </p>
                </>
              )}
              {selectedReservedPhone && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">
                  Numéro attribué : {formatDisplay(selectedReservedPhone)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {loadingCountries ? (
                <SelectFieldSkeleton />
              ) : (
              <div>
                <label className="text-sm font-medium">Pays</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
                  value={idPays}
                  onChange={(e) => setIdPays(Number(e.target.value))}
                  disabled={countries.length === 0}
                  required
                >
                  {countries.map((country) => (
                    <option key={country.idPays} value={country.idPays}>
                      {country.libelle} ({country.prefix})
                    </option>
                  ))}
                </select>
              </div>
              )}
              <div>
                <label className="text-sm font-medium">Avatar</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={avatarGender}
                  onChange={(e) => setAvatarGender(e.target.value as "male" | "female")}
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
            </div>

            {isSuper && (
              <div>
                <label className="text-sm font-medium">Rôle</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
                  value={typeCompte}
                  disabled={accountType !== 0}
                  onChange={(e) => setTypeCompte(Number(e.target.value))}
                >
                  <option value={0}>Utilisateur</option>
                  <option value={1}>Admin</option>
                  <option value={2}>Super-admin</option>
                </select>
              </div>
            )}

              </>
            )}

            <Button
              type="submit"
              disabled={createMutation.isPending || officialMutation.isPending || (isOfficial && (officialLoading || !!official))}
              className="w-full"
            >
              {createMutation.isPending || officialMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isOfficial ? (
                "Créer le compte officiel"
              ) : (
                "Créer le compte"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={confirmOfficial} onOpenChange={setConfirmOfficial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer le compte officiel Alanya ?</DialogTitle>
            <DialogDescription>
              Il ne pourra en exister qu&rsquo;un seul, et il servira uniquement à diffuser
              des annonces. Personne ne pourra lui répondre ni s&rsquo;y connecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={createOfficial} disabled={officialMutation.isPending}>
              {officialMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
