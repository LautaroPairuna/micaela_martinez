/**
 * Cliente de subida para /api/admin/uploads (proxy a Nest).
 * Envía FormData con:
 *  - file: Blob
 *  - table: string (p.ej. 'Producto' | 'Curso' | ...)
 *  - field: string (p.ej. 'imagen', 'rutaSrc', etc)
 *  - recordId?: string
 *  - title?: string
 *  - alt?: string
 *  - intent?: 'attach' | 'replace' (opcional, por si tu back borra la anterior)
 */

export type UploadResponse = {
  ok: boolean;
  data?: {
    storedAs: string;        // nombre final en disco (ej: video-20240917-xxxx.mp4)
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  };
  urls?: {
    // Solo si tu back las devuelve; si no, ignora
    original?: string;       // p.ej. /uploads/producto/archivo.jpg
    thumb?: string;          // si generas thumbs
  };
  error?: string;
};

export async function uploadFile(
  file: File,
  opts: {
    table: string;
    field: string;
    recordId?: string;
    title?: string;
    alt?: string;
    intent?: 'attach' | 'replace';
  }
): Promise<UploadResponse> {
  const form = new FormData();
  form.set('file', file);
  form.set('table', opts.table);
  form.set('field', opts.field);
  if (opts.recordId) form.set('recordId', opts.recordId);
  if (opts.title)    form.set('title', opts.title);
  if (opts.alt)      form.set('alt', opts.alt);
  if (opts.intent)   form.set('intent', opts.intent);

  // Importante: credentials si tu JWT va por cookie
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    // leer el texto para ver mensajes del backend
    const msg = await res.text();
    throw new Error(msg || 'Upload failed');
  }

  // Tu back responde JSON con { ok, data, urls? }
  return res.json();
}
