/**
 * Stickers (type de message 10) — appels d'administration.
 *
 * Les réponses arrivent en camelCase (`snakeToCamel`, lib/api.ts) ; les corps
 * envoyés partent tels qu'écrits, donc en snake_case explicite, comme le
 * backend les lit (plan §6.4). Le serveur tranche les droits et les quotas : ce
 * module ne fait que relayer ses réponses.
 */

import { api } from '@/lib/api';
import type {
  StickerPackCreatePayload,
  StickerPackDetail,
  StickerPackPatchPayload,
  StickerPackRow,
  StickerPackStatus,
  StickerPatchPayload,
  StickerReportRow,
  StickerSettings,
  StickerSettingsPatch,
  StickerUploaded,
} from '@/types';

/** Packs officiels, filtrés par statut et par recherche libre. */
export async function fetchStickerPacks(
  params: { status?: StickerPackStatus; q?: string } = {},
): Promise<StickerPackRow[]> {
  const res = await api.get('/admin/sticker-packs', { params });
  return (res.data?.packs ?? []) as StickerPackRow[];
}

/** Un pack et ses stickers, ordonnés par `position`. */
export async function fetchStickerPack(id: number): Promise<StickerPackDetail> {
  const res = await api.get(`/admin/sticker-packs/${id}`);
  return res.data as StickerPackDetail;
}

/** Crée un brouillon ; renvoie l'identifiant et le code retenus par le serveur. */
export async function createStickerPack(
  payload: StickerPackCreatePayload,
): Promise<{ id: number; code: string }> {
  const res = await api.post('/admin/sticker-packs', payload);
  return res.data as { id: number; code: string };
}

export async function updateStickerPack(
  id: number,
  payload: StickerPackPatchPayload,
): Promise<void> {
  await api.patch(`/admin/sticker-packs/${id}`, payload);
}

/**
 * Envoi multiple : jusqu'à 40 fichiers d'un coup, sous le champ `files`.
 *
 * Un seul emoji vaut pour tout le lot (`emoji`) ; la variante `meta` du
 * contrat, avec un nom par fichier, n'est pas exposée ici — l'emoji de chaque
 * sticker se corrige ensuite au cas par cas dans la grille.
 */
export async function uploadStickerFiles(
  packId: number,
  files: File[],
  emoji: string,
  onProgress?: (pct: number) => void,
): Promise<StickerUploaded[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const trimmed = emoji.trim();
  if (trimmed) formData.append('emoji', trimmed);
  const res = await api.post(`/admin/sticker-packs/${packId}/stickers`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Le serveur décode, vérifie et ré-encode chaque image : plus long qu'un
    // téléversement ordinaire, d'où un délai élargi.
    timeout: 180_000,
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
  return (res.data?.stickers ?? []) as StickerUploaded[];
}

export async function updateSticker(id: number, payload: StickerPatchPayload): Promise<void> {
  await api.patch(`/admin/stickers/${id}`, payload);
}

/** Retire un sticker d'un brouillon (le serveur refuse sur un pack publié). */
export async function deleteSticker(id: number): Promise<void> {
  await api.delete(`/admin/stickers/${id}`);
}

/** Publie un pack complet ; un pack incomplet répond 422 STICKER_PACK_INCOMPLETE. */
export async function publishStickerPack(id: number): Promise<{ status: StickerPackStatus }> {
  const res = await api.post(`/admin/sticker-packs/${id}/publish`);
  return res.data as { status: StickerPackStatus };
}

/** Archive un pack publié — jamais de suppression (contrat §7). */
export async function archiveStickerPack(
  id: number,
): Promise<{ status: StickerPackStatus; code?: string }> {
  const res = await api.post(`/admin/sticker-packs/${id}/archive`);
  return res.data as { status: StickerPackStatus; code?: string };
}

export async function fetchStickerSettings(): Promise<StickerSettings> {
  const res = await api.get('/admin/sticker-settings');
  return res.data as StickerSettings;
}

export async function saveStickerSettings(
  payload: StickerSettingsPatch,
): Promise<StickerSettings> {
  const res = await api.put('/admin/sticker-settings', payload);
  return res.data as StickerSettings;
}

/** File des signalements de stickers perso. */
export async function fetchStickerReports(): Promise<StickerReportRow[]> {
  const res = await api.get('/admin/sticker-reports');
  return (res.data?.reports ?? []) as StickerReportRow[];
}

/** Retire un sticker perso : fichier supprimé et empreinte bloquée côté serveur. */
export async function takedownStickerAsset(assetId: number): Promise<void> {
  await api.post(`/admin/sticker-assets/${assetId}/takedown`);
}
