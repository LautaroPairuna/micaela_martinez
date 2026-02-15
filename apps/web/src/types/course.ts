// src/types/course.ts
export type LessonType = 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';

export type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion?: string;
};

export type LessonContent =
  | {
      // Legacy
      texto?: string;
      documento?: { url: string; nombre: string; tipo: string };
      quiz?: QuizQuestion;
      preguntas?: QuizQuestion[];
      // Unificado
      tipo?: 'QUIZ' | 'TEXTO' | 'DOCUMENTO';
      data?: {
        preguntas?: QuizQuestion[];
        configuracion?: {
          mostrarResultados?: boolean;
          permitirReintentos?: boolean;
          puntuacionMinima?: number;
        };
        contenido?: string;          // TEXTO
        url?: string;                // DOCUMENTO
        nombre?: string;
        tipoArchivo?: string;
      };
    }
  | string
  | null
  | undefined;

export interface Lesson {
  id: string;
  titulo: string;
  descripcion?: string | null;
  rutaSrc?: string | null;
  duracion?: number | null; // en minutos
  orden: number;
  tipo?: LessonType;
  contenido?: LessonContent;
}

export interface Module {
  id: string;
  titulo: string;
  orden: number;
  lecciones?: Lesson[] | null;
}

export interface Course {
  id: string;
  slug: string;
  titulo: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  modulos?: Module[] | null;
}

/** Progreso detallado opcional para una inscripción */
export type DetailedProgress = {
  /** porcentaje 0..100 (si el backend lo guarda así) */
  percentage?: number;
  /** mapa lección-completada */
  lessons?: Record<string, boolean>;
  /** timestamps útiles */
  startedAt?: string | Date;
  updatedAt?: string | Date;
  completedAt?: string | Date | null;
  /** información adicional no tipada del backend */
  meta?: Record<string, unknown>;
};

/** El progreso puede ser un número simple (porcentaje) o un objeto detallado */
export type EnrollmentProgress = number | DetailedProgress;

export interface Enrollment {
  id: string;
  progreso: EnrollmentProgress;
  completado: boolean;
  ultimaLeccionId?: string | null;
}
