'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { MONTHS } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { MonthlyFlowRow } from '@/types/financial'

interface MonthlyFlowTableProps {
  rows: MonthlyFlowRow[]
}

export function MonthlyFlowTable({ rows }: MonthlyFlowTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Fluxo Mensal</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Mês</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Entradas</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Despesas</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Parcelas</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Saídas Totais</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Sobra</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">% Poupar</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const totalExpenses = row.fixed + row.variable + row.loanPayments
                return (
                <tr key={row.month} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{MONTHS[row.month - 1]}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-green-700">{row.income > 0 ? formatBRL(row.income) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{(row.fixed + row.variable) > 0 ? formatBRL(row.fixed + row.variable) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{row.loanPayments > 0 ? formatBRL(row.loanPayments) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-red-600">{totalExpenses > 0 ? formatBRL(totalExpenses) : '—'}</td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', row.surplus >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {row.income > 0 ? formatBRL(row.surplus) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.income > 0 ? formatPct(row.savingsRate) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.income > 0 && <StatusBadge status={row.status} />}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
