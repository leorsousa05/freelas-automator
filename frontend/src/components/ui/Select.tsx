import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export default function Select({ label, error, children, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full h-10 px-3 pr-8 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
            error
              ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}
