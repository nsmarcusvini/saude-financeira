'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { formatBRL } from '@/lib/utils/currency'
import { INCOME_CATEGORIES } from '@/lib/constants/categories'
import { MONTHS as MONTH_LABELS } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { CopyCheck } from 'lucide-react'

interface IncomeTableProps {
  fiscalYearId: string
}

type Grid = Record<string, Record<number, number>>

export function IncomeTable({ fiscalYearId }: IncomeTableProps) {
  const [grid, setGrid] = useState<Grid>({})
  const [categories, setCategories] = useState<string[]>(INCOME_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const [entriesRes, customRes] = await Promise.all([
          fetch(`/api/entries?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
          user
            ? supabase.from('custom_categories').select('name').eq('user_id', user.id).eq('type', 'income').order('name')
            : Promise.resolve({ data: [] as { name: string }[] }),
        ])

        const customNames: string[] = Array.isArray(customRes.data)
          ? customRes.data.map((c: { name: string }) => c.name)
          : []
        setCategories(customNames.length > 0 ? customNames : INCOME_CATEGORIES)

        const entries: { category: string; month: number; amount: number }[] = Array.isArray(entriesRes) ? entriesRes : []
        const g: Grid = {}
        entries.forEach((e) => {
          if (!g[e.category]) g[e.category] = {}
          g[e.category][e.month] = Number(e.amount)
        })
        setGrid(g)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fiscalYearId])

  const handleChange = useCallback(
    (category: string, month: number, amount: number) => {
      setGrid((prev) => ({
        ...prev,
        [category]: { ...(prev[category] ?? {}), [month]: amount },
      }))

      const key = `${category}-${month}`
      clearTimeout(debounceTimers.current[key])
      debounceTimers.current[key] = setTimeout(() => {
        fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fiscal_year_id: fiscalYearId, category, month, amount }),
        })
      }, 500)
    },
    [fiscalYearId],
  )

  const handleReplicate = useCallback(
    (category: string) => {
      const monthValues = grid[category] ?? {}
      const sourceValue = Object.values(monthValues).find((v) => v > 0) ?? 0
      if (sourceValue === 0) return

      const newMonths: Record<number, number> = {}
      for (let m = 1; m <= 12; m++) newMonths[m] = sourceValue

      setGrid((prev) => ({ ...prev, [category]: newMonths }))

      for (let m = 1; m <= 12; m++) {
        fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fiscal_year_id: fiscalYearId, category, month: m, amount: sourceValue }),
        })
      }
    },
    [grid, fiscalYearId],
  )

  function monthTotal(month: number): number {
    return categories.reduce((sum, cat) => sum + (grid[cat]?.[month] ?? 0), 0)
  }

  function categoryTotal(cat: string): number {
    return Array.from({ length: 12 }, (_, i) => grid[cat]?.[i + 1] ?? 0).reduce((a, b) => a + b, 0)
  }

  function grandTotal(): number {
    return Array.from({ length: 12 }, (_, i) => monthTotal(i + 1)).reduce((a, b) => a + b, 0)
  }

  if (loading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Entradas Mensais</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 bg-muted/50 text-left px-4 py-2.5 font-medium text-muted-foreground min-w-44">Categoria</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="text-right px-1 py-2.5 font-medium text-muted-foreground min-w-24">{m}</th>
                ))}
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground min-w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="group border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 bg-card group-hover:bg-muted/20 px-4 py-1.5 font-medium text-xs transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span>{cat}</span>
                      <button
                        title="Replicar valor para todos os meses"
                        onClick={() => handleReplicate(cat)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap"
                      >
                        <CopyCheck className="h-3 w-3" />
                        Replicar
                      </button>
                    </div>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => (
                    <td key={i + 1} className="px-1 py-1">
                      <CurrencyInput
                        value={grid[cat]?.[i + 1] ?? 0}
                        onChange={(v) => handleChange(cat, i + 1, v)}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-1.5 text-right tabular-nums font-medium text-green-700">
                    {categoryTotal(cat) > 0 ? formatBRL(categoryTotal(cat)) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="sticky left-0 bg-muted/30 px-4 py-2.5 text-xs">Total Entradas</td>
                {Array.from({ length: 12 }, (_, i) => (
                  <td key={i + 1} className={cn('px-3 py-2.5 text-right tabular-nums', monthTotal(i + 1) > 0 ? 'text-green-700' : 'text-muted-foreground')}>
                    {monthTotal(i + 1) > 0 ? formatBRL(monthTotal(i + 1)) : '—'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums text-green-700">{formatBRL(grandTotal())}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
