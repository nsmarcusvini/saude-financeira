import { Card, CardContent } from '@/components/ui/card'
import type { HealthStatus } from '@/types/financial'

const STATUS_BORDER: Record<HealthStatus, string> = {
  healthy:   'border-l-green-500',
  attention: 'border-l-yellow-500',
  danger:    'border-l-red-500',
}

const STATUS_LABEL: Record<HealthStatus, { text: string; cls: string }> = {
  healthy:   { text: 'Saudável',  cls: 'text-green-700 bg-green-500/10' },
  attention: { text: 'Atenção',   cls: 'text-yellow-700 bg-yellow-500/10' },
  danger:    { text: 'Revisar',   cls: 'text-red-700 bg-red-500/10' },
}

interface KpiCardProps {
  label: string
  value: string
  description?: string
  status?: HealthStatus
  icon?: React.ReactNode
  /** 0-1, exibe barra de progresso */
  progress?: number
  progressMax?: number
  progressLabel?: string
  accent?: string
}

export function KpiCard({
  label, value, description, status, icon, progress, progressMax = 1, progressLabel, accent,
}: KpiCardProps) {
  const borderCls = status ? `border-l-4 ${STATUS_BORDER[status]}` : ''
  const pct = progress !== undefined ? Math.min(progress / progressMax, 1) : null

  const barColor =
    status === 'healthy'   ? 'bg-green-500' :
    status === 'attention' ? 'bg-yellow-500' :
    status === 'danger'    ? 'bg-red-500' :
    accent ?? 'bg-primary'

  return (
    <Card className={`overflow-hidden ${borderCls}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>

            {description && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{description}</p>
            )}

            {status && (
              <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded mt-2 ${STATUS_LABEL[status].cls}`}>
                {STATUS_LABEL[status].text}
              </span>
            )}
          </div>

          {icon && (
            <div className={`shrink-0 ${status ? (status === 'healthy' ? 'text-green-500' : status === 'danger' ? 'text-red-500' : 'text-yellow-500') : 'text-muted-foreground'}`}>
              {icon}
            </div>
          )}
        </div>

        {pct !== null && (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct * 100}%` }} />
            </div>
            {progressLabel && (
              <p className="text-[10px] text-muted-foreground">{progressLabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
