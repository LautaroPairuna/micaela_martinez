export type LessonType = 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';

export type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion?: string;
};

export type DocumentLessonData = {
  url?: string;
  nombre?: string;
  tipo?: string;
  tipoArchivo?: string;
};

export type QuizLessonConfig = {
  mostrarResultados?: boolean;
  permitirReintentos?: boolean;
  puntuacionMinima?: number;
};

export type LessonContentObject = {
  // ───── Legacy ─────
  texto?: string;
  documento?: DocumentLessonData;
  quiz?: QuizQuestion;
  preguntas?: QuizQuestion[];

  // ───── Nuevo formato plano ─────
  tipo?: 'QUIZ' | 'TEXTO' | 'DOCUMENTO';
  body?: string;
  html?: string;
  content?: string;
  markdown?: string;
  text?: string;
  contenido?: string;

  url?: string;
  nombre?: string;
  tipoArchivo?: string;
  intro?: string;

  configuracion?: QuizLessonConfig;

  // ───── Formato unificado/anidado ─────
  data?: {
    preguntas?: QuizQuestion[];
    configuracion?: QuizLessonConfig;

    // TEXTO
    body?: string;
    html?: string;
    content?: string;
    markdown?: string;
    text?: string;
    contenido?: string;

    // DOCUMENTO
    url?: string;
    nombre?: string;
    tipoArchivo?: string;

    // QUIZ
    intro?: string;
  };

  // bloques opcionales por compatibilidad futura
  blocks?: Array<{
    text?: string;
    [key: string]: unknown;
  }>;

  [key: string]: unknown;
};

export type LessonContent = LessonContentObject | string | null | undefined;

export interface Lesson {
  id: string;
  titulo: string;
  descripcion?: string | null;
  rutaSrc?: string | null;
  previewUrl?: string | null;
  duracion?: number | null; // en minutos
  orden: number;
  tipo: LessonType;
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
  certificado?: {
    existe: boolean;
    url?: string;
    uuid?: string;
  };
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