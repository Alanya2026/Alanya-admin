import { MediaItem } from '@/types';
import { mockMediaItems } from '@/mock/medias';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchMediaItems(): Promise<MediaItem[]> {
  if (USE_MOCK) return mockMediaItems;
  const res = await api.get('/admin/media');
  return res.data;
}

export async function deleteMedia(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/media/${id}`);
}
