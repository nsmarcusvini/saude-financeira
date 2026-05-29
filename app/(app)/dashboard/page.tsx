'use client'

import { useEffect, useState } from 'react'
import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { MonthlyFlowTable } from '@/components/dashboard/MonthlyFlowTable'
import dynamic from 'next/dynamic'
const FlowChart = dynamic(
  () => import('@/components/dashboard/FlowChart').then((m) => m.FlowChart),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-muted animate-pulse" /> }
)
import { InsightsList } from '@/components/dashboard/InsightsList'
import { DashboardCreditCards } from '@/components/dashboard/DashboardCreditCards'
import { CurrentMonthSummary } from '@/components/dashboard/CurrentMonthSummary'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, PiggyBank, LineChart } from 'lucide-react'
import type { DashboardKpis } from '@/types/financial'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da saúde financeira</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-40 rounded-xl bg-muted animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}

export default function DashboardPage() {
  const fiscalYearId = useFiscalYear()
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fiscalYearId) return
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/dashboard?fiscal_year_id=${fiscalYearId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setKpis(data); setLoading(false) })
      .catch((err) => { if (err.name !== 'AbortError') setLoading(false) })
    return () => controller.abort()
  }, [fiscalYearId])

  if (loading || !kpis) return <LoadingSkeleton />

  const avgMonthlyIncome = kpis.annualIncome / 12
  const avgMonthlySurplus = kpis.annualSurplus / 12
  const surplusStatus = kpis.savingsRateStatus

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da saúde financeira</p>
      </div>

      {/* ── 1. RESUMO DO MÊS: entradas vs saídas totais ── */}
      <CurrentMonthSummary rows={kpis.monthlyFlow} />

      {/* ── 2. COMPROMISSOS: cartões + empréstimos ── */}
      {fiscalYearId && (
        <DashboardCreditCards fiscalYearId={fiscalYearId} monthlyIncome={avgMonthlyIncome} />
      )}

      {/* ── 2. KPIs DE SAÚDE FINANCEIRA ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saúde financeira</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Renda mensal"
            value={formatBRL(avgMonthlyIncome)}
            description={`${formatBRL(kpis.annualIncome)} no ano`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            label="Sobra mensal"
            value={formatBRL(avgMonthlySurplus)}
            description="Renda − despesas − parcelas"
            status={surplusStatus}
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <KpiCard
            label="Taxa de poupança"
            value={formatPct(kpis.savingsRate)}
            description="Meta: ≥ 20%"
            status={kpis.savingsRateStatus}
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <KpiCard
            label="Patrimônio em 5 anos"
            value={formatBRL(kpis.projectedPatrimony5y)}
            description="Projeção com premissas atuais"
            icon={<LineChart className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Gastos fixos"
            value={formatPct(kpis.fixedExpensesPct)}
            description="Ideal ≤ 50% da renda"
            status={kpis.fixedExpensesStatus}
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <KpiCard
            label="Gastos variáveis"
            value={formatPct(kpis.variableExpensesPct)}
            description="Ideal ≤ 30% da renda"
          />
          <KpiCard
            label="Comprometimento dívidas"
            value={formatPct(kpis.debtCommitmentPct)}
            description="Parcelas / renda mensal"
            status={kpis.debtCommitmentStatus}
          />
        </div>
      </div>

      {/* ── 3. FLUXO MENSAL ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fluxo mensal</h2>
        <FlowChart rows={kpis.monthlyFlow} />
        <MonthlyFlowTable rows={kpis.monthlyFlow} />
      </div>

      {/* ── 4. INSIGHTS ── */}
      <InsightsList insights={kpis.insights} structuredInsights={kpis.structuredInsights} />
    </div>
  )
}
