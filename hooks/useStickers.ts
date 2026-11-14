import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveStickerPack,
  createStickerPack,
  deleteSticker,
  fetchStickerPack,
  fetchStickerPacks,
  fetchStickerReports,
  fetchStickerSettings,
  publishStickerPack,
  saveStickerSettings,
  takedownStickerAsset,
  updateSticker,
  updateStickerPack,
  uploadStickerFiles,
} from '@/lib/api/stickers';
import type {
  StickerPackCreatePayload,
  StickerPackStatus,
  StickerPatchPayload,
  StickerSettingsPatch,
} from '@/types';

const PACKS = ['admin-sticker-packs'];
const SETTINGS = ['admin-sticker-settings'];
const REPORTS = ['admin-sticker-reports'];
const packKey = (id: number) => ['admin-sticker-pack', id];

/** Liste des packs, filtrée côté serveur par statut et recherche. */
export function useStickerPacks(params: { status?: StickerPackStatus; q?: string } = {}) {
  return useQuery({
    queryKey: [...PACKS, params],
    queryFn: () => fetchStickerPacks(params),
  });
}

export function useStickerPack(id: number) {
  return useQuery({
    queryKey: packKey(id),
    queryFn: () => fetchStickerPack(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/**
 * Toute écriture sur un pack rafraîchit sa fiche **et** la liste, et signale
 * l'activité admin : chaque geste y est journalisé sous forme de permission
 * (plan §6.4).
 */
function usePackMutation<I, R>(
  fn: (i: I) => Promise<R>,
  id: number,
  after?: (qc: ReturnType<typeof useQueryClient>, i: I, r: R) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data: R, vars: I) => {
      qc.invalidateQueries({ queryKey: packKey(id) });
      qc.invalidateQueries({ queryKey: PACKS });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
      after?.(qc, vars, data);
    },
  });
}

export function useCreateStickerPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StickerPackCreatePayload) => createStickerPack(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PACKS });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function useUpdateStickerPack(id: number) {
  return usePackMutation(
    (payload: Parameters<typeof updateStickerPack>[1]) => updateStickerPack(id, payload),
    id,
  );
}

/**
 * Envoi multiple. Le lot créé n'est pas déposé en cache : la fiche complète est
 * relue (`invalidateQueries`), seule façon d'obtenir les positions et URLs que
 * le serveur vient d'attribuer.
 */
export function useUploadStickerFiles(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      emoji,
      onProgress,
    }: {
      files: File[];
      emoji: string;
      onProgress?: (pct: number) => void;
    }) => uploadStickerFiles(id, files, emoji, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: packKey(id) });
      qc.invalidateQueries({ queryKey: PACKS });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

/**
 * Correctif d'un sticker (emoji, nom). Le serveur répond `{ ok:true }` ; on
 * rafraîchit la fiche sans chercher à recalculer l'ordre localement.
 */
export function useUpdateSticker(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stickerId, payload }: { stickerId: number; payload: StickerPatchPayload }) =>
      updateSticker(stickerId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: packKey(id) });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function useDeleteSticker(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stickerId: number) => deleteSticker(stickerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: packKey(id) });
      qc.invalidateQueries({ queryKey: PACKS });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function usePublishStickerPack(id: number) {
  return usePackMutation(() => publishStickerPack(id), id);
}

export function useArchiveStickerPack(id: number) {
  return usePackMutation(() => archiveStickerPack(id), id);
}

export function useStickerSettings() {
  return useQuery({ queryKey: SETTINGS, queryFn: fetchStickerSettings });
}

/**
 * Les réglages s'appliquent immédiatement : la réponse porte l'état complet,
 * posé en cache plutôt que relu. Seul un super-admin peut les modifier.
 */
export function useSaveStickerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StickerSettingsPatch) => saveStickerSettings(payload),
    onSuccess: (data) => {
      qc.setQueryData(SETTINGS, data);
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

/** File des signalements, rafraîchie régulièrement : une image abusive attend. */
export function useStickerReports() {
  return useQuery({
    queryKey: REPORTS,
    queryFn: fetchStickerReports,
    refetchInterval: 60_000,
  });
}

export function useTakedownStickerAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) => takedownStickerAsset(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS });
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}
