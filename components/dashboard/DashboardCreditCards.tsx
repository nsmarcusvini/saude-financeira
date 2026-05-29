'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BillProjection } from '@/components/cartoes/BillProjection'
import { PaymentFlow } from '@/components/payments/PaymentFlow'
import { formatBRL } from '@/lib/utils/currency'
import { loanCurrentBalance } from '@/lib/calculations/loan-calculator'
import { CreditCard, Wallet, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react'
import { MONTHS_FULL } from '@/lib/utils/dates'
import type { CreditCardEntry, CreditCardInstallment, PaymentEvent, PaymentStatus } from '@/types/financial'

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
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string>('all')
  const [selectedLoanId, setSelectedLoanId] = useState<string>('all')

  // Competência corrente (horário de Brasília)
  const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const compMonth = _now.getMonth() + 1
  const compYear = _now.getFullYear()
  const _refAbs = compYear * 12 + compMonth

  const fetchAll = useCallback(async () => {
    if (!fiscalYearId) return
    try {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const m = now.getMonth() + 1
      const y = now.getFullYear()
      const [cardsRes, loansRes, payRes] = await Promise.all([
        fetch(`/api/cartoes?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
        fetch(`/api/loans?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
        fetch(`/api/pagamentos?fiscal_year_id=${fiscalYearId}&month=${m}&year=${y}`).then((r) => r.json()),
      ])
      const cardList: CreditCardEntry[] = Array.isArray(cardsRes) ? cardsRes : []
      setCards(cardList)
      setLoans(Array.isArray(loansRes) ? loansRes : [])
      setPayments(Array.isArray(payRes) ? payRes : [])

      const installsArrays = await Promise.all(
        cardList.map((c) => fetch(`/api/parcelas?credit_card_id=${c.id}`).then((r) => r.json()))
      )
      setAllInstallments(installsArrays.flat().filter((i: unknown) => i && typeof i === 'object'))
    } finally {
      setLoading(false)
    }
  }, [fiscalYearId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Helpers de pagamento por referência na competência atual
  const paymentOf = (refId: string): PaymentEvent | undefined =>
    payments.find((p) => p.ref_id === refId)
  const statusOf = (refId: string): PaymentStatus | null => paymentOf(refId)?.status ?? null

  const totalCurrentBill = cards.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalMonthlyInstallments = allInstallments.reduce((s, i) => {
    const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
    if (startAbs > _refAbs) return s // ainda não começou
    return Number(i.installments_remaining) > 0 ? s + Number(i.installment_amount) : s
  }, 0)
  const totalLoanPayments = loans.reduce((s, l) => s + Number(l.monthly_payment), 0)
  // Fix #G: saldo devedor por valor presente (não "total a pagar" que inclui juros futuros)
  const totalLoanDebt = loans.reduce((s, l) => s + loanCurrentBalance(l as never), 0)
  const commitmentPct = monthlyIncome > 0 ? (totalMonthlyInstallments + totalLoanPayments) / monthlyIncome : 0

  // Dados filtrados pelos selects de cartão e empréstimo
  const filteredCards = selectedCardId === 'all' ? cards : cards.filter((c) => c.id === selectedCardId)
  const filteredLoans = selectedLoanId === 'all' ? loans : loans.filter((l) => l.id === selectedLoanId)
  const filteredInstallments = selectedCardId === 'all'
    ? allInstallments
    : allInstallments.filter((i) => filteredCards.some((c) => c.id === i.credit_card_id))

  const nextMonths = useMemo(
    () => getNextMonthsBills(filteredCards, filteredInstallments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCardId, allInstallments, cards],
  )

  const hasData = cards.length > 0 || loans.length > 0

  if (loading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />
  if (!hasData) return null

  const commitmentColor = commitmentPct >= 0.5 ? 'text-red-600' : commitmentPct >= 0.3 ? 'text-yellow-600' : 'text-green-600'
  const commitmentBg = commitmentPct >= 0.5 ? 'bg-red-500' : commitmentPct >= 0.3 ? 'bg-yellow-500' : 'bg-green-500'

  // Subtotais sobre dados filtrados
  const filteredBill = filteredCards.reduce((s, c) => s + Number(c.current_balance), 0)
  const filteredInstTotal = filteredInstallments.reduce((s, i) => {
    const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
    if (startAbs > _refAbs) return s
    return Number(i.installments_remaining) > 0 ? s + Number(i.installment_amount) : s
  }, 0)
  const filteredLoanPayments = filteredLoans.reduce((s, l) => s + Number(l.monthly_payment), 0)
  const faturaAVista = Math.max(0, filteredBill - filteredInstTotal)
  const filteredRemainingDebt = filteredInstallments.reduce((s, i) => s + Number(i.installment_amount) * Number(i.installments_remaining), 0)
  const cardsRealDebt = faturaAVista + filteredRemainingDebt
  const totalMonthlyCommitment = filteredInstTotal + filteredLoanPayments

  // ── Pago vs falta este mês (vencimentos: fatura cartão + parcela empréstimo) ──
  const dueThisMonth = totalCurrentBill + totalLoanPayments
  const resolvedThisMonth =
    cards.reduce((s, c) => {
      const st = statusOf(c.id)
      return st === 'paid' || st === 'installment' ? s + Number(c.current_balance) : s
    }, 0) +
    loans.reduce((s, l) => {
      const st = statusOf(l.id)
      return st === 'paid' || st === 'installment' ? s + Number(l.monthly_payment) : s
    }, 0)
  const pendingThisMonth = Math.max(0, dueThisMonth - resolvedThisMonth)
  const allResolved = dueThisMonth > 0 && pendingThisMonth === 0
  const compLabel = `${MONTHS_FULL[compMonth - 1]}/${compYear}`

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

      {/* Status de pagamentos do mês */}
      {dueThisMonth > 0 && (
        <div className={`rounded-xl border p-4 ${allResolved ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card/40'}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              {allResolved
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <AlertTriangle className="h-4 w-4 text-orange-500" />}
              <p className="text-sm font-semibold">
                {allResolved ? `Tudo registrado em ${compLabel}` : `Pagamentos de ${compLabel}`}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Registrado <span className="font-bold text-green-600 tabular-nums">{formatBRL(resolvedThisMonth)}</span>
              {' '}de <span className="font-bold tabular-nums">{formatBRL(dueThisMonth)}</span>
              {pendingThisMonth > 0 && <> · falta <span className="font-bold text-red-600 tabular-nums">{formatBRL(pendingThisMonth)}</span></>}
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${dueThisMonth > 0 ? Math.min((resolvedThisMonth / dueThisMonth) * 100, 100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* ═══════════ BLOCO: CARTÕES DE CRÉDITO ═══════════ */}
      {cards.length > 0 && (
        <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          {/* Cabeçalho do bloco com subtotais + filtro */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-semibold">Cartões de Crédito</h3>
              {cards.length > 1 && (
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="text-[11px] rounded border border-border bg-background px-1.5 py-0.5 text-muted-foreground focus:outline-none"
                >
                  <option value="all">Todos ({cards.length})</option>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
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
                <p className="text-[10px] text-muted-foreground">Total que você deve</p>
                <p className="font-bold tabular-nums text-rose-700">{formatBRL(cardsRealDebt)}</p>
                <p className="text-[9px] text-muted-foreground">fatura + parcelas restantes</p>
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
            {filteredCards.map((card) => {
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
                    <div className="flex justify-end pt-1 border-t border-border">
                      <PaymentFlow
                        fiscalYearId={fiscalYearId}
                        refType="card"
                        refId={card.id}
                        label={card.name}
                        amountDue={Number(card.current_balance)}
                        competenceMonth={compMonth}
                        competenceYear={compYear}
                        currentStatus={statusOf(card.id)}
                        currentPaymentId={paymentOf(card.id)?.id ?? null}
                        variant={statusOf(card.id) ? 'badge' : 'button'}
                        onDone={fetchAll}
                      />
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
          {/* Cabeçalho do bloco com subtotais + filtro */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
                <Wallet className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold">Empréstimos</h3>
              {loans.length > 1 && (
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="text-[11px] rounded border border-border bg-background px-1.5 py-0.5 text-muted-foreground focus:outline-none"
                >
                  <option value="all">Todos ({loans.length})</option>
                  {loans.map((l) => <option key={l.id} value={l.id}>{l.description}</option>)}
                </select>
              )}
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
            {filteredLoans.map((loan) => {
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
                    <div className="flex justify-end pt-1 border-t border-border">
                      <PaymentFlow
                        fiscalYearId={fiscalYearId}
                        refType="loan"
                        refId={loan.id}
                        label={loan.description}
                        amountDue={Number(loan.monthly_payment)}
                        competenceMonth={compMonth}
                        competenceYear={compYear}
                        currentStatus={statusOf(loan.id)}
                        currentPaymentId={paymentOf(loan.id)?.id ?? null}
                        variant={statusOf(loan.id) ? 'badge' : 'button'}
                        onDone={fetchAll}
                      />
                    </div>
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
