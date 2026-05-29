'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatBRL, formatPct } from '@/lib/utils/currency'
import { totalLoanCost, totalLoanInterest, loanCurrentBalance } from '@/lib/calculations/loan-calculator'
import { Trash2 } from 'lucide-react'
import type { Loan } from '@/types/financial'

interface LoanCardProps {
  loan: Loan
  onDelete: (id: string) => void
}

export function LoanCard({ loan, onDelete }: LoanCardProps) {
  const totalCost = totalLoanCost(loan)
  const interest = totalLoanInterest(loan)
  const currentBalance = loanCurrentBalance(loan)

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{loan.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{loan.type}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(loan.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
          <div>
            <p className="text-muted-foreground">Parcela mensal</p>
            <p className="font-semibold tabular-nums">{formatBRL(loan.monthly_payment)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Parcelas restantes</p>
            <p className="font-semibold tabular-nums">{loan.remaining_installments}x</p>
          </div>
          <div>
            <p className="text-muted-foreground">Saldo devedor</p>
            <p className="font-semibold tabular-nums">{formatBRL(currentBalance)}</p>
            <p className="text-[10px] text-muted-foreground">para quitar hoje</p>
          </div>
          <div>
            <p className="text-muted-foreground">Taxa a.m.</p>
            <p className="font-semibold tabular-nums">{formatPct(loan.monthly_interest_rate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total a pagar</p>
            <p className="font-semibold tabular-nums text-orange-700">{formatBRL(totalCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Juros totais</p>
            <p className="font-semibold tabular-nums text-red-600">{formatBRL(interest)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
