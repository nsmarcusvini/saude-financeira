'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { LoanCard } from '@/components/loans/LoanCard'
import { LoanForm } from '@/components/loans/LoanForm'
import { DebtHealthBar } from '@/components/loans/DebtHealthBar'
import { PaymentFlow } from '@/components/payments/PaymentFlow'
import { Card, CardContent } from '@/components/ui/card'
import { totalMonthlyPayments } from '@/lib/calculations/loan-calculator'
import { formatBRL } from '@/lib/utils/currency'
import type { Loan, PaymentEvent, PaymentStatus } from '@/types/financial'

export default function EmprestimosPage() {
  const fiscalYearId = useFiscalYear()
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading] = useState(true)

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const compMonth = now.getMonth() + 1
  const compYear = now.getFullYear()

  const fetchLoans = useCallback(async () => {
    if (!fiscalYearId) return
    const [loansRes, incomeRes, payRes] = await Promise.all([
      fetch(`/api/loans?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
      fetch(`/api/entries?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
      fetch(`/api/pagamentos?fiscal_year_id=${fiscalYearId}&month=${compMonth}&year=${compYear}`).then((r) => r.json()),
    ])
    setLoans(Array.isArray(loansRes) ? loansRes : [])
    setPayments(Array.isArray(payRes) ? payRes : [])
    const totalIncome = (Array.isArray(incomeRes) ? incomeRes as { amount: number }[] : []).reduce((s, e) => s + Number(e.amount), 0)
    setMonthlyIncome(totalIncome / 12)
    setLoading(false)
  }, [fiscalYearId, compMonth, compYear])

  const statusOf = (id: string): PaymentStatus | null =>
    payments.find((p) => p.ref_id === id)?.status ?? null

  useEffect(() => { fetchLoans() }, [fetchLoans])

  async function handleDelete(id: string) {
    await fetch(`/api/loans?id=${id}`, { method: 'DELETE' })
    fetchLoans()
  }

  const totalPayment = totalMonthlyPayments(loans)
  const debtPct = monthlyIncome > 0 ? totalPayment / monthlyIncome : 0

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Empréstimos e Dívidas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas dívidas ativas e acompanhe o comprometimento de renda</p>
      </div>

      {fiscalYearId && <LoanForm fiscalYearId={fiscalYearId} onAdded={fetchLoans} />}

      {loans.length > 0 && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total de parcelas/mês</span>
              <span className="font-bold tabular-nums text-orange-700">{formatBRL(totalPayment)}</span>
            </div>
            <DebtHealthBar pct={debtPct} />
          </CardContent>
        </Card>
      )}

      {loans.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma dívida cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar empréstimo" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onDelete={handleDelete}
              paymentSlot={fiscalYearId ? (
                <PaymentFlow
                  fiscalYearId={fiscalYearId}
                  refType="loan"
                  refId={loan.id}
                  label={loan.description}
                  amountDue={Number(loan.monthly_payment)}
                  competenceMonth={compMonth}
                  competenceYear={compYear}
                  currentStatus={statusOf(loan.id)}
                  variant={statusOf(loan.id) ? 'badge' : 'button'}
                  onDone={fetchLoans}
                />
              ) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
