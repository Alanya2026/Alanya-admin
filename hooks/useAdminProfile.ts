"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminProfile, UpdateProfilePayload, ChangePasswordPayload } from "@/types";

export function useAdminProfile() {
  return useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await api.get("/admin/me");
      return res.data as AdminProfile;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateAdminProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await api.put("/admin/me", payload);
      return res.data as AdminProfile;
    },
    onSuccess: (data) => {
      qc.setQueryData(["admin-profile"], data);
      // Mettre à jour le localStorage
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("admin_user");
        if (raw) {
          const user = JSON.parse(raw);
          user.nom = data.nom;
          user.pseudo = data.pseudo;
          user.email = data.email;
          user.avatarUrl = data.avatarUrl;
          localStorage.setItem("admin_user", JSON.stringify(user));
        }
      }
    },
  });
}

export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const res = await api.put("/admin/me/password", payload);
      return res.data;
    },
  });
}
