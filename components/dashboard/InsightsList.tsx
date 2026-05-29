'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Lightbulb, Target, ArrowRight, CheckCircle2, AlertTriangle,
  XCircle, Info, TrendingUp, Zap,
} from 'lucide-react'
import type { Insight, InsightType, StructuredInsights } from '@/types/financial'

const TYPE_CONFIG: Record<InsightType, {
  icon: React.ReactNode
  bg: string
  border: string
  text: string
}> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    bg: 'bg-green-500/8',
    border: 'border-green-500/20',
    text: 'text-green-700 dark:text-green-400',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    bg: 'bg-yellow-500/8',
    border: 'border-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  danger: {
    icon: <XCircle className="h-4 w-4 shrink-0" />,
    bg: 'bg-red-500/8',
    border: 'border-red-500/20',
    text: 'text-red-700 dark:text-red-400',
  },
  action: {
    icon: <ArrowRight className="h-4 w-4 shrink-0" />,
    bg: 'bg-primary/8',
    border: 'border-primary/20',
    text: 'text-primary',
  },
  tip: {
    icon: <Info className="h-4 w-4 shrink-0" />,
    bg: 'bg-muted/50',
    border: 'border-border',
    text: 'text-muted-foreground',
  },
}

function InsightCard({ insight, index }: { insight: Insight; index?: number }) {
  const cfg = TYPE_CONFIG[insight.type]
  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-sm ${cfg.bg} ${cfg.border}`}>
      <span className={`mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        {index !== undefined && (
          <span className={`text-[10px] font-bold mr-1.5 ${cfg.text}`}>{index + 1}.</span>
        )}
        <span className={cfg.text}>{insight.text}</span>
      </div>
    </div>
  )
}

interface InsightsListProps {
  insights: string[]
  structuredInsights?: StructuredInsights
}

export function InsightsList({ insights, structuredInsights }: InsightsListProps) {
  if (!structuredInsights) {
    if (insights.length === 0) return null
    return (
      <Card>
        <CardContent className="pt-5 space-y-2">
          {insights.map((text, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {text}
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const { diagnosis, nextSteps, savingsTips } = structuredInsights
  const hasContent = diagnosis.length > 0 || nextSteps.length > 0 || savingsTips.length > 0
  if (!hasContent) return null

  return (
    <div className="space-y-6">
      {/* ── DIAGNÓSTICO ── */}
      {diagnosis.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Diagnóstico atual</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {diagnosis.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* ── PRÓXIMOS PASSOS ── */}
      {nextSteps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Próximos passos</h3>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ação recomendada
            </span>
          </div>
          <div className="space-y-2">
            {nextSteps.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── DICAS DE ECONOMIA ── */}
      {savingsTips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold">Dicas de economia</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savingsTips.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
