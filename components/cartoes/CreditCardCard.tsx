'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, CreditCard } from 'lucide-react'
import { formatBRL } from '@/lib/utils/currency'
import type { CreditCardEntry } from '@/types/financial'

interface CreditCardCardProps {
  card: CreditCardEntry
  onDelete: (id: string) => void
}

export function CreditCardCard({ card, onDelete }: CreditCardCardProps) {
  const utilized = card.credit_limit > 0 ? card.current_balance / card.credit_limit : 0
  const available = card.credit_limit - card.current_balance

  const utilizationColor =
    utilized >= 0.8 ? 'bg-red-500' :
    utilized >= 0.5 ? 'bg-yellow-500' :
    'bg-green-500'

  const utilizationTextColor =
    utilized >= 0.8 ? 'text-red-600' :
    utilized >= 0.5 ? 'text-yellow-600' :
    'text-green-600'

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full bg-muted">
        <div
          className={`h-full transition-all ${utilizationColor}`}
          style={{ width: `${Math.min(utilized * 100, 100)}%` }}
        />
      </div>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{card.name}</p>
              {card.operator && <p className="text-xs text-muted-foreground mt-0.5">{card.operator}</p>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(card.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Fatura atual</p>
            <p className={`text-sm font-bold tabular-nums ${card.current_balance > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {formatBRL(card.current_balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Limite disponível</p>
            <p className="text-sm font-bold tabular-nums text-green-600">{formatBRL(available)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Limite total</p>
            <p className="text-sm tabular-nums">{formatBRL(card.credit_limit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Utilização</p>
            <p className={`text-sm font-medium tabular-nums ${utilizationTextColor}`}>
              {(utilized * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border text-xs text-muted-foreground">
          {card.due_day && <span>Vence dia {card.due_day}</span>}
          {card.closing_day && <span>Fecha dia {card.closing_day}</span>}
          {card.monthly_interest_rate > 0 && (
            <span>{(card.monthly_interest_rate * 100).toFixed(2)}% a.m.</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
