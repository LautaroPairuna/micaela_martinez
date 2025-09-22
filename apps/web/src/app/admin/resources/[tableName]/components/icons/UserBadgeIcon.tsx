export function UserBadgeIcon({
  className = 'h-8 w-8 text-indigo-600 dark:text-indigo-400',
  title = 'Usuario',
}: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* halo suave */}
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity=".08" />
      {/* contorno */}
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" opacity=".35" />
      {/* cabeza */}
      <circle cx="24" cy="18" r="7" fill="currentColor" opacity=".28" />
      {/* hombros */}
      <path
        d="M12 35c0-6 6.5-9 12-9s12 3 12 9"
        fill="currentColor"
        opacity=".18"
      />
      <path
        d="M12 35c0-6 6.5-9 12-9s12 3 12 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".35"
      />
    </svg>
  )
}
