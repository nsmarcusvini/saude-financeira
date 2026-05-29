'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHS } from '@/lib/utils/dates'
import { formatBRL } from '@/lib/utils/currency'
import type { MonthlyFlowRow } from '@/types/financial'

interface FlowChartProps {
  rows: MonthlyFlowRow[]
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm space-y-1 text-xs">
      <p className="font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function FlowChart({ rows }: FlowChartProps) {
  // Inclui todos os meses com qualquer movimento (income, despesas OU só parcelas)
  const data = rows
    .filter((r) => r.income > 0 || r.fixed + r.variable > 0 || r.loanPayments > 0)
    .map((r) => ({
      name: MONTHS[r.month - 1],
      Entradas: r.income,
      Saídas: r.fixed + r.variable + r.loanPayments,
      // Sobra preserva sinal: negativo = déficit, positivo = sobra
      Sobra: r.surplus,
      isDeficit: r.surplus < 0,
    }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Entradas vs Saídas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            />
            {/* Linha de referência no zero para tornar déficit visível */}
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Saídas"   fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Sobra"    radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isDeficit ? '#ef4444' : '#60a5fa'}
                  fillOpacity={entry.isDeficit ? 0.9 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          Barra azul = sobra · Barra vermelha na Sobra = déficit (gastos &gt; renda)
        </p>
      </CardContent>
    </Card>
  )
}
