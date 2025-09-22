import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  children?: ReactNode;
  stats?: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
  }>;
}

export function PageHeader({
  icon: Icon,
  iconColor = 'text-white',
  iconBg = 'bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]',
  title,
  description,
  children,
  stats
}: PageHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl shadow-lg ${iconBg}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[var(--fg)] tracking-tight">
            {title}
          </h1>
          <p className="text-[var(--muted)] text-lg mt-1">
            {description}
          </p>
        </div>
        {children && (
          <div className="hidden sm:block">
            {children}
          </div>
        )}
      </div>
      
      {/* Stats opcionales */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={index}
                className={`rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${stat.bgColor} ${stat.borderColor}`}
              >
                <div className={`flex items-center gap-2 text-sm font-medium mb-2 ${stat.color}`}>
                  <StatIcon className="h-4 w-4" />
                  <span>{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color.replace('text-', 'text-').replace('-700', '-900').replace('-600', '-800')}`}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}