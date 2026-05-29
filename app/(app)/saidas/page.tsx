'use client'

import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { ExpenseTable } from '@/components/entries/ExpenseTable'

export default function SaidasPage() {
  const fiscalYearId = useFiscalYear()

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-xl font-semibold">Saídas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Registre suas despesas fixas e variáveis mensais</p>
      </div>
      {fiscalYearId ? (
        <ExpenseTable fiscalYearId={fiscalYearId} />
      ) : (
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      )}
    </div>
  )
}
