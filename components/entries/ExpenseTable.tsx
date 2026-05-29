'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { formatBRL } from '@/lib/utils/currency'
import { FIXED_EXPENSE_CATEGORIES, VARIABLE_EXPENSE_CATEGORIES } from '@/lib/constants/categories'
import { MONTHS as MONTH_LABELS } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { CopyCheck } from 'lucide-react'

interface ExpenseTableProps {
  fiscalYearId: string
}

type Grid = Record<string, Record<number, number>>

function useExpenseGrid(fiscalYearId: string) {
  const [grid, setGrid] = useState<Grid>({})
  const [fixedCats, setFixedCats] = useState<string[]>(FIXED_EXPENSE_CATEGORIES)
  const [variableCats, setVariableCats] = useState<string[]>(VARIABLE_EXPENSE_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const [entriesRes, customFixed, customVariable] = await Promise.all([
          fetch(`/api/expenses?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
          user
            ? supabase.from('custom_categories').select('name').eq('user_id', user.id).eq('type', 'fixed').order('name')
            : Promise.resolve({ data: [] as { name: string }[] }),
          user
            ? supabase.from('custom_categories').select('name').eq('user_id', user.id).eq('type', 'variable').order('name')
            : Promise.resolve({ data: [] as { name: string }[] }),
        ])

        const fixedNames: string[] = Array.isArray(customFixed.data) ? customFixed.data.map((c: { name: string }) => c.name) : []
        const varNames: string[] = Array.isArray(customVariable.data) ? customVariable.data.map((c: { name: string }) => c.name) : []
        setFixedCats(fixedNames.length > 0 ? fixedNames : FIXED_EXPENSE_CATEGORIES)
        setVariableCats(varNames.length > 0 ? varNames : VARIABLE_EXPENSE_CATEGORIES)

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
    (category: string, type: 'fixed' | 'variable', month: number, amount: number) => {
      setGrid((prev) => ({
        ...prev,
        [category]: { ...(prev[category] ?? {}), [month]: amount },
      }))
      const key = `${category}-${month}`
      clearTimeout(debounceTimers.current[key])
      debounceTimers.current[key] = setTimeout(() => {
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fiscal_year_id: fiscalYearId, category, type, month, amount }),
        })
      }, 500)
    },
    [fiscalYearId],
  )

  const handleReplicate = useCallback(
    (category: string, type: 'fixed' | 'variable') => {
      const monthValues = grid[category] ?? {}
      const sourceValue = Object.values(monthValues).find((v) => v > 0) ?? 0
      if (sourceValue === 0) return

      const newMonths: Record<number, number> = {}
      for (let m = 1; m <= 12; m++) newMonths[m] = sourceValue

      setGrid((prev) => ({ ...prev, [category]: newMonths }))

      for (let m = 1; m <= 12; m++) {
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fiscal_year_id: fiscalYearId, category, type, month: m, amount: sourceValue }),
        })
      }
    },
    [grid, fiscalYearId],
  )

  return { grid, loading, handleChange, handleReplicate, fixedCats, variableCats }
}

export function ExpenseTable({ fiscalYearId }: ExpenseTableProps) {
  const { grid, loading, handleChange, handleReplicate, fixedCats, variableCats } = useExpenseGrid(fiscalYearId)

  function monthSubtotal(cats: string[], month: number): number {
    return cats.reduce((sum, cat) => sum + (grid[cat]?.[month] ?? 0), 0)
  }

  function catTotal(cat: string): number {
    return Array.from({ length: 12 }, (_, i) => grid[cat]?.[i + 1] ?? 0).reduce((a, b) => a + b, 0)
  }

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  return (
    <div className="space-y-6">
      <ExpenseSection
        title="Despesas Fixas"
        categories={fixedCats}
        type="fixed"
        grid={grid}
        onChangeCell={(cat, month, amount) => handleChange(cat, 'fixed', month, amount)}
        onReplicate={(cat) => handleReplicate(cat, 'fixed')}
        monthSubtotal={(m) => monthSubtotal(fixedCats, m)}
        catTotal={catTotal}
      />
      <ExpenseSection
        title="Despesas Variáveis"
        categories={variableCats}
        type="variable"
        grid={grid}
        onChangeCell={(cat, month, amount) => handleChange(cat, 'variable', month, amount)}
        onReplicate={(cat) => handleReplicate(cat, 'variable')}
        monthSubtotal={(m) => monthSubtotal(variableCats, m)}
        catTotal={catTotal}
      />
    </div>
  )
}

interface ExpenseSectionProps {
  title: string
  categories: string[]
  type: 'fixed' | 'variable'
  grid: Grid
  onChangeCell: (cat: string, month: number, amount: number) => void
  onReplicate: (cat: string) => void
  monthSubtotal: (month: number) => number
  catTotal: (cat: string) => number
}

function ExpenseSection({ title, categories, grid, onChangeCell, onReplicate, monthSubtotal, catTotal }: ExpenseSectionProps) {
  const color = title.includes('Fixas') ? 'text-orange-700' : 'text-rose-700'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
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
                <tr key={cat} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 bg-card group-hover:bg-muted/20 px-4 py-1.5 font-medium text-xs transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span>{cat}</span>
                      <button
                        title="Replicar valor para todos os meses"
                        onClick={() => onReplicate(cat)}
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
                        onChange={(v) => onChangeCell(cat, i + 1, v)}
                      />
                    </td>
                  ))}
                  <td className={cn('px-4 py-1.5 text-right tabular-nums font-medium', color)}>
                    {catTotal(cat) > 0 ? formatBRL(catTotal(cat)) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="sticky left-0 bg-muted/30 px-4 py-2.5 text-xs">Subtotal</td>
                {Array.from({ length: 12 }, (_, i) => (
                  <td key={i + 1} className={cn('px-3 py-2.5 text-right tabular-nums', monthSubtotal(i + 1) > 0 ? color : 'text-muted-foreground')}>
                    {monthSubtotal(i + 1) > 0 ? formatBRL(monthSubtotal(i + 1)) : '—'}
                  </td>
                ))}
                <td className={cn('px-4 py-2.5 text-right tabular-nums', color)}>
                  {formatBRL(Array.from({ length: 12 }, (_, i) => monthSubtotal(i + 1)).reduce((a, b) => a + b, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
