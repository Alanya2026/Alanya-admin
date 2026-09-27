import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchUsers,
  banUser,
  unbanUser,
  setUserRole,
  setUserSocle,
  deleteUser,
  createUser,
  updateUserPhone,
  fetchUserPhoneHistory,
  fetchReservedAlanyaPhones,
  addReservedAlanyaPhone,
  removeReservedAlanyaPhone,
  checkAssignablePhone,
} from '@/lib/mock-data';
import type { CreateUserPayload, ReservedAlanyaPhonesParams, SetUserSoclePayload } from '@/types';
import type { UsersApiParams } from '@/lib/api-params';

interface UsersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  idPays?: string;
  accountType?: string;
  typeCompte?: string;
  from?: string;
  to?: string;
  sort?: UsersApiParams['sort'];
  order?: UsersApiParams['order'];
}

export function useUsers(params: UsersParams) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => banUser(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unbanUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, typeCompte }: { id: number; typeCompte: number }) => setUserRole(id, typeCompte),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useSetUserSocle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SetUserSoclePayload }) =>
      setUserSocle(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      // La fiche est chargée sous 'admin-user-detail' (useUserDetail.ts) :
      // invalider 'admin-user' laissait la fiche ouverte sur l'ancien socle.
      qc.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      // Une révocation change le compte officiel : le composeur de diffusion
      // et son état vide en dépendent.
      qc.invalidateQueries({ queryKey: ['admin-official-account'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateUserPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alanyaPhone }: { id: number; alanyaPhone: string }) =>
      updateUserPhone(id, alanyaPhone),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      qc.invalidateQueries({ queryKey: ['admin-user-phone-history', id] });
    },
  });
}

export function useUserPhoneHistory(userId: number) {
  return useQuery({
    queryKey: ['admin-user-phone-history', userId],
    queryFn: () => fetchUserPhoneHistory(userId),
    enabled: Number.isInteger(userId) && userId > 0,
  });
}

export function useReservedAlanyaPhones(
  params: ReservedAlanyaPhonesParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin-reserved-phones', params],
    queryFn: () => fetchReservedAlanyaPhones(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAddReservedPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, label }: { phone: string; label: string }) =>
      addReservedAlanyaPhone(phone, label),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reserved-phones'] }),
  });
}

export function useRemoveReservedPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => removeReservedAlanyaPhone(phone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reserved-phones'] }),
  });
}

export function useCheckAssignablePhone(phone: string | null, enabled = true) {
  return useQuery({
    queryKey: ['admin-check-assignable-phone', phone],
    queryFn: () => checkAssignablePhone(phone!),
    enabled: enabled && !!phone,
    staleTime: 10_000,
  });
}
