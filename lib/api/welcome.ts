import { normalizeWelcomeStatus, welcomeStatusPayload } from '@/lib/welcome-status';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchWelcomeConfig(): Promise<import('@/types').WelcomeAdminState> {
  const res = await api.get('/admin/welcome');
  return res.data as import('@/types').WelcomeAdminState;
}

export async function saveWelcomeDraft(blocks: import('@/types').WelcomeBlock[]): Promise<import('@/types').WelcomeConfig> {
  const res = await api.put('/admin/welcome/draft', { blocks });
  return res.data as import('@/types').WelcomeConfig;
}

export async function publishWelcomeConfig(): Promise<import('@/types').WelcomeConfig> {
  const res = await api.post('/admin/welcome/publish');
  return res.data as import('@/types').WelcomeConfig;
}

export interface WelcomeBackfillResult {
  queued: boolean;
  pending: number;
  /** Pourquoi rien n'a été mis en file : NOTHING_TO_DO | ALREADY_RUNNING. */
  reason?: string;
}

export async function backfillWelcomeMessages(): Promise<WelcomeBackfillResult> {
  const res = await api.post('/admin/welcome/backfill');
  return res.data as WelcomeBackfillResult;
}

/**
 * Statut de bienvenue — réglage global : le PUT prend effet immédiatement,
 * il ne transite pas par le brouillon ni par « Publier ».
 */
export async function fetchWelcomeStatus(): Promise<import('@/types').WelcomeStatusConfig> {
  const res = await api.get('/admin/welcome/status');
  return normalizeWelcomeStatus(res.data);
}

export async function saveWelcomeStatus(
  config: import('@/types').WelcomeStatusConfig,
): Promise<import('@/types').WelcomeStatusConfig> {
  const res = await api.put('/admin/welcome/status', welcomeStatusPayload(config));
  return normalizeWelcomeStatus(res.data);
}

// ── Assistance éditoriale ──
//
// N'écrit rien : ces routes remplissent le formulaire, la publication reste
// gardée par `welcome.*` et `broadcasts.send`. En mode maquette elles ne sont
// pas simulées — un faux texte traduit induirait en erreur sur la qualité
// réelle, qui est justement ce qu'on veut juger.

export async function fetchAiStatus(): Promise<import('@/types').AiStatus> {
  if (USE_MOCK) return { enabled: false, model: null };
  const res = await api.get('/admin/ai/status');
  return res.data as import('@/types').AiStatus;
}

export async function translateContent(params: {
  content: string;
  kind: import('@/types').AiContentKind;
  sourceLocale?: string;
  targets?: string[];
}): Promise<import('@/types').AiTranslateResult> {
  const res = await api.post('/admin/ai/translate', params);
  return res.data as import('@/types').AiTranslateResult;
}

export async function reviewContent(params: {
  translations: import('@/lib/content-locales').Translations;
  kind: import('@/types').AiContentKind;
}): Promise<import('@/types').AiReviewResult> {
  const res = await api.post('/admin/ai/review', params);
  return res.data as import('@/types').AiReviewResult;
}
