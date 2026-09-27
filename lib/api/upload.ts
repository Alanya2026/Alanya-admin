import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function uploadMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; filename: string; originalName: string; mimetype: string; size: number }> {
  if (USE_MOCK) {
    // Simulate upload with fake progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 50));
      onProgress?.(i);
    }
    const ext = file.name.split(".").pop() || "bin";
    const filename = `mock_${Date.now()}.${ext}`;
    return {
      url: URL.createObjectURL(file),
      filename,
      originalName: file.name,
      mimetype: file.type,
      size: file.size,
    };
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/upload/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
  return res.data;
}
