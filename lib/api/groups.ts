import { Group, GroupDetail } from '@/types';
import { mockGroups, mockGroupDetail } from '@/mock/groups';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchGroups(): Promise<Group[]> {
  if (USE_MOCK) return mockGroups;
  const res = await api.get('/admin/groups');
  return (res.data || []).map((g: Record<string, unknown>) => ({
    conversID: g.conversID as number,
    groupName: (g.GroupName as string) || 'Groupe',
    groupPhoto: typeof g.groupPhoto === 'string' && g.groupPhoto.startsWith('http') ? g.groupPhoto : '',
    lastMessage: (g.lastMessage as string) || '',
    lastMessageAt: g.lastMessageAt as string,
    members: (g.members as number) || 0,
    createdAt: g.createdAt as string,
  }));
}

export async function fetchGroupDetail(id: number): Promise<GroupDetail> {
  if (USE_MOCK) return mockGroupDetail(id);
  const res = await api.get(`/admin/groups/${id}`);
  const d = res.data as Record<string, unknown>;
  return {
    conversID: d.conversID as number,
    groupName: (d.GroupName as string) || 'Groupe',
    groupPhoto: typeof d.groupPhoto === 'string' && d.groupPhoto.startsWith('http') ? d.groupPhoto : null,
    lastMessage: (d.lastMessage as string) || null,
    lastMessageAt: (d.lastMessageAt as string) || null,
    memberCount: (d.memberCount as number) ?? 0,
    messageCount: (d.messageCount as number) ?? 0,
    createdAt: (d.createdAt as string) || null,
    members: ((d.members as Record<string, unknown>[]) || []).map((m) => ({
      alanyaID: m.alanyaID as number,
      nom: (m.nom as string) || '',
      pseudo: (m.pseudo as string) || '',
      avatarUrl: (m.avatarUrl as string) || null,
      alanyaPhone: (m.alanyaPhone as string) || '',
      isOnline: !!m.isOnline,
      lastSeen: (m.lastSeen as string) || null,
      typeCompte: (m.typeCompte as number) ?? 0,
      joinedAt: (m.joinedAt as string) || null,
    })),
  };
}

export async function deleteGroup(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/groups/${id}`);
}
