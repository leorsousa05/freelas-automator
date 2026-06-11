interface CardProps {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  isHoverable?: boolean
  onClick?: () => void
  className?: string
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({
  children,
  padding = 'md',
  isHoverable,
  onClick,
  className = '',
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card dark:shadow-none ${paddingClasses[padding]} ${
        isHoverable
          ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-card-hover transition-all duration-200'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
