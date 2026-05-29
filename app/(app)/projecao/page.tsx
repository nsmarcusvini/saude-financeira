'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { AssumptionsForm } from '@/components/projection/AssumptionsForm'
import dynamic from 'next/dynamic'
const ProjectionChart = dynamic(
  () => import('@/components/projection/ProjectionChart').then((m) => m.ProjectionChart),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-muted animate-pulse" /> }
)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils/currency'
import type { ProjectionAssumptions, ProjectionYear } from '@/types/financial'

const DEFAULT_ASSUMPTIONS: Omit<ProjectionAssumptions, 'fiscal_year_id'> = {
  inflation_rate: 0.045,
  real_income_growth: 0.03,
  investment_return: 0.10,
  savings_pct: 0.80,
  initial_patrimony: 0,
}

export default function ProjecaoPage() {
  const fiscalYearId = useFiscalYear()
  const [years, setYears] = useState<ProjectionYear[]>([])
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProjection = useCallback(async () => {
    if (!fiscalYearId) return
    const res = await fetch(`/api/projection?fiscal_year_id=${fiscalYearId}`)
    const data = await res.json()
    setYears(data.years)
    setAssumptions(data.assumptions)
    setLoading(false)
  }, [fiscalYearId])

  useEffect(() => { fetchProjection() }, [fetchProjection])

  async function handleSaveAssumptions(a: ProjectionAssumptions) {
    if (!fiscalYearId) return
    await fetch(`/api/projection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...a, fiscal_year_id: fiscalYearId }),
    })
    fetchProjection()
  }

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  const fullAssumptions = assumptions ?? { fiscal_year_id: fiscalYearId ?? '', ...DEFAULT_ASSUMPTIONS }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Projeção 5 Anos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Simule o crescimento do seu patrimônio com base nos dados atuais</p>
      </div>

      <AssumptionsForm assumptions={fullAssumptions} onSave={handleSaveAssumptions} />
      <ProjectionChart years={years} />

      {years.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resumo por Ano</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ano</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Renda</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saídas</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Superávit</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Aporte</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Patrimônio</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold">{y.year}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-700">{formatBRL(y.income)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{formatBRL(y.expenses)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(y.surplus)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-blue-600">{formatBRL(y.contribution)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-indigo-700">{formatBRL(y.patrimony)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
