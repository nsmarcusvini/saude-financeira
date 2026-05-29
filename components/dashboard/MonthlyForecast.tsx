'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils/currency'
import { MONTHS_FULL } from '@/lib/utils/dates'
import { CalendarClock, TrendingDown, ArrowDown, ArrowUp } from 'lucide-react'
import type { ForecastMonth } from '@/types/financial'

interface MonthlyForecastProps {
  forecast: ForecastMonth[]
}

export function MonthlyForecast({ forecast }: MonthlyForecastProps) {
  if (!forecast || forecast.length === 0) return null

  const thisMonth = forecast[0]
  const nextMonth = forecast[1]
  const delta = nextMonth ? nextMonth.total - thisMonth.total : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Previsão de desembolso
        </h2>
      </div>

      {/* Destaque: total deste mês e variação para o próximo */}
      {nextMonth && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Você vai pagar</span>
          <span className="font-bold tabular-nums text-rose-600">{formatBRL(thisMonth.total)}</span>
          <span className="text-muted-foreground">este mês e</span>
          <span className="font-bold tabular-nums text-rose-600">{formatBRL(nextMonth.total)}</span>
          <span className="text-muted-foreground">no próximo</span>
          {Math.abs(delta) >= 1 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${delta < 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
              {formatBRL(Math.abs(delta))}
              {delta < 0 ? ' a menos' : ' a mais'}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {forecast.map((f) => {
          const isDeficit = f.surplus < 0
          return (
            <Card key={f.month} className={f.isCurrent ? 'border-primary/40 bg-primary/5' : ''}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    {f.isCurrent ? 'Este mês' : MONTHS_FULL[f.month - 1]}
                  </p>
                  {!f.isCurrent && (
                    <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">previsto</span>
                  )}
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total a pagar</p>
                  <p className="text-2xl font-bold tabular-nums text-rose-600">{formatBRL(f.total)}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="tabular-nums">{formatBRL(f.expenses)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Empréstimos</span>
                    <span className="tabular-nums text-orange-600">{formatBRL(f.loans)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{f.isCurrent ? 'Fatura cartão' : 'Parcelas cartão'}</span>
                    <span className="tabular-nums text-rose-500">{formatBRL(f.card)}</span>
                  </div>
                </div>

                {/* Renda x sobra */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {f.income > 0 ? (isDeficit ? 'Déficit' : 'Sobra') : 'Sem renda no mês'}
                  </span>
                  {f.income > 0 && (
                    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                      <TrendingDown className={`h-3 w-3 ${isDeficit ? '' : 'rotate-180'}`} />
                      {formatBRL(Math.abs(f.surplus))}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Mês atual usa a fatura real do cartão; meses futuros consideram apenas as parcelas já contratadas.
        Despesas e fatura podem se sobrepor se o mesmo gasto for lançado nas duas telas.
      </p>
    </div>
  )
}
