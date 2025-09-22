import 'server-only';

/* ─────────────────────────────────────────────────────────────────
   GENERACIÓN DE MINIATURAS ON-DEMAND (SERVER-ONLY)
   ───────────────────────────────────────────────────────────────── */

/**
 * Genera miniatura de imagen usando Sharp
 * @param inputPath - Ruta del archivo original
 * @param outputPath - Ruta donde guardar la miniatura
 * @param size - Tamaño de la miniatura (default: 200px)
 * @returns Promise<boolean> - true si se generó exitosamente
 */
export async function generateImageThumbnail(
  inputPath: string,
  outputPath: string,
  size: number = 200
): Promise<boolean> {
  try {
    // Importación dinámica de Sharp
    const sharp = await import('sharp');
    
    // Crear directorio de destino si no existe
    const { mkdir } = await import('fs/promises');
    const path = await import('path');
    await mkdir(path.dirname(outputPath), { recursive: true });
    
    // Generar miniatura
    await sharp.default(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Error generando miniatura de imagen:', error);
    return false;
  }
}

/**
 * Genera miniatura de video usando FFmpeg
 * @param inputPath - Ruta del archivo de video original
 * @param outputPath - Ruta donde guardar la miniatura
 * @param size - Tamaño de la miniatura (default: 200px)
 * @returns Promise<boolean> - true si se generó exitosamente
 */
export async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string,
  size: number = 200
): Promise<boolean> {
  try {
    // Importación dinámica de FFmpeg
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Crear directorio de destino si no existe
    const { mkdir } = await import('fs/promises');
    const path = await import('path');
    await mkdir(path.dirname(outputPath), { recursive: true });
    
    // Comando FFmpeg para generar miniatura
    const command = `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -vf "scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size}" -y "${outputPath}"`;
    
    await execAsync(command);
    return true;
  } catch (error) {
    console.error('Error generando miniatura de video:', error);
    return false;
  }
}

/**
 * Genera miniatura automáticamente según el tipo de archivo
 * @param inputPath - Ruta del archivo original
 * @param outputPath - Ruta donde guardar la miniatura
 * @param size - Tamaño de la miniatura (default: 200px)
 * @returns Promise<boolean> - true si se generó exitosamente
 */
export async function generateThumbnailAuto(
  inputPath: string,
  outputPath: string,
  size: number = 200
): Promise<boolean> {
  const { isImageFile, isVideoFile } = await import('./adminConstants');
  
  if (isImageFile(inputPath)) {
    return generateImageThumbnail(inputPath, outputPath, size);
  } else if (isVideoFile(inputPath)) {
    return generateVideoThumbnail(inputPath, outputPath, size);
  }
  
  return false;
}