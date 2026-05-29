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
import { MonthlyForecast } from '@/components/dashboard/MonthlyForecast'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { MONTHS } from '@/lib/utils/dates'
import { TrendingUp, TrendingDown, PiggyBank, LineChart, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DashboardKpis, HealthStatus } from '@/types/financial'

function reserveStatus(months: number): HealthStatus {
  if (months >= 6) return 'healthy'
  if (months >= 3) return 'attention'
  return 'danger'
}

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
  const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const [selectedMonth, setSelectedMonth] = useState<number>(_now.getMonth() + 1)

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

  // P1: base homogênea — divide pelos meses com renda preenchida (consistente com a API),
  // não pelo calendário inteiro. Evita sub/superestimar com dados parciais.
  const effectiveMonths   = Math.max(kpis.monthlyFlow.filter((r) => r.income > 0).length, 1)
  const avgMonthlyIncome  = kpis.annualIncome  / effectiveMonths
  const avgMonthlySurplus = kpis.annualSurplus / effectiveMonths
  const surplusStatus = kpis.savingsRateStatus

  const monthsWithData = kpis.monthlyFlow
    .filter((r) => r.income > 0 || r.fixed + r.variable > 0 || r.loanPayments > 0)
    .map((r) => r.month)

  return (
    <div className="space-y-8 max-w-7xl">
      {/* ── CABEÇALHO + FILTRO DE MÊS ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral da saúde financeira</p>
        </div>

        {/* Seletor de mês com navegação por setas */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-1">
          <button
            onClick={() => setSelectedMonth((m) => Math.max(1, m - 1))}
            disabled={selectedMonth <= 1}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-7 rounded bg-transparent px-2 text-sm font-medium focus:outline-none cursor-pointer"
          >
            {MONTHS.map((label, i) => (
              <option key={i} value={i + 1}>
                {label} {monthsWithData.includes(i + 1) ? '' : '·'}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSelectedMonth((m) => Math.min(12, m + 1))}
            disabled={selectedMonth >= 12}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. RESUMO DO MÊS: entradas vs saídas totais ── */}
      <CurrentMonthSummary rows={kpis.monthlyFlow} selectedMonth={selectedMonth} />

      {/* ── 1b. PREVISÃO DE DESEMBOLSO: este mês + próximos ── */}
      <MonthlyForecast forecast={kpis.forecast} />

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Reserva de emergência"
            value={kpis.reserveMonths > 0 ? `${kpis.reserveMonths.toFixed(1)} meses` : '—'}
            description={kpis.reserveMonths > 0 ? 'Meta: 6 a 12 meses' : 'Defina seu patrimônio na Projeção'}
            status={kpis.reserveMonths > 0 ? reserveStatus(kpis.reserveMonths) : undefined}
            icon={<Shield className="h-5 w-5" />}
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
