'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHS } from '@/lib/utils/dates'
import { formatBRL } from '@/lib/utils/currency'
import type { MonthlyFlowRow } from '@/types/financial'

interface FlowChartProps {
  rows: MonthlyFlowRow[]
}

export function FlowChart({ rows }: FlowChartProps) {
  const data = rows
    .filter((r) => r.income > 0 || r.fixed + r.variable > 0)
    .map((r) => ({
      name: MONTHS[r.month - 1],
      Entradas: r.income,
      Saídas: r.fixed + r.variable + r.loanPayments,
      Sobra: Math.max(0, r.surplus),
    }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Entradas vs Saídas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatBRL(Number(value)), '']}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saídas" fill="#f87171" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Sobra" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
