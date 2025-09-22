'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Play, FileText, BookOpen, HelpCircle, CheckCircle, X, Clock, CheckCircle2 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/Button';


type Course = {
  id: string;
  titulo: string;
  modulos?: Module[] | null;
};

type Module = {
  id: string;
  titulo: string;
  orden: number;
  lecciones?: Lesson[] | null;
};

type Lesson = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  duracionS?: number | null;
  orden: number;
  tipo?: 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';
};

type CourseModuleSidebarProps = {
  course: Course;
  currentLesson: Lesson;
  currentModule: Module;
  lessonProgress: Record<string, boolean>;
  onLessonSelect: (lessonId: string, moduleId: string) => void;
  onToggleLessonComplete?: (lessonId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  getLessonProgressKey: (moduleId: string, lessonId: string) => string;
  actualVideoDuration?: number | null;
  getLessonDuration?: (lesson: Lesson) => number | null | undefined;
};



function getLessonIcon(tipo?: string, isCompleted: boolean = false) {
  if (isCompleted) {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  
  switch (tipo) {
    case 'VIDEO':
      return <Play className="h-4 w-4 text-[var(--muted)]" />;
    case 'TEXTO':
      return <FileText className="h-4 w-4 text-[var(--muted)]" />;
    case 'DOCUMENTO':
      return <BookOpen className="h-4 w-4 text-[var(--muted)]" />;
    case 'QUIZ':
      return <HelpCircle className="h-4 w-4 text-[var(--muted)]" />;
    default:
      return <FileText className="h-4 w-4 text-[var(--muted)]" />;
  }
}

export function CourseModuleSidebar({
  course,
  currentLesson,
  currentModule,
  lessonProgress,
  onLessonSelect,
  onToggleLessonComplete,
  isOpen,
  onClose,
  getLessonProgressKey,
  actualVideoDuration,
  getLessonDuration
}: CourseModuleSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set([currentModule.id])
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const navigateToModule = (module: Module) => {
    // Solo expandir/colapsar el módulo, sin navegar automáticamente
    toggleModule(module.id);
  };

  const expandAllModules = () => {
    const allModuleIds = course.modulos?.map(m => m.id) || [];
    setExpandedModules(new Set(allModuleIds));
  };

  const collapseAllModules = () => {
    setExpandedModules(new Set([currentModule.id]));
  };

  const getModuleProgress = (module: Module) => {
    if (!module.lecciones?.length) return 0;
    
    const completedLessons = module.lecciones.filter(lesson => 
      lessonProgress[getLessonProgressKey(module.id, lesson.id)]
    ).length;
    
    return Math.round((completedLessons / module.lecciones.length) * 100);
  };

  const getTotalModuleDuration = (module: Module) => {
    if (!module.lecciones?.length) return 0;
    
    return module.lecciones.reduce((total, lesson) => 
      total + (lesson.duracionS || 0), 0
    );
  };

  if (!course.modulos?.length) {
    return null;
  }

  return (
    <>
      {/* Overlay móvil optimizado */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-all duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar container con posicionamiento corregido */}
      <div className={cn(
        "bg-gradient-to-b from-[var(--bg)] to-[var(--bg-secondary)] border-r border-[var(--border)] shadow-xl transition-all duration-200 ease-in-out",
        "lg:relative lg:flex lg:flex-col",
        isOpen ? "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm sm:w-80" : "hidden lg:flex",
        isOpen && "lg:relative lg:inset-auto lg:z-auto lg:w-80 xl:w-96"
      )}>
        <div className="flex flex-col h-full">
          {/* Header del sidebar mejorado */}
          <div className="p-3 sm:p-4 lg:p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--bg)] to-[var(--bg-hover)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-[var(--fg)] mb-1">
                  Contenido
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)]">
                  {course.modulos?.length || 0} módulos
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden p-1.5 sm:p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-all duration-200"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
            
            {/* Controles de expansión */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAllModules}
                className="text-xs px-2 py-1 h-auto text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)]"
              >
                Expandir todo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAllModules}
                className="text-xs px-2 py-1 h-auto text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)]"
              >
                Colapsar todo
              </Button>
            </div>
          </div>

          {/* Lista de módulos optimizada para móvil */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
            <div className="p-2 sm:p-4 lg:p-6 pb-6 sm:pb-8 lg:pb-10 space-y-3 sm:space-y-4">
            {course.modulos.map((module, moduleIndex) => {
              const isExpanded = expandedModules.has(module.id);
              const moduleProgress = getModuleProgress(module);
              const totalDuration = getTotalModuleDuration(module);
              // Solo marcar como activo si estamos viendo una lección de este módulo
              const isCurrentModule = module.id === currentModule.id && 
                module.lecciones?.some(lesson => lesson.id === currentLesson.id);
              
              return (
                <div key={module.id} className="border-b border-[var(--border)]">
                  {/* Header del módulo */}
                   <div className="relative group">
                     <div className={cn(
                       "p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:shadow-xl backdrop-blur-sm",
                       isCurrentModule
                         ? "bg-gradient-to-br from-[var(--gold)]/15 via-[var(--gold)]/8 to-transparent border-[var(--gold)]/40 shadow-lg ring-1 ring-[var(--gold)]/20"
                         : "bg-gradient-to-br from-[var(--bg)] to-[var(--bg-subtle)] border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-gradient-to-br hover:from-[var(--bg-hover)] hover:to-[var(--bg-subtle)] hover:shadow-lg"
                     )}>
                       <div className="flex items-center justify-between">
                         <button
                            onClick={() => navigateToModule(module)}
                            className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                            title="Click para ir al módulo"
                          >
                            <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 mb-1 sm:mb-2">
                            <span className={cn(
                              "inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-bold border",
                              isCurrentModule
                                ? "bg-[var(--gold)] text-black border-[var(--gold)]"
                                : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border)]"
                            )}>
                              {moduleIndex + 1}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] font-medium hidden sm:inline">
                              MÓDULO
                            </span>
                          </div>
                          <h3 className={cn(
                            "font-bold text-sm sm:text-base leading-tight mb-1 sm:mb-2",
                            isCurrentModule ? "text-[var(--text)]" : "text-[var(--text)] group-hover:text-[var(--text)]"
                          )}>
                            {module.titulo}
                          </h3>
                          
                          <div className="flex items-center gap-2 sm:gap-4 text-xs text-[var(--text-muted)] mb-2">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="hidden sm:inline">{module.lecciones?.length || 0} lecciones</span>
                              <span className="sm:hidden">{module.lecciones?.length || 0}</span>
                            </div>
                            {totalDuration > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(totalDuration)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Barra de progreso del módulo mejorada con indicador de completado */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-[var(--bg-subtle)] rounded-full h-2 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-500 ease-out",
                                  moduleProgress === 100 ? "bg-gradient-to-r from-green-500 to-green-600" :
                                  moduleProgress >= 90 ? "bg-gradient-to-r from-orange-500 to-orange-600" :
                                  moduleProgress > 0 ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)]" : "bg-transparent"
                                )}
                                style={{ width: `${moduleProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              {moduleProgress >= 90 && (
                                <CheckCircle2 className={cn(
                                  "h-3 w-3",
                                  moduleProgress === 100 ? "text-green-500" : "text-orange-500"
                                )} />
                              )}
                              <span className={cn(
                                "text-xs font-medium min-w-[45px] text-right",
                                moduleProgress === 100 ? "text-green-500" :
                                moduleProgress >= 90 ? "text-orange-500" : "text-[var(--muted)]"
                              )}>
                                {moduleProgress}%
                              </span>
                            </div>
                          </div>
                            </div>
                          </button>
                          
                          {/* Botón separado para expandir/colapsar */}
                          <button
                            onClick={() => toggleModule(module.id)}
                            className={cn(
                              "p-2 rounded-lg transition-all duration-200 border hover:shadow-sm",
                              isExpanded
                                ? "bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/20"
                                : "bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                            )}
                            aria-expanded={isExpanded}
                            aria-controls={`module-${module.id}-content`}
                            title={isExpanded ? "Colapsar módulo" : "Expandir módulo"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  {/* Lista de lecciones optimizada para móvil */}
                  {isExpanded && module.lecciones && (
                    <div className="bg-[var(--bg-subtle)] border-l-4 border-l-[var(--border)] animate-in slide-in-from-top-2 duration-300 ease-out">
                      {module.lecciones.map((lesson, lessonIndex) => {
                        // Separar lógica visual de funcional
                        const isCurrentLessonInCurrentModule = lesson.id === currentLesson.id && module.id === currentModule.id;
                        const isCompleted = lessonProgress[getLessonProgressKey(module.id, lesson.id)];
                        
                        // Para efectos visuales, solo mostrar activo si está en el módulo correcto
                        const isCurrentLesson = isCurrentLessonInCurrentModule;
                        

                        
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => onLessonSelect(lesson.id, module.id)}
                            className={cn(
                              "w-full text-left p-3 sm:p-4 lg:p-5 rounded-xl transition-all duration-300 group relative border border-transparent backdrop-blur-sm",
                              isCurrentLesson
                                ? "bg-gradient-to-br from-[var(--gold)]/25 via-[var(--gold)]/15 to-transparent border-[var(--gold)]/50 shadow-lg ring-1 ring-[var(--gold)]/30 transform scale-[1.02]"
                                : "hover:bg-gradient-to-br hover:from-[var(--bg-hover)] hover:via-[var(--bg-subtle)] hover:to-transparent hover:shadow-md hover:border-[var(--border-hover)] hover:transform hover:scale-[1.01]"
                            )}
                          >
                            {/* Indicador de lección actual */}
                            {isCurrentLesson && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold)]" />
                            )}
                            
                            <div className="flex items-center gap-2 sm:gap-4">
                              {/* Icono de estado mejorado con check compacto */}
                              <div className={cn(
                                "p-1.5 sm:p-2 rounded-lg transition-all duration-300 ease-out flex-shrink-0 relative transform group-hover:scale-110",
                                isCompleted 
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shadow-sm"
                                  : isCurrentLesson
                                    ? "bg-[var(--gold)]/20 text-[var(--gold)] shadow-md scale-110"
                                    : "bg-[var(--bg)] text-[var(--muted)] group-hover:bg-[var(--bg-hover)] group-hover:shadow-sm"
                              )}>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                ) : (
                                  getLessonIcon(lesson.tipo, false)
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                  <span className={cn(
                                    "text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full",
                                    isCurrentLesson 
                                      ? "bg-[var(--gold)] text-black"
                                      : "bg-[var(--bg)] text-[var(--muted)] group-hover:bg-[var(--bg-hover)]"
                                  )}>
                                    {moduleIndex + 1}.{lessonIndex + 1}
                                  </span>
                                  
                                  {/* Badge de tipo de lección compacto */}
                                  {lesson.tipo && (
                                    <span className={cn(
                                      "text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium hidden sm:inline",
                                      lesson.tipo === 'VIDEO' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                      lesson.tipo === 'TEXTO' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                      lesson.tipo === 'QUIZ' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    )}>
                                      {lesson.tipo.toLowerCase()}
                                    </span>
                                  )}
                                  
                                  {/* Badge de completado compacto */}
                                  {isCompleted && (
                                    <span className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                                      <span className="sm:hidden">✓</span>
                                      <span className="hidden sm:inline">✓ Completado</span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <h4 className={cn(
                                    "text-xs sm:text-sm font-medium truncate leading-tight flex-1",
                                    isCurrentLesson ? "text-[var(--gold)]" : "text-[var(--fg)]",
                                    isCompleted && !isCurrentLesson && "text-[var(--muted)]"
                                  )}>
                                    {lesson.titulo}
                                  </h4>
                                  
                                  {/* Checkbox de completado */}
                                  {onToggleLessonComplete && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleLessonComplete(lesson.id);
                                      }}
                                      className={cn(
                                        "p-1 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0 cursor-pointer",
                                        isCompleted
                                          ? "text-green-500 hover:text-green-600"
                                          : "text-[var(--muted)] hover:text-[var(--fg)]"
                                      )}
                                      title={isCompleted ? "Marcar como no completado" : "Marcar como completado"}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <div className="h-4 w-4 border-2 border-current rounded-full" />
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Duración compacta */}
                                {(() => {
                                  const isCurrentLesson = lesson.id === currentLesson.id;
                                  let displayDuration: number | null = null;
                                  
                                  if (getLessonDuration) {
                                    // Usar función helper que maneja el cache de duraciones
                                    const duration = getLessonDuration(lesson);
                                    displayDuration = duration ?? null;
                                  } else {
                                    // Fallback al comportamiento anterior
                                    displayDuration = isCurrentLesson && actualVideoDuration ? actualVideoDuration : (lesson.duracionS ?? null);
                                  }
                                  
                                  return displayDuration !== null && displayDuration > 0 ? (
                                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-xs text-[var(--muted)]">
                                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      <span>{formatDuration(displayDuration)}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}