'use client'

import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { IncomeTable } from '@/components/entries/IncomeTable'

export default function EntradasPage() {
  const fiscalYearId = useFiscalYear()

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-xl font-semibold">Entradas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Registre suas receitas mensais por categoria</p>
      </div>
      {fiscalYearId ? (
        <IncomeTable fiscalYearId={fiscalYearId} />
      ) : (
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      )}
    </div>
  )
}
