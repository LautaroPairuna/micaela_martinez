// apps/web/src/lib/admin/upload-image.ts

export type UploadImageResponse = {
  url: string;
  originalName: string;
};

/**
 * Sube una imagen para un campo específico del admin,
 * usando el endpoint:
 *   POST /api/admin/resources/:resource/:id/upload/:field
 *
 * El backend:
 *  - guarda el archivo en public/uploads/<tabla>/<archivo>.webp
 *  - actualiza el registro en BD
 *  - devuelve { item, imageUrl, originalName }
 */
export async function uploadAdminImage(params: {
  resource: string;      // ej: 'producto'
  id: number | string;   // ej: 1
  field: string;         // ej: 'imagenPrincipal'
  file: File;
}): Promise<UploadImageResponse> {
  const { resource, id, field, file } = params;

  const form = new FormData();
  form.append('file', file);

  // Ruta relative para que Next la reescriba al backend mediante rewrites
  const res = await fetch(
    `/api/admin/resources/${resource}/${id}/upload/${field}`,
    {
      method: 'POST',
      body: form,
    },
  );

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  const json = await res.json();

  return {
    url: json.imageUrl as string,
    originalName: json.originalName as string,
  };
}
