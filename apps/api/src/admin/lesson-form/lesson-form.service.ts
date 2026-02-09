import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TipoLeccion } from '../../generated/prisma/client';

type LessonFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'url'
  | 'richtext'
  | 'quiz';

type LessonFieldSchema = {
  key: string;
  label: string;
  type: LessonFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
};

type LessonFormSchema = {
  version: number;
  title?: string;
  fields: LessonFieldSchema[];
};

const FIELD_TYPES: LessonFieldType[] = [
  'text',
  'textarea',
  'number',
  'boolean',
  'select',
  'json',
  'url',
  'richtext',
  'quiz',
];

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function getErrorStack(e: unknown): string | undefined {
  return e instanceof Error ? e.stack : undefined;
}

@Injectable()
export class LessonFormService {
  private readonly logger = new Logger(LessonFormService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza input a TipoLeccion (acepta: "video"|"VIDEO"|"Video", etc.)
   * Devuelve la KEY del enum para compatibilidad con el engine de Prisma.
   */
  private assertTipo(raw: string): TipoLeccion {
    const input = String(raw ?? '').trim();
    const upper = input.toUpperCase();

    // 1) Si ya es una key válida (ej: "VIDEO")
    if (Object.prototype.hasOwnProperty.call(TipoLeccion, upper)) {
      return upper as unknown as TipoLeccion;
    }

    // 2) Si es un value mapeado (ej: "video"), buscamos su key
    for (const [key, val] of Object.entries(TipoLeccion)) {
      if (String(val).toLowerCase() === input.toLowerCase()) {
        return key as unknown as TipoLeccion;
      }
    }

    throw new BadRequestException(
      `TipoLeccion inválido: ${raw}. Valores permitidos: video, documento, quiz, texto`,
    );
  }

  private validateSchema(schema: unknown): LessonFormSchema {
    if (!schema || typeof schema !== 'object') {
      throw new BadRequestException('schema inválido');
    }
    const s = schema as LessonFormSchema;

    if (!Array.isArray(s.fields)) {
      throw new BadRequestException('schema.fields debe ser un array');
    }

    const keys = new Set<string>();
    for (const f of s.fields) {
      if (!f || typeof f !== 'object') {
        throw new BadRequestException('field inválido');
      }
      if (!f.key || typeof f.key !== 'string') {
        throw new BadRequestException('field.key inválido');
      }
      if (!f.label || typeof f.label !== 'string') {
        throw new BadRequestException('field.label inválido');
      }
      if (!f.type || !FIELD_TYPES.includes(f.type)) {
        throw new BadRequestException(
          `field.type inválido: ${String((f as any).type)}`,
        );
      }
      if (keys.has(f.key)) {
        throw new BadRequestException(`field.key duplicado: ${f.key}`);
      }
      keys.add(f.key);

      if (f.type === 'select') {
        if (!Array.isArray(f.options) || f.options.length === 0) {
          throw new BadRequestException(
            `field.options requerido para select: ${f.key}`,
          );
        }
        for (const opt of f.options) {
          if (!opt || typeof opt !== 'object') {
            throw new BadRequestException(`option inválida en ${f.key}`);
          }
          if (
            typeof (opt as any).label !== 'string' ||
            typeof (opt as any).value !== 'string'
          ) {
            throw new BadRequestException(
              `option.label/value inválidos en ${f.key}`,
            );
          }
        }
      }
    }

    const version =
      typeof s.version === 'number' && s.version > 0 ? s.version : 1;
    return { ...s, version };
  }

  private defaultSchema(tipo: TipoLeccion): LessonFormSchema {
    if (tipo === TipoLeccion.VIDEO) {
      return {
        version: 1,
        title: 'Video',
        fields: [
          { key: 'url', label: 'URL del video', type: 'url', required: true },
          {
            key: 'duracionMin',
            label: 'Duración (min)',
            type: 'number',
            min: 0,
          },
          { key: 'posterUrl', label: 'Poster', type: 'url' },
          { key: 'resumen', label: 'Resumen', type: 'textarea' },
        ],
      };
    }

    if (tipo === TipoLeccion.DOCUMENTO) {
      return {
        version: 1,
        title: 'Documento',
        fields: [
          { key: 'tituloDoc', label: 'Título del documento', type: 'text' },
          { key: 'url', label: 'URL del documento', type: 'url' },
          { key: 'resumen', label: 'Resumen', type: 'textarea' },
        ],
      };
    }

    if (tipo === TipoLeccion.QUIZ) {
      return {
        version: 1,
        title: 'Quiz',
        fields: [
          { key: 'intro', label: 'Introducción', type: 'textarea' },
          { key: 'preguntas', label: 'Preguntas', type: 'quiz' },
          {
            key: 'modo',
            label: 'Modo',
            type: 'select',
            options: [
              { label: 'Evaluación', value: 'evaluacion' },
              { label: 'Práctica', value: 'practica' },
            ],
          },
        ],
      };
    }

    return {
      version: 1,
      title: 'Texto',
      fields: [
        {
          key: 'contenido',
          label: 'Contenido',
          type: 'richtext',
          required: true,
        },
      ],
    };
  }

  async getByTipo(rawTipo: string) {
    try {
      const tipo = this.assertTipo(rawTipo);
      this.logger.log(`Obteniendo config para tipo: ${tipo}`);

      // Si tipo es unique, podés cambiar a findUnique (recomendado)
      const config = await this.prisma.leccionTipoConfig.findFirst({
        where: { tipo },
      });

      if (!config) {
        this.logger.warn(`No se encontró config para ${tipo}, usando default`);
        return {
          tipo,
          schema: this.defaultSchema(tipo),
          ui: { layout: '1col' },
          version: 1,
        };
      }

      let validatedSchema: LessonFormSchema;
      try {
        validatedSchema = this.validateSchema(config.schema);
      } catch (e: unknown) {
        this.logger.error(
          `Error validando schema para ${tipo} en DB: ${getErrorMessage(e)}. Usando default.`,
        );
        validatedSchema = this.defaultSchema(tipo);
      }

      return {
        id: config.id,
        tipo: config.tipo,
        schema: validatedSchema,
        ui: config.ui ?? { layout: '1col' },
        version: config.version,
      };
    } catch (e: unknown) {
      this.logger.error(
        `Error crítico en getByTipo(${rawTipo}): ${getErrorMessage(e)}`,
        getErrorStack(e),
      );
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException(
        `Error al obtener configuración de lección: ${getErrorMessage(e)}`,
      );
    }
  }

  async upsert(
    rawTipo: string,
    schema: unknown,
    ui?: unknown,
    version?: number,
  ) {
    const tipo = this.assertTipo(rawTipo);
    const parsed = this.validateSchema(schema);

    const safeSchema = parsed as unknown as Prisma.InputJsonValue;
    const safeUi =
      ui && typeof ui === 'object' ? (ui as Prisma.InputJsonValue) : undefined;

    const safeVersion =
      typeof version === 'number' && version > 0 ? version : parsed.version;

    return this.prisma.leccionTipoConfig.upsert({
      where: { tipo },
      update: { schema: safeSchema, ui: safeUi, version: safeVersion },
      create: { tipo, schema: safeSchema, ui: safeUi, version: safeVersion },
    });
  }
}
