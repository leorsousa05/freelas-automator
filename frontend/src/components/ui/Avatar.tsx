interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        className={`rounded-full object-cover bg-slate-100 dark:bg-slate-700 ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  )
}
