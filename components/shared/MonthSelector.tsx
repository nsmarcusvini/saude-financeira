'use client'

import { useAppStore } from '@/lib/store'
import { MONTHS } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useAppStore()

  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => setSelectedMonth(null)}
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          selectedMonth === null
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted',
        )}
      >
        Todos
      </button>
      {MONTHS.map((m, i) => (
        <button
          key={i}
          onClick={() => setSelectedMonth(i + 1)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            selectedMonth === i + 1
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
