/**
 * Abonnement Alanya Plus — appels d'administration.
 *
 * Les réponses arrivent en camelCase (`snakeToCamel`, lib/api.ts) ; les corps
 * envoyés partent tels qu'écrits, donc en snake_case explicite, comme le
 * backend les lit (src/services/billing/rules.js).
 */

import { api } from '@/lib/api';
import type {
  BillingFeature,
  BillingFeaturePatch,
  BillingPaymentRow,
  BillingPaymentStatus,
  BillingPlan,
  BillingPlanPayload,
  BillingSettingsPatch,
  BillingSettingsResponse,
  BillingSubscriberFilter,
  BillingSubscriberRow,
  UserBillingResponse,
} from '@/types';

/** Paiements, les plus récents d'abord (200 au plus par page, côté serveur). */
export async function fetchBillingPayments(
  params: { status?: BillingPaymentStatus; before?: number; limit?: number } = {},
): Promise<BillingPaymentRow[]> {
  const res = await api.get('/admin/billing/payments', { params });
  return (res.data?.payments ?? []) as BillingPaymentRow[];
}

export async function fetchBillingSubscribers(
  filter: BillingSubscriberFilter,
  limit = 200,
): Promise<BillingSubscriberRow[]> {
  const res = await api.get('/admin/billing/subscribers', { params: { filter, limit } });
  return (res.data?.subscribers ?? []) as BillingSubscriberRow[];
}

export async function fetchUserBilling(userId: number): Promise<UserBillingResponse> {
  const res = await api.get(`/admin/users/${userId}/billing`);
  return res.data as UserBillingResponse;
}

/** Une période offerte (1 à 24 mois), jamais un faux paiement. Motif journalisé. */
export async function giftSubscription(
  userId: number,
  payload: { months: number; reason: string; grantsBadge?: boolean },
): Promise<UserBillingResponse> {
  const res = await api.post(`/admin/users/${userId}/billing/gift`, payload);
  return res.data as UserBillingResponse;
}

/** Retire la coche (fonctionnalités conservées). Motif journalisé et notifié. */
export async function revokeBadge(
  userId: number,
  reason: string,
): Promise<UserBillingResponse> {
  const res = await api.post(`/admin/users/${userId}/badge/revoke`, { reason });
  return res.data as UserBillingResponse;
}

/** Lève une révocation : la coche revient si l'abonnement la porte encore. */
export async function restoreBadge(
  userId: number,
  reason: string,
): Promise<UserBillingResponse> {
  const res = await api.post(`/admin/users/${userId}/badge/restore`, { reason });
  return res.data as UserBillingResponse;
}

export async function fetchBillingSettings(): Promise<BillingSettingsResponse> {
  const res = await api.get('/admin/billing/settings');
  return res.data as BillingSettingsResponse;
}

export async function updateBillingSettings(payload: BillingSettingsPatch): Promise<BillingSettingsResponse> {
  const res = await api.put('/admin/billing/settings', payload);
  return res.data as BillingSettingsResponse;
}

/** Allume le payant : la grâce commence maintenant. Le motif est journalisé. */
export async function activateBilling(payload: { graceDays?: number; reason: string }): Promise<BillingSettingsResponse> {
  const res = await api.post('/admin/billing/activate', payload);
  return res.data as BillingSettingsResponse;
}

export async function deactivateBilling(reason: string): Promise<BillingSettingsResponse> {
  const res = await api.post('/admin/billing/deactivate', { reason });
  return res.data as BillingSettingsResponse;
}

export async function extendBillingGrace(payload: { graceUntil: string; reason: string }): Promise<BillingSettingsResponse> {
  const res = await api.post('/admin/billing/extend-grace', payload);
  return res.data as BillingSettingsResponse;
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  const res = await api.get('/admin/billing/plans');
  return (res.data?.plans ?? []) as BillingPlan[];
}

export async function createBillingPlan(payload: BillingPlanPayload): Promise<BillingPlan> {
  const res = await api.post('/admin/billing/plans', payload);
  return res.data?.plan as BillingPlan;
}

export async function updateBillingPlan(id: number, payload: Partial<BillingPlanPayload>): Promise<BillingPlan> {
  const res = await api.put(`/admin/billing/plans/${id}`, payload);
  return res.data?.plan as BillingPlan;
}

export async function fetchBillingFeatures(): Promise<BillingFeature[]> {
  const res = await api.get('/admin/billing/features');
  return (res.data?.features ?? []) as BillingFeature[];
}

export async function updateBillingFeature(code: string, payload: BillingFeaturePatch): Promise<BillingFeature[]> {
  const res = await api.put(`/admin/billing/features/${code}`, payload);
  return (res.data?.features ?? []) as BillingFeature[];
}
