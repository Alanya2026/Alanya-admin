import { AdminProfile } from '@/types';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

const mockAdminProfile: AdminProfile = {
  alanyaID: 42,
  nom: "Chris Admin",
  pseudo: "chrisadmin",
  email: "admin@talky.app",
  alanyaPhone: "00000000",
  avatarUrl: "",
  typeCompte: 2,
  // Fixture de développement (NEXT_PUBLIC_USE_MOCK) : le jeu réel est calculé
  // par le serveur dans `constants/adminRoles.js`. Recopié ici pour que le mode
  // maquette n'affiche pas une interface amputée ; il peut dériver, et c'est
  // sans conséquence — le vrai chemin est `GET /admin/me`.
  permissions: [
    "ai.editorial",
    "analytics.export", "audit.read", "broadcasts.cancel", "broadcasts.read",
    "broadcasts.send", "groups.delete", "groups.read", "media.delete",
    "media.read", "meetings.delete", "meetings.end", "meetings.read",
    "official.create", "official.read", "phones.read", "phones.release",
    "phones.reserve", "profile.password", "profile.read", "profile.update",
    "purges.read", "purges.run", "purges.settings", "settings.read",
    "settings.write", "stats.read", "trips.purge", "trips.read", "users.ban",
    "users.create", "users.delete", "users.export", "users.phone", "users.read",
    "users.role", "users.socle", "users.unban", "villes.read",
    "welcome.backfill", "welcome.draft", "welcome.publish", "welcome.read",
    "welcome.status",
  ],
  paysLibelle: "Côte d'Ivoire",
  createdAt: "2026-01-12T10:00:00Z",
  lastSeen: new Date().toISOString(),
};

export async function fetchAdminProfile(): Promise<AdminProfile> {
  if (USE_MOCK) return mockAdminProfile;
  const res = await api.get('/admin/me');
  return res.data as AdminProfile;
}

export async function updateAdminProfile(data: Partial<AdminProfile>): Promise<AdminProfile> {
  if (USE_MOCK) {
    Object.assign(mockAdminProfile, data);
    return { ...mockAdminProfile };
  }
  const res = await api.put('/admin/me', data);
  return res.data as AdminProfile;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (USE_MOCK) return;
  await api.put('/admin/me/password', { currentPassword, newPassword });
}
