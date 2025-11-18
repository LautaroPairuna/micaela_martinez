'use client';

import type { ComponentProps } from 'react';
import { CourseCard } from './CourseCard';
import { useEnrollmentMap } from '@/hooks/useEnrollmentMap';

type CourseMinimal = ComponentProps<typeof CourseCard>['c'];

export function CoursesGridClient({ courses, isLoggedIn }: { courses: CourseMinimal[]; isLoggedIn: boolean }) {
  const enrollmentMap = useEnrollmentMap(isLoggedIn);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {courses.map((course) => (
        <CourseCard key={course.slug} c={course} inscripcion={enrollmentMap.get(course.slug)} />
      ))}
    </div>
  );
}