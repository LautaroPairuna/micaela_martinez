'use client';

import type { ComponentProps } from 'react';
import { CourseCard } from './CourseCard';
import { useEnrollmentMap } from '@/hooks/useEnrollmentMap';

type CourseMinimal = ComponentProps<typeof CourseCard>['c'];

export function CoursesGridClient({ courses, isLoggedIn }: { courses: CourseMinimal[]; isLoggedIn: boolean }) {
  const enrollmentMap = useEnrollmentMap(isLoggedIn);
  
  const isSingle = courses.length === 1;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 
      ${!isSingle ? '[&>*:last-child:nth-child(odd)]:lg:col-span-2 [&>*:last-child:nth-child(odd)]:lg:w-3/4 [&>*:last-child:nth-child(odd)]:lg:mx-auto' : ''}
    `}>
      {courses.map((course) => (
        <div key={course.slug} className={isSingle ? "lg:col-span-2 lg:w-3/4 lg:mx-auto w-full" : "h-full"}>
          <CourseCard c={course} inscripcion={enrollmentMap.get(course.slug)} />
        </div>
      ))}
    </div>
  );
}