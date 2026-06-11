import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Column<T> {
  id: string
  header: string
  accessor?: (row: T) => unknown
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
}

export default function DataTable<T>({ columns, rows, keyExtractor, onRowClick }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...rows].sort((a: T, b: T) => {
    if (!sortKey) return 0
    const col = columns.find((c) => c.id === sortKey)
    const accessor = col?.accessor ?? ((row: T) => (row as Record<string, unknown>)[sortKey])
    const av = accessor(a) ?? ''
    const bv = accessor(b) ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const getCellValue = (row: T, col: Column<T>) => {
    if (col.render) return col.render(row)
    if (col.accessor) return String(col.accessor(row) ?? '')
    return String((row as Record<string, unknown>)[col.id] ?? '')
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            {columns.map((c) => (
              <th
                key={c.id}
                onClick={() => c.sortable !== false && handleSort(c.id)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none whitespace-nowrap ${
                  c.sortable !== false ? 'cursor-pointer' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.header}
                  {sortKey === c.id ? (
                    sortDir === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )
                  ) : (
                    <span className="inline-block w-[14px]" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={`border-b border-slate-100 dark:border-slate-800/50 transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : ''
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((c) => (
                <td key={c.id} className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {getCellValue(row, c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
