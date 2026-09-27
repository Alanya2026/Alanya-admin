import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchBroadcasts,
  fetchBroadcast,
  createBroadcast,
  estimateBroadcast,
  fetchOfficialAccount,
  createOfficialAccount,
  fetchVilles,
  cancelScheduledBroadcast,
} from '@/lib/mock-data';
import type { BroadcastFormData, BroadcastCriteria } from '@/types';

interface BroadcastsParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: string;
  type?: string;
  status?: string;
  idPays?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
}

const ACTIVE_STATUSES = new Set(['preparing', 'queued', 'running']);

export function useBroadcasts(params: BroadcastsParams = {}) {
  return useQuery({
    queryKey: ['admin-broadcasts', params],
    queryFn: () => fetchBroadcasts(params),
    placeholderData: keepPreviousData,
  });
}

export function useBroadcast(id: number | null, poll = false) {
  return useQuery({
    queryKey: ['admin-broadcast', id],
    queryFn: () => fetchBroadcast(id!),
    enabled: id != null && id > 0,
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status) ? 2500 : false;
    },
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BroadcastFormData) => createBroadcast(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
  });
}

export function useEstimateBroadcast() {
  return useMutation({
    mutationFn: (criteria: BroadcastCriteria) => estimateBroadcast(criteria),
  });
}

/** Le compte officiel, ou null s'il n'a pas encore été créé. */
export function useOfficialAccount() {
  return useQuery({
    queryKey: ['admin-official-account'],
    queryFn: fetchOfficialAccount,
    staleTime: 5 * 60_000,
  });
}

export function useCreateOfficialAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOfficialAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-official-account'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useVilles(idPays: number | null, search = '') {
  return useQuery({
    queryKey: ['admin-villes', idPays, search],
    queryFn: () => fetchVilles(idPays!, search),
    enabled: idPays != null && idPays > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCancelScheduledBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => cancelScheduledBroadcast(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });
}
