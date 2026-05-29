import { formatPct } from '@/lib/utils/currency'
import { debtStatus } from '@/lib/calculations/health-indicators'
import { cn } from '@/lib/utils/cn'

interface DebtHealthBarProps {
  pct: number
}

export function DebtHealthBar({ pct }: DebtHealthBarProps) {
  const status = debtStatus(pct)
  const barColor = {
    healthy: 'bg-green-500',
    attention: 'bg-amber-500',
    danger: 'bg-red-500',
  }[status]

  const capped = Math.min(pct, 1)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Comprometimento de renda com dívidas</span>
        <span className="font-semibold tabular-nums">{formatPct(pct)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${(capped * 100).toFixed(1)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span className="text-green-600">≤30% saudável</span>
        <span className="text-amber-600">≤50% atenção</span>
        <span className="text-red-600">50%+</span>
      </div>
    </div>
  )
}
