import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { HealthStatus } from '@/types/financial'

interface KpiCardProps {
  label: string
  value: string
  description?: string
  status?: HealthStatus
  icon?: React.ReactNode
}

export function KpiCard({ label, value, description, status, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1 leading-none">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1.5">{description}</p>}
            {status && <div className="mt-2"><StatusBadge status={status} /></div>}
          </div>
          {icon && (
            <div className="ml-3 shrink-0 text-muted-foreground">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
