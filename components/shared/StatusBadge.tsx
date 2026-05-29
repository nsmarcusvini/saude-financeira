import { cn } from '@/lib/utils/cn'
import type { HealthStatus } from '@/types/financial'

interface StatusBadgeProps {
  status: HealthStatus
  label?: string
  className?: string
}

const config: Record<HealthStatus, { label: string; className: string; dot: string }> = {
  healthy: {
    label: 'Saudável',
    className: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  attention: {
    label: 'Atenção',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    label: 'Revisar',
    className: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const c = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', c.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {label ?? c.label}
    </span>
  )
}
