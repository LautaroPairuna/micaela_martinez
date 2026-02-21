'use client';

import React from 'react';
import { Lesson } from '@/types/course';
import { LessonContent } from './LessonContent';
import { cn } from '@/lib/utils';

type ContentPlayerProps = {
  lesson: Lesson;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onComplete?: () => void;
  onNext?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
};

export function ContentPlayer({ 
  lesson, 
  isCompleted, 
  onToggleComplete, 
  onComplete, 
  onNext,
  className 
}: ContentPlayerProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <LessonContent 
        lesson={lesson}
        isCompleted={isCompleted}
        onToggleComplete={onToggleComplete}
        onComplete={onComplete}
        onNext={onNext}
      />
    </div>
  );
}
