'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BillProjection } from '@/components/cartoes/BillProjection'
import { formatBRL } from '@/lib/utils/currency'
import { loanCurrentBalance } from '@/lib/calculations/loan-calculator'
import { CreditCard, Wallet, AlertTriangle, Calendar } from 'lucide-react'
import { MONTHS_FULL } from '@/lib/utils/dates'
import type { CreditCardEntry, CreditCardInstallment } from '@/types/financial'

interface DashboardCreditCardsProps {
  fiscalYearId: string
  monthlyIncome: number
}

interface Loan {
  id: string
  description: string
  monthly_payment: number
  remaining_installments: number
  monthly_interest_rate: number
  type: string
}

// Usa mesma lógica do schedule.ts: respeita start_month/start_year
function getNextMonthsBills(
  cards: CreditCardEntry[],
  installments: CreditCardInstallment[],
): { label: string; value: number }[] {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const refMonth = now.getMonth() + 1
  const refYear  = now.getFullYear()
  const refAbs   = refYear * 12 + refMonth

  return Array.from({ length: 3 }, (_, offset) => {
    const d     = new Date(refYear, now.getMonth() + offset, 1)
    const label = offset > 0
      ? `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
      : MONTHS_FULL[d.getMonth()]

    const instTotal = installments.reduce((s, i) => {
      const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
      const mAbs     = refAbs + offset
      if (startAbs > mAbs) return s
      return Number(i.installments_remaining) > offset ? s + Number(i.installment_amount) : s
    }, 0)

    const value = offset === 0
      ? cards.reduce((s, c) => s + Number(c.current_balance), 0) + instTotal
      : instTotal
    return { label, value }
  })
}

export function DashboardCreditCards({ fiscalYearId, monthlyIncome }: DashboardCreditCardsProps) {
  const [cards, setCards] = useState<CreditCardEntry[]>([])
  const [allInstallments, setAllInstallments] = useState<CreditCardInstallment[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!fiscalYearId) return
    try {
      const [cardsRes, loansRes] = await Promise.all([
        fetch(`/api/cartoes?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
        fetch(`/api/loans?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
      ])
      const cardList: CreditCardEntry[] = Array.isArray(cardsRes) ? cardsRes : []
      setCards(cardList)
      setLoans(Array.isArray(loansRes) ? loansRes : [])

      const installsArrays = await Promise.all(
        cardList.map((c) => fetch(`/api/parcelas?credit_card_id=${c.id}`).then((r) => r.json()))
      )
      setAllInstallments(installsArrays.flat().filter((i: unknown) => i && typeof i === 'object'))
    } finally {
      setLoading(false)
    }
  }, [fiscalYearId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // P2: só conta parcelas já iniciadas e com saldo restante (mesma regra do schedule.ts)
  const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const _refAbs = _now.getFullYear() * 12 + (_now.getMonth() + 1)

  const totalCurrentBill = cards.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalMonthlyInstallments = allInstallments.reduce((s, i) => {
    const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
    if (startAbs > _refAbs) return s // ainda não começou
    return Number(i.installments_remaining) > 0 ? s + Number(i.installment_amount) : s
  }, 0)
  const totalLoanPayments = loans.reduce((s, l) => s + Number(l.monthly_payment), 0)
  const totalRemainingDebt = allInstallments.reduce((s, i) => s + Number(i.installment_amount) * Number(i.installments_remaining), 0)
  // Fix #G: saldo devedor por valor presente (não "total a pagar" que inclui juros futuros)
  const totalLoanDebt = loans.reduce((s, l) => s + loanCurrentBalance(l as never), 0)
  const commitmentPct = monthlyIncome > 0 ? (totalMonthlyInstallments + totalLoanPayments) / monthlyIncome : 0

  const nextMonths = useMemo(() => getNextMonthsBills(cards, allInstallments), [cards, allInstallments])

  const hasData = cards.length > 0 || loans.length > 0

  if (loading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />
  if (!hasData) return null

  const commitmentColor = commitmentPct >= 0.5 ? 'text-red-600' : commitmentPct >= 0.3 ? 'text-yellow-600' : 'text-green-600'
  const commitmentBg = commitmentPct >= 0.5 ? 'bg-red-500' : commitmentPct >= 0.3 ? 'bg-yellow-500' : 'bg-green-500'

  // Subtotais por categoria
  const cardsRealDebt = totalCurrentBill + totalRemainingDebt
  const totalMonthlyCommitment = totalMonthlyInstallments + totalLoanPayments

  return (
    <div className="space-y-6">
      {/* Header geral + comprometimento */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Compromissos Financeiros</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Comprometimento da renda:</span>
          <span className={`font-bold tabular-nums ${commitmentColor}`}>{(commitmentPct * 100).toFixed(0)}%</span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${commitmentBg}`} style={{ width: `${Math.min(commitmentPct * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ═══════════ BLOCO: CARTÕES DE CRÉDITO ═══════════ */}
      {cards.length > 0 && (
        <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          {/* Cabeçalho do bloco com subtotais */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-semibold">Cartões de Crédito</h3>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{cards.length}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Faturas do mês</p>
                <p className="font-bold tabular-nums text-rose-600">{formatBRL(totalCurrentBill)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Parcelas/mês</p>
                <p className="font-bold tabular-nums text-orange-600">{formatBRL(totalMonthlyInstallments)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Dívida cartões</p>
                <p className="font-bold tabular-nums text-rose-700">{formatBRL(cardsRealDebt)}</p>
              </div>
            </div>
          </div>

          {/* Próximas faturas */}
          <div className="grid grid-cols-3 gap-3">
            {nextMonths.map((m, i) => (
              <Card key={i} className={i === 0 ? 'border-primary/40 bg-primary/5' : ''}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground font-medium truncate flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {i === 0 ? 'Este mês' : i === 1 ? 'Próximo mês' : m.label}
                      </p>
                      <p className={`text-lg font-bold tabular-nums mt-1 ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                        {formatBRL(m.value)}
                      </p>
                      {i === 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">fatura + parcelas</p>
                      )}
                    </div>
                    {i > 0 && nextMonths[0].value > 0 && (
                      <span className={`text-[10px] font-medium shrink-0 ${m.value < nextMonths[0].value ? 'text-green-600' : m.value > nextMonths[0].value ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {m.value < nextMonths[0].value ? '▼' : m.value > nextMonths[0].value ? '▲' : '—'}
                        {' '}{formatBRL(Math.abs(m.value - nextMonths[0].value))}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cartões individuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((card) => {
              const cardInstalls = allInstallments.filter((i) => i.credit_card_id === card.id)
              const monthlyInst = cardInstalls.reduce((s, i) => s + Number(i.installment_amount), 0)
              const utilized = card.credit_limit > 0 ? Number(card.current_balance) / Number(card.credit_limit) : 0
              const utilizColor = utilized >= 0.8 ? 'text-red-600' : utilized >= 0.5 ? 'text-yellow-600' : 'text-green-600'
              const utilizBg = utilized >= 0.8 ? 'bg-red-500' : utilized >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'

              return (
                <Card key={card.id} className="overflow-hidden">
                  <div className="h-1 w-full bg-muted">
                    <div className={`h-full ${utilizBg}`} style={{ width: `${Math.min(utilized * 100, 100)}%` }} />
                  </div>
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{card.name}</p>
                        {card.operator && <p className="text-[10px] text-muted-foreground">{card.operator}</p>}
                      </div>
                      {card.due_day && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          vence dia {card.due_day}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Fatura</p>
                        <p className="text-xs font-bold text-rose-600 tabular-nums">{formatBRL(card.current_balance)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Parcelas</p>
                        <p className="text-xs font-bold text-orange-600 tabular-nums">{formatBRL(monthlyInst)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Utiliz.</p>
                        <p className={`text-xs font-bold tabular-nums ${utilizColor}`}>{(utilized * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Projeção 6 meses */}
          {allInstallments.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <BillProjection currentBalance={totalCurrentBill} installments={allInstallments} />
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ═══════════ BLOCO: EMPRÉSTIMOS ═══════════ */}
      {loans.length > 0 && (
        <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          {/* Cabeçalho do bloco com subtotais */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
                <Wallet className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold">Empréstimos</h3>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{loans.length}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Parcelas/mês</p>
                <p className="font-bold tabular-nums text-orange-600">{formatBRL(totalLoanPayments)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Dívida restante</p>
                <p className="font-bold tabular-nums text-rose-700">{formatBRL(totalLoanDebt)}</p>
              </div>
            </div>
          </div>

          {/* Lista de empréstimos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loans.map((loan) => {
              const saldoDevedor = loanCurrentBalance(loan as never)
              const totalAPagar  = Number(loan.monthly_payment) * Number(loan.remaining_installments || 0)
              return (
                <Card key={loan.id}>
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{loan.description}</p>
                        {loan.type && <p className="text-[10px] text-muted-foreground">{loan.type}</p>}
                      </div>
                      <p className="text-sm font-bold tabular-nums text-orange-600 shrink-0">
                        {formatBRL(loan.monthly_payment)}<span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                      </p>
                    </div>
                    {loan.remaining_installments > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Saldo devedor</p>
                          <p className="text-xs font-semibold tabular-nums">{formatBRL(saldoDevedor)}</p>
                          <p className="text-[9px] text-muted-foreground">para quitar hoje</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Total a pagar</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{formatBRL(totalAPagar)}</p>
                          <p className="text-[9px] text-muted-foreground">{loan.remaining_installments}x restantes</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Total geral + alerta */}
      <div className="flex items-center justify-between gap-2 px-1 text-sm">
        <span className="text-muted-foreground">Total de compromissos mensais</span>
        <span className="font-bold tabular-nums text-rose-700">{formatBRL(totalMonthlyCommitment)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
      </div>

      {commitmentPct >= 0.3 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800 dark:text-orange-300">
            <span className="font-semibold">Atenção:</span> {(commitmentPct * 100).toFixed(0)}% da renda vai para parcelas.
            {commitmentPct >= 0.5
              ? ' Tente renegociar ou antecipar as dívidas de maior juros para recuperar fluxo de caixa.'
              : ' Evite assumir novos compromissos até reduzir esse percentual.'}
          </p>
        </div>
      )}
    </div>
  )
}
