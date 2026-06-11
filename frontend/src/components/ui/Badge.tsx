type Variant = 'neutral' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  error: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  info: 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400',
}

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
