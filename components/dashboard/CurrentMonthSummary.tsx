'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { MONTHS_FULL } from '@/lib/utils/dates'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { MonthlyFlowRow } from '@/types/financial'

interface CurrentMonthSummaryProps {
  rows: MonthlyFlowRow[]
  selectedMonth?: number | null
}

export function CurrentMonthSummary({ rows, selectedMonth }: CurrentMonthSummaryProps) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const targetMonth = selectedMonth ?? currentMonth
  // Pega o mês selecionado; se não tiver dados, pega o último com dados
  const row =
    rows.find((r) => r.month === targetMonth) ??
    [...rows].reverse().find((r) => r.income > 0 || r.fixed + r.variable > 0)

  if (!row) return null

  const totalOut = row.fixed + row.variable + row.loanPayments
  const commitPct = row.income > 0 ? totalOut / row.income : 0
  const isDeficit = row.surplus < 0

  const commitColor =
    commitPct >= 1 ? 'bg-red-500' :
    commitPct >= 0.8 ? 'bg-orange-500' :
    commitPct >= 0.6 ? 'bg-yellow-500' :
    'bg-green-500'

  const surplusColor = isDeficit ? 'text-red-600' : 'text-green-600'

  const monthLabel = `${MONTHS_FULL[row.month - 1]} ${currentYear}`
  const isPast = row.month < currentMonth
  const isFuture = row.month > currentMonth

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Resumo de {monthLabel}
            {isPast && <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">realizado</span>}
            {isFuture && <span className="ml-1.5 text-[10px] bg-primary/10 px-1.5 py-0.5 rounded text-primary">projeção</span>}
          </p>
        </div>

        {/* Três valores principais */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Entradas */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-green-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Entradas</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-green-600">
              {formatBRL(row.income)}
            </p>
            <p className="text-[11px] text-muted-foreground">tudo que entra no mês</p>
          </div>

          {/* Saídas */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-red-600">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Saídas</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-red-600">
              {formatBRL(totalOut)}
            </p>
            <p className="text-[11px] text-muted-foreground">despesas + parcelas</p>
          </div>

          {/* Sobra */}
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 ${surplusColor}`}>
              <span className="text-xs font-medium uppercase tracking-wide">
                {isDeficit ? 'Déficit' : 'Sobra'}
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${surplusColor}`}>
              {formatBRL(Math.abs(row.surplus))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isDeficit ? 'gastando mais do que ganha' : `${formatPct(row.savingsRate)} da renda guardada`}
            </p>
          </div>
        </div>

        {/* Barra de comprometimento */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{formatPct(Math.min(commitPct, 1))} da renda comprometida</span>
            <span>{formatBRL(row.income - totalOut > 0 ? row.income - totalOut : 0)} disponível</span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${commitColor}`}
              style={{ width: `${Math.min(commitPct * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Breakdown detalhado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fixas</p>
            <p className="text-sm font-semibold tabular-nums">{formatBRL(row.fixed)}</p>
            {row.income > 0 && (
              <p className="text-[10px] text-muted-foreground">{formatPct(row.fixed / row.income)} da renda</p>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Variáveis</p>
            <p className="text-sm font-semibold tabular-nums">{formatBRL(row.variable)}</p>
            {row.income > 0 && (
              <p className="text-[10px] text-muted-foreground">{formatPct(row.variable / row.income)} da renda</p>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Empréstimos</p>
            <p className="text-sm font-semibold tabular-nums text-orange-600">{formatBRL(row.loanPayments)}</p>
            {row.income > 0 && row.loanPayments > 0 && (
              <p className="text-[10px] text-muted-foreground">{formatPct(row.loanPayments / row.income)} da renda</p>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Acumulado</p>
            <p className={`text-sm font-semibold tabular-nums ${row.accumulated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatBRL(row.accumulated)}
            </p>
            <p className="text-[10px] text-muted-foreground">saldo do ano</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
