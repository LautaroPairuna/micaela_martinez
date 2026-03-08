'use client';

import { Lesson } from '@/types/course';
import { LessonContent } from './LessonContent';
import { cn } from '@/lib/utils';

type ContentPlayerProps = {
  lesson: Lesson;
  enrollmentId?: string | number;
  moduleId?: string | number;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onComplete?: () => void;
  onNext?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
};

export function ContentPlayer({
  lesson,
  enrollmentId,
  moduleId,
  isCompleted,
  onToggleComplete,
  onComplete,
  onNext,
  className,
}: ContentPlayerProps) {
  return (
    <div className={cn('h-full min-h-0 w-full overflow-hidden', className)}>
      <LessonContent
        lesson={lesson}
        enrollmentId={enrollmentId}
        moduleId={moduleId}
        isCompleted={isCompleted}
        onToggleComplete={onToggleComplete}
        onComplete={onComplete}
        onNext={onNext}
      />
    </div>
  );
}
