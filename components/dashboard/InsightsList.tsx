'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb, TrendingUp, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import type { Insight, InsightType, StructuredInsights } from '@/types/financial'

const TYPE_CONFIG: Record<InsightType, { icon: React.ReactNode; className: string; dot: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />,
    className: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
    className: 'text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  danger: {
    icon: <XCircle className="h-4 w-4 shrink-0 mt-0.5" />,
    className: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  action: {
    icon: <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />,
    className: 'text-primary dark:text-primary',
    dot: 'bg-primary',
  },
  tip: {
    icon: <Info className="h-4 w-4 shrink-0 mt-0.5" />,
    className: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

function InsightItem({ insight }: { insight: Insight }) {
  const config = TYPE_CONFIG[insight.type]
  return (
    <li className={`flex gap-2.5 text-sm ${config.className}`}>
      {config.icon}
      <span>{insight.text}</span>
    </li>
  )
}

function Section({ title, icon, items, emptyText }: {
  title: string
  icon: React.ReactNode
  items: Insight[]
  emptyText?: string
}) {
  if (items.length === 0 && !emptyText) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2.5 pl-1">
          {items.map((insight, i) => <InsightItem key={i} insight={insight} />)}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground pl-1">{emptyText}</p>
      )}
    </div>
  )
}

interface InsightsListProps {
  insights: string[]
  structuredInsights?: StructuredInsights
}

export function InsightsList({ insights, structuredInsights }: InsightsListProps) {
  if (structuredInsights) {
    const { diagnosis, nextSteps, savingsTips } = structuredInsights
    const hasContent = diagnosis.length > 0 || nextSteps.length > 0 || savingsTips.length > 0
    if (!hasContent) return null

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights e dicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Section
            title="Diagnóstico atual"
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
            items={diagnosis}
          />
          {nextSteps.length > 0 && (
            <>
              <div className="border-t border-border" />
              <Section
                title="Próximos passos"
                icon={<ArrowRight className="h-3.5 w-3.5 text-primary" />}
                items={nextSteps}
              />
            </>
          )}
          {savingsTips.length > 0 && (
            <>
              <div className="border-t border-border" />
              <Section
                title="Dicas de economia"
                icon={<TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />}
                items={savingsTips}
              />
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // Fallback para formato legado (string[])
  if (insights.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Insights automáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
