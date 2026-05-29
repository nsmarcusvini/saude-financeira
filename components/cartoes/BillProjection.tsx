'use client'

import { formatBRL } from '@/lib/utils/currency'
import { MONTHS } from '@/lib/utils/dates'
import type { CreditCardInstallment } from '@/types/financial'

interface BillProjectionProps {
  currentBalance: number
  installments: CreditCardInstallment[]
}

function getProjection(currentBalance: number, installments: CreditCardInstallment[]) {
  const now = new Date()
  const result = []

  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const label = MONTHS[d.getMonth()]

    // Soma as parcelas com pagamento previsto para este mês,
    // respeitando o mês de início e quantas parcelas ainda restam.
    const installmentsDue = installments.reduce((sum, inst) => {
      const start = new Date(inst.start_year, inst.start_month - 1, 1)
      const startOffset = Math.max(
        0,
        (start.getFullYear() - now.getFullYear()) * 12 + (start.getMonth() - now.getMonth()),
      )
      const remaining = Number(inst.installments_remaining)
      // Paga deste mês até startOffset + remaining - 1
      if (offset >= startOffset && offset < startOffset + remaining) {
        return sum + Number(inst.installment_amount)
      }
      return sum
    }, 0)

    // No mês atual usamos a fatura real (que já contém as parcelas deste ciclo).
    // Nos meses futuros, projetamos apenas as parcelas que ainda vão ser cobradas.
    const value = offset === 0
      ? (Number(currentBalance) > 0 ? Number(currentBalance) : installmentsDue)
      : installmentsDue

    result.push({
      month: offset === 0 ? `${label} (atual)` : label,
      value: Math.round(value * 100) / 100,
      isCurrent: offset === 0,
    })
  }

  return result
}

export function BillProjection({ currentBalance, installments }: BillProjectionProps) {
  const data = getProjection(currentBalance, installments)
  const hasData = data.some((d) => d.value > 0)
  const max = Math.max(...data.map((d) => d.value), 1)

  if (!hasData) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">Adicione parcelamentos para ver a projeção de faturas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Projeção de faturas — próximos 6 meses
      </p>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
              <div className="relative w-full flex flex-col items-center justify-end h-full">
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-card border border-border rounded px-2 py-1 text-[10px] font-semibold tabular-nums whitespace-nowrap shadow-sm z-10">
                  {formatBRL(d.value)}
                </div>
                <div
                  className={`w-full rounded-t-sm transition-all ${d.isCurrent ? 'bg-primary' : 'bg-primary/35'}`}
                  style={{ height: `${heightPct}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{d.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
