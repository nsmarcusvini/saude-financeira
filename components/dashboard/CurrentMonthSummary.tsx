'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { MONTHS_FULL } from '@/lib/utils/dates'
import type { MonthlyFlowRow, ForecastMonth } from '@/types/financial'

interface CurrentMonthSummaryProps {
  rows: MonthlyFlowRow[]
  selectedMonth?: number | null
  forecast?: ForecastMonth[]
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
    </div>
  )
}

function Row({
  label, value, pct, color, bold, dimmed, sub,
}: {
  label: string
  value: number
  pct?: number
  color?: string
  bold?: boolean
  dimmed?: boolean
  sub?: string
}) {
  return (
    <div className={`space-y-1 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {color && <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />}
          <span className={`text-xs truncate ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          {sub && <span className="text-[10px] text-muted-foreground hidden sm:inline">{sub}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pct !== undefined && pct > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{formatPct(pct)}</span>
          )}
          <span className={`text-sm tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${color?.includes('green') ? 'text-green-600' : color?.includes('red') ? 'text-red-600' : color?.includes('orange') ? 'text-orange-600' : ''}`}>
            {formatBRL(value)}
          </span>
        </div>
      </div>
      {pct !== undefined && pct > 0 && color && (
        <Bar pct={pct} color={color} />
      )}
    </div>
  )
}

export function CurrentMonthSummary({ rows, selectedMonth, forecast }: CurrentMonthSummaryProps) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const targetMonth = selectedMonth ?? currentMonth
  const row =
    rows.find((r) => r.month === targetMonth) ??
    [...rows].reverse().find((r) => r.income > 0 || r.fixed + r.variable > 0)

  if (!row) return null

  const isPast = row.month < currentMonth
  const isFuture = row.month > currentMonth

  // Para o mês atual, usa o forecast (que tem a fatura real do cartão).
  // Para meses passados/futuros, usa o monthlyFlow (melhor aproximação disponível).
  const fc = forecast?.find((f) => f.month === row.month)
  const useForecast = fc && !isPast && !isFuture

  const income    = row.income
  const fixed     = row.fixed
  const variable  = row.variable
  // Empréstimos e cartão separados (mês atual via forecast) ou unificados (outros meses)
  const loanAmt   = useForecast ? fc.loans : row.loanPayments
  const cardAmt   = useForecast ? fc.card  : 0
  const totalOut  = useForecast ? fc.total - income + income /* usa fc.total */
                                : row.fixed + row.variable + row.loanPayments
  const surplus   = income - (useForecast ? (fixed + variable + loanAmt + cardAmt) : totalOut)
  const isDeficit = surplus < 0

  const realTotalOut = fixed + variable + loanAmt + (useForecast ? cardAmt : 0)
  const pctOf = (v: number) => income > 0 ? v / income : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold">
              Resumo de {MONTHS_FULL[row.month - 1]} {currentYear}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Detalhamento completo de entradas e saídas
            </p>
          </div>
          <div className="flex gap-2">
            {isPast && <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">realizado</span>}
            {isFuture && <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded font-medium text-primary">projeção</span>}
            {!isPast && !isFuture && <span className="text-[10px] bg-green-500/10 px-2 py-0.5 rounded font-medium text-green-700">mês atual</span>}
          </div>
        </div>

        {/* ENTRADAS */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Entradas</p>
          <Row label="Total de entradas" value={income} color="bg-green-500" pct={1} bold />
        </div>

        {/* SAÍDAS */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saídas</p>

          <Row
            label="Despesas fixas"
            sub="aluguel, planos, assinaturas…"
            value={row.fixed}
            pct={pctOf(row.fixed)}
            color="bg-slate-400"
            dimmed={row.fixed === 0}
          />
          <Row
            label="Despesas variáveis"
            sub="mercado, lazer, transporte…"
            value={row.variable}
            pct={pctOf(row.variable)}
            color="bg-amber-400"
            dimmed={row.variable === 0}
          />
          {useForecast ? (
            // Mês atual: separa empréstimos (parcelas) de fatura do cartão
            <>
              <Row
                label="Empréstimos"
                sub="parcelas do mês"
                value={loanAmt}
                pct={pctOf(loanAmt)}
                color="bg-orange-500"
                dimmed={loanAmt === 0}
              />
              <Row
                label="Fatura cartão"
                sub="fatura real deste mês"
                value={cardAmt}
                pct={pctOf(cardAmt)}
                color="bg-rose-500"
                dimmed={cardAmt === 0}
              />
            </>
          ) : (
            // Outros meses: soma de parcelas (melhor estimativa disponível)
            <Row
              label="Parcelas"
              sub="empréstimos + cartão"
              value={loanAmt}
              pct={pctOf(loanAmt)}
              color="bg-orange-500"
              dimmed={loanAmt === 0}
            />
          )}

          {/* Separador total saídas */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs font-semibold">Total de saídas</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground tabular-nums">{income > 0 ? formatPct(pctOf(realTotalOut)) : '—'}</span>
              <span className="text-sm font-bold tabular-nums text-red-600">{formatBRL(realTotalOut)}</span>
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">{isDeficit ? '⚠ Déficit' : '✓ Sobra do mês'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isDeficit
                  ? 'Gastos superam a renda'
                  : `${formatPct(income > 0 ? surplus / income : 0)} da renda disponível para poupar`}
              </p>
            </div>
            <p className={`text-xl font-bold tabular-nums ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
              {isDeficit ? '-' : '+'}{formatBRL(Math.abs(surplus))}
            </p>
          </div>

          {/* Barra visual empilhada */}
          {income > 0 && (
            <div className="mt-3 space-y-1">
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-slate-400" style={{ width: `${Math.min(pctOf(fixed) * 100, 100)}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${Math.min(pctOf(variable) * 100, 100)}%` }} />
                <div className="h-full bg-orange-500" style={{ width: `${Math.min(pctOf(loanAmt) * 100, 100)}%` }} />
                {useForecast && <div className="h-full bg-rose-500" style={{ width: `${Math.min(pctOf(cardAmt) * 100, 100)}%` }} />}
                <div className="h-full bg-green-400" style={{ width: `${Math.max(0, Math.min(pctOf(surplus) * 100, 100))}%` }} />
              </div>
              <div className="flex gap-3 text-[9px] text-muted-foreground flex-wrap">
                <span><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1" />Fixas</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Variáveis</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />{useForecast ? 'Empr.' : 'Parcelas'}</span>
                {useForecast && <span><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />Cartão</span>}
                <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />Sobra</span>
              </div>
            </div>
          )}
        </div>

        {/* Acumulado do ano */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
          <span>Saldo acumulado no ano</span>
          <span className={`font-semibold tabular-nums ${row.accumulated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatBRL(row.accumulated)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
