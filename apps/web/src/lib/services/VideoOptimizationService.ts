import 'server-only';
import { spawn } from 'child_process';

export interface VideoOptimizationOptions {
  quality: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
  targetBitrate?: string;
  audioQuality?: number;
}

const DEFAULT_VIDEO_OPTIONS: Record<string, VideoOptimizationOptions> = {
  high: {
    quality: 'high',
    maxWidth: 1920,
    maxHeight: 1080,
    targetBitrate: '2M',
    audioQuality: 128,
  },
  medium: {
    quality: 'medium',
    maxWidth: 1280,
    maxHeight: 720,
    targetBitrate: '1M',
    audioQuality: 96,
  },
  low: {
    quality: 'low',
    maxWidth: 854,
    maxHeight: 480,
    targetBitrate: '500k',
    audioQuality: 64,
  },
};

export interface FFprobeFormat {
  filename?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  [k: string]: unknown;
}

export interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  [k: string]: unknown;
}

export interface FFprobeInfo {
  format?: FFprobeFormat;
  streams?: FFprobeStream[];
  [k: string]: unknown;
}

export class VideoOptimizationService {
  private static instance: VideoOptimizationService;

  static getInstance(): VideoOptimizationService {
    if (!VideoOptimizationService.instance) {
      VideoOptimizationService.instance = new VideoOptimizationService();
    }
    return VideoOptimizationService.instance;
  }

  /**
   * Optimiza un video usando FFmpeg
   */
  async optimizeVideo(
    inputPath: string,
    outputPath: string,
    options: VideoOptimizationOptions = DEFAULT_VIDEO_OPTIONS.medium
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.buildFFmpegArgs(inputPath, outputPath, options);

      console.log('🎬 Optimizando video:', { inputPath, outputPath, options });

      const ffmpeg = spawn('ffmpeg', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Video optimizado exitosamente');
          resolve();
        } else {
          console.error('❌ Error optimizando video:', stderr);
          reject(new Error(`FFmpeg falló con código ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('❌ Error ejecutando FFmpeg:', error);
        reject(error);
      });
    });
  }

  /**
   * Construye los argumentos para FFmpeg
   */
  private buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    options: VideoOptimizationOptions
  ): string[] {
    const args = [
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      this.getCRF(options.quality),
      '-c:a',
      'aac',
      '-b:a',
      `${options.audioQuality}k`,
      '-movflags',
      '+faststart',
      '-y', // Sobrescribir archivo de salida
    ];

    // Agregar filtros de video si es necesario
    const videoFilters: string[] = [];

    if (options.maxWidth && options.maxHeight) {
      videoFilters.push(
        `scale='min(${options.maxWidth},iw)':'min(${options.maxHeight},ih)':force_original_aspect_ratio=decrease`
      );
    }

    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','));
    }

    // Agregar bitrate si está especificado
    if (options.targetBitrate) {
      args.push('-b:v', options.targetBitrate);
    }

    args.push(outputPath);

    return args;
  }

  /**
   * Obtiene el valor CRF según la calidad
   */
  private getCRF(quality: VideoOptimizationOptions['quality']): string {
    switch (quality) {
      case 'high':
        return '18';
      case 'medium':
        return '23';
      case 'low':
        return '28';
      default:
        return '23';
    }
  }

  /**
   * Verifica si FFmpeg está disponible
   */
  async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Obtiene información de un video
   */
  async getVideoInfo(videoPath: string): Promise<FFprobeInfo> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(
        'ffprobe',
        ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', videoPath],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout) as FFprobeInfo;
            resolve(info);
          } catch (error) {
            reject(new Error(`Error parseando información del video: ${String(error)}`));
          }
        } else {
          reject(new Error(`FFprobe falló con código ${code}: ${stderr}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(error);
      });
    });
  }
}

export const videoOptimizationService = VideoOptimizationService.getInstance();
export { DEFAULT_VIDEO_OPTIONS };
