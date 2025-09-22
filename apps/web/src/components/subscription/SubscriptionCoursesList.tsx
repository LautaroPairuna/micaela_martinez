import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { BookOpen } from 'lucide-react';

interface SubscriptionCoursesListProps {
  courses: {
    id: string;
    title: string;
    slug: string;
    image?: string;
  }[];
  className?: string;
}

export function SubscriptionCoursesList({ courses, className = '' }: SubscriptionCoursesListProps) {
  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-[var(--gold)]">
        <BookOpen className="h-5 w-5" />
        <h3 className="font-semibold">Cursos incluidos en tu suscripción</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <Link key={course.id} href={`/cursos/${course.slug}`}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
              <CardBody className="p-4 flex flex-col gap-3">
                {course.image && (
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <SafeImage
                      src={course.image}
                      alt={course.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <h4 className="font-medium line-clamp-2">{course.title}</h4>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}