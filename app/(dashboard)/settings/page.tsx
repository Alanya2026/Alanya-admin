"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SettingsPageSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/ui/toast";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useSecuritySettings, useUpdateSecuritySettings } from "@/hooks/useSecurity";
import { usePermissions } from "@/hooks/usePermissions";
import { Save, Globe, Bell, Shield, Palette, Loader2, Lock, Smartphone, Clock } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const {
    data: security,
    isLoading: securityLoading,
    isError: securityError,
  } = useSecuritySettings();
  const updateSecurity = useUpdateSecuritySettings();
  const { addToast } = useToast();
  const { can } = usePermissions();
  const isSuper = can("settings.write");

  const [appName, setAppName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [confirmDeviceBinding, setConfirmDeviceBinding] = useState(false);

  useEffect(() => {
    if (settings) {
      setAppName(settings.appName);
      setApiUrl(settings.apiUrl);
    }
  }, [settings]);

  const maintenance = settings?.maintenance ?? false;
  const deviceBinding = security?.deviceBindingEnabled ?? false;
  const dirty = !!settings && (appName !== settings.appName || apiUrl !== settings.apiUrl);

  function handleSave() {
    updateMutation.mutate(
      { appName, apiUrl },
      {
        onSuccess: () => addToast({ title: "Enregistré", variant: "success" }),
        onError: () => addToast({ title: "Échec", description: "Enregistrement impossible (réservé au super-admin ?)", variant: "error" }),
      }
    );
  }

  function toggleMaintenance() {
    if (!settings) return;
    const next = !settings.maintenance;
    updateMutation.mutate(
      { maintenance: next },
      {
        onSuccess: () => addToast({ title: next ? "Mode maintenance activé" : "Mode maintenance désactivé", variant: "success" }),
        onError: () => addToast({ title: "Échec", description: "Action réservée au super-admin", variant: "error" }),
      }
    );
  }

  function applyDeviceBinding(next: boolean) {
    updateSecurity.mutate(next, {
      onSuccess: () => addToast({
        title: next ? "Connexion limitée aux téléphones connus" : "Restriction levée",
        description: "Effet sous 30 secondes.",
        variant: "success",
      }),
      onError: () => addToast({ title: "Échec", description: "Action réservée au super-admin", variant: "error" }),
      onSettled: () => setConfirmDeviceBinding(false),
    });
  }

  /**
   * Restreindre peut empêcher des utilisateurs de se connecter : on confirme.
   * Lever la restriction les débloque — aucune raison de ralentir ce geste.
   */
  function toggleDeviceBinding(next: boolean) {
    if (next) setConfirmDeviceBinding(true);
    else applyDeviceBinding(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Configuration de l&apos;application</p>
      </div>

      {!isSuper && !isLoading && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-700 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          Lecture seule — la modification des paramètres est réservée au super-admin.
        </div>
      )}

      {isLoading ? (
        <SettingsPageSkeleton />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Général</CardTitle>
            </div>
            <CardDescription>Paramètres généraux de l&apos;application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Nom de l&apos;application</Label>
              <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} disabled={!isSuper} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">URL de l&apos;API</Label>
              <Input id="apiUrl" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} disabled={!isSuper} />
            </div>
            <Button onClick={handleSave} disabled={!isSuper || !dirty || updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Apparence</CardTitle>
            </div>
            <CardDescription>Thème et personnalisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">Le thème (clair/sombre) se configure via le bouton en haut à droite.</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
              <Palette className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-sm font-medium">Thème système</p>
                <p className="text-xs text-zinc-500">Suit les préférences de votre appareil</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Configuration des notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">La gestion des notifications sera disponible dans une prochaine version.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Maintenance</CardTitle>
            </div>
            <CardDescription>Mode maintenance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">Activer le mode maintenance pour bloquer l&apos;accès des utilisateurs.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMaintenance}
                disabled={!isSuper || updateMutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${maintenance ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenance ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm">{maintenance ? "Activé" : "Désactivé"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Sécurité</CardTitle>
            </div>
            <CardDescription>Connexion depuis un nouveau téléphone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  N&apos;autoriser la connexion par mot de passe que depuis les téléphones déjà connus
                </p>
                <p className="text-sm text-zinc-500">
                  Un téléphone inconnu doit d&apos;abord être ajouté en scannant le QR code depuis un
                  appareil déjà connecté. Un compte qui n&apos;a plus aucun appareil actif n&apos;est
                  jamais bloqué.
                </p>
              </div>
              {securityLoading ? (
                <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
              ) : (
                <Switch
                  checked={deviceBinding}
                  disabled={!isSuper || securityError || updateSecurity.isPending}
                  onCheckedChange={toggleDeviceBinding}
                  aria-label="N'autoriser la connexion par mot de passe que depuis les téléphones déjà connus"
                  className="mt-0.5 shrink-0"
                />
              )}
            </div>
            {securityError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Réglage indisponible : l&apos;état n&apos;a pas pu être chargé.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Une bascule met jusqu&apos;à 30 secondes à se propager aux serveurs.
              </p>
            )}
          </CardContent>
        </Card>

        {isSuper && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Numéros Alanya réservés</CardTitle>
              <CardDescription>Gérer les numéros réservés (super-admin)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push("/settings/reserved-alanya-phones")}>
                Ouvrir la liste
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      <ConfirmDialog
        open={confirmDeviceBinding}
        onOpenChange={setConfirmDeviceBinding}
        title="Limiter la connexion aux téléphones connus ?"
        description="Les utilisateurs dont le téléphone n'est pas encore enregistré ne pourront plus se connecter avec leur mot de passe : il leur faudra scanner le QR code depuis un appareil déjà connecté, ou passer par « Mot de passe oublié » si le téléphone est perdu ou cassé. Comptez jusqu'à 30 secondes avant que la restriction s'applique partout."
        confirmLabel="Activer la restriction"
        pending={updateSecurity.isPending}
        onConfirm={() => applyDeviceBinding(true)}
      />
    </div>
  );
}
