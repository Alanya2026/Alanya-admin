import { Meeting } from '@/types';
import { mockMeetings } from '@/mock/meetings';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

// Note : api.ts transforme déjà les clés snake_case → camelCase, on lit donc
// directement organiserNom / startTime / typeMedia / createdAt.

export async function fetchMeetings(): Promise<Meeting[]> {
  if (USE_MOCK) return mockMeetings;
  const res = await api.get('/admin/meetings');
  return (res.data || []).map((m: Record<string, unknown>) => ({
    idMeeting: m.idMeeting as number,
    idOrganiser: m.idOrganiser as number,
    organiserNom: (m.organiserNom as string) || '',
    organiserPseudo: (m.organiserPseudo as string) || '',
    organiserAvatar: (m.organiserAvatar as string) || '',
    objet: (m.objet as string) || '',
    room: (m.room as string) || '',
    startTime: m.startTime as string,
    duree: (m.duree as number) || 0,
    isEnd: (m.isEnd as number) ?? 0,
    typeMedia: (m.typeMedia as number) ?? 0,
    participants: (m.participants as number) || 0,
    createdAt: m.createdAt as string,
  }));
}

export async function endMeeting(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.post(`/admin/meetings/${id}/end`);
}

export async function deleteMeeting(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/meetings/${id}`);
}
