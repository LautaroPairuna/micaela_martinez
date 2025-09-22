import * as fs from 'fs/promises';
import path from 'node:path';

/**
 * Asegura que un directorio exista, creándolo si es necesario
 * @param dir Ruta del directorio a crear
 * @returns Promise que resuelve a la ruta del directorio creado
 */
export async function ensureDir(dir: string): Promise<string> {
  try {
    await fs.mkdir(dir, { recursive: true });
    return dir;
  } catch (error: unknown) {
    console.error(`Error al crear directorio ${dir}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo crear el directorio: ${errorMessage}`);
  }
}

/**
 * Valida que una ruta esté dentro de un directorio base para evitar directory traversal
 * @param basePath Directorio base permitido
 * @param targetPath Ruta a validar
 * @returns Ruta normalizada si es válida
 * @throws Error si la ruta intenta salir del directorio base
 */
export function validatePath(basePath: string, targetPath: string): string {
  const normalizedPath = path.normalize(path.join(basePath, targetPath));

  if (!normalizedPath.startsWith(basePath)) {
    throw new Error('Intento de acceso a directorio no permitido');
  }

  return normalizedPath;
}

/**
 * Genera un nombre de archivo único basado en slug, timestamp y valor aleatorio
 * @param slug Base para el nombre del archivo
 * @param extension Extensión del archivo (con punto)
 * @returns Nombre de archivo único
 */
export function generateUniqueFilename(
  slug: string,
  extension: string,
): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${slug}-${timestamp}-${random}${extension}`;
}

/**
 * Escribe un archivo de forma segura usando escritura atómica
 * @param targetPath Ruta final del archivo
 * @param buffer Contenido del archivo
 */
export async function writeFileSafe(
  targetPath: string,
  buffer: Buffer,
): Promise<void> {
  const tempPath = `${targetPath}.tmp`;

  try {
    // Escribir a archivo temporal
    await fs.writeFile(tempPath, buffer);

    // Mover a ubicación final (operación atómica)
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    // Limpiar archivo temporal en caso de error
    try {
      await fs.unlink(tempPath);
    } catch (unlinkError) {
      // Ignorar errores al eliminar archivo temporal
    }

    throw error;
  }
}
