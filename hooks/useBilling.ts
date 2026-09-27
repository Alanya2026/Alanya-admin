import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateBilling,
  createBillingPlan,
  deactivateBilling,
  extendBillingGrace,
  fetchBillingFeatures,
  fetchBillingPayments,
  fetchBillingPlans,
  fetchBillingSettings,
  fetchBillingSubscribers,
  fetchUserBilling,
  giftSubscription,
  restoreBadge,
  revokeBadge,
  updateBillingFeature,
  updateBillingPlan,
  updateBillingSettings,
} from "@/lib/api/billing";
import type {
  BillingFeaturePatch,
  BillingPaymentStatus,
  BillingPlanPayload,
  BillingSettingsPatch,
  BillingSubscriberFilter,
} from "@/types";

const SETTINGS = ["admin-billing-settings"];
const PLANS = ["admin-billing-plans"];
const FEATURES = ["admin-billing-features"];
const PAYMENTS = ["admin-billing-payments"];
const SUBSCRIBERS = ["admin-billing-subscribers"];
const userBillingKey = (id: number) => ["admin-user-billing", id];

export function useBillingPayments(status?: BillingPaymentStatus) {
  return useQuery({
    queryKey: [...PAYMENTS, status ?? "all"],
    queryFn: () => fetchBillingPayments({ status, limit: 200 }),
  });
}

export function useBillingSubscribers(filter: BillingSubscriberFilter) {
  return useQuery({
    queryKey: [...SUBSCRIBERS, filter],
    queryFn: () => fetchBillingSubscribers(filter),
  });
}

export function useUserBilling(userId: number, enabled = true) {
  return useQuery({
    queryKey: userBillingKey(userId),
    queryFn: () => fetchUserBilling(userId),
    enabled: enabled && Number.isInteger(userId) && userId > 0,
  });
}

/** La réponse porte la carte à jour : posée en cache, sans relecture. */
function useUserBillingMutation<V>(
  fn: (v: V) => Promise<Awaited<ReturnType<typeof fetchUserBilling>>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      const userId = (vars as { userId: number }).userId;
      qc.setQueryData(userBillingKey(userId), data);
      qc.invalidateQueries({ queryKey: SUBSCRIBERS });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      qc.invalidateQueries({ queryKey: ["admin-user-detail"] });
    },
  });
}

export function useGiftSubscription() {
  return useUserBillingMutation(({
    userId, months, reason, grantsBadge,
  }: { userId: number; months: number; reason: string; grantsBadge?: boolean }) =>
    giftSubscription(userId, { months, reason, grantsBadge }));
}

export function useRevokeBadge() {
  return useUserBillingMutation(({ userId, reason }: { userId: number; reason: string }) =>
    revokeBadge(userId, reason));
}

export function useRestoreBadge() {
  return useUserBillingMutation(({ userId, reason }: { userId: number; reason: string }) =>
    restoreBadge(userId, reason));
}

export function useBillingSettings() {
  return useQuery({ queryKey: SETTINGS, queryFn: fetchBillingSettings });
}

/**
 * Chaque transition renvoie l'état complet : on le pose en cache plutôt que de
 * relire — et l'activité admin, qui vient d'enregistrer le geste, est rafraîchie.
 */
function useSettingsMutation<V>(fn: (v: V) => ReturnType<typeof fetchBillingSettings>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(SETTINGS, data);
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });
}

export const useUpdateBillingSettings = () =>
  useSettingsMutation((p: BillingSettingsPatch) => updateBillingSettings(p));
export const useActivateBilling = () =>
  useSettingsMutation((p: { graceDays?: number; reason: string }) => activateBilling(p));
export const useDeactivateBilling = () =>
  useSettingsMutation((reason: string) => deactivateBilling(reason));
export const useExtendBillingGrace = () =>
  useSettingsMutation((p: { graceUntil: string; reason: string }) => extendBillingGrace(p));

export function useBillingPlans() {
  return useQuery({ queryKey: PLANS, queryFn: fetchBillingPlans });
}

export function useCreateBillingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: BillingPlanPayload) => createBillingPlan(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS }),
  });
}

export function useUpdateBillingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BillingPlanPayload> }) =>
      updateBillingPlan(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS }),
  });
}

export function useBillingFeatures() {
  return useQuery({ queryKey: FEATURES, queryFn: fetchBillingFeatures });
}

export function useUpdateBillingFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: BillingFeaturePatch }) =>
      updateBillingFeature(code, payload),
    onSuccess: (features) => qc.setQueryData(FEATURES, features),
  });
}
