interface SkeletonProps {
  count?: number
  className?: string
}

export default function Skeleton({ count = 3, className = '' }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse"
        />
      ))}
    </div>
  )
}
