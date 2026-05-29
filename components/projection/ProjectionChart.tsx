'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils/currency'
import type { ProjectionYear } from '@/types/financial'

interface ProjectionChartProps {
  years: ProjectionYear[]
}

export function ProjectionChart({ years }: ProjectionChartProps) {
  const data = years.map((y) => ({
    year: String(y.year),
    Patrimônio: Math.round(y.patrimony),
    Renda: Math.round(y.income),
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Patrimônio Acumulado</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
            <Line type="monotone" dataKey="Patrimônio" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Renda" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
