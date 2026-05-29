'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFiscalYear } from '@/lib/hooks/useFiscalYear'
import { CreditCardForm } from '@/components/cartoes/CreditCardForm'
import { CreditCardCard } from '@/components/cartoes/CreditCardCard'
import { InstallmentForm } from '@/components/cartoes/InstallmentForm'
import { InstallmentList } from '@/components/cartoes/InstallmentList'
import { BillProjection } from '@/components/cartoes/BillProjection'
import { PaymentFlow } from '@/components/payments/PaymentFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils/currency'
import type { CreditCardEntry, CreditCardInstallment, PaymentEvent, PaymentStatus } from '@/types/financial'

type InstallmentsMap = Record<string, CreditCardInstallment[]>

function computeCardMetrics(card: CreditCardEntry, installments: CreditCardInstallment[]) {
  const totalRemainingDebt = installments.reduce(
    (s, i) => s + Number(i.installment_amount) * Number(i.installments_remaining),
    0
  )
  const monthlyInstallmentsTotal = installments.reduce(
    (s, i) => s + Number(i.installment_amount),
    0
  )
  const totalRealDebt = Number(card.current_balance) + totalRemainingDebt
  const realUtilization = card.credit_limit > 0 ? totalRealDebt / card.credit_limit : 0
  return { totalRemainingDebt, monthlyInstallmentsTotal, totalRealDebt, realUtilization }
}

export default function CartoesPage() {
  const fiscalYearId = useFiscalYear()
  const [cards, setCards] = useState<CreditCardEntry[]>([])
  const [installmentsMap, setInstallmentsMap] = useState<InstallmentsMap>({})
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const compMonth = now.getMonth() + 1
  const compYear = now.getFullYear()

  const fetchAll = useCallback(async () => {
    if (!fiscalYearId) return
    const [cardsRes, payRes] = await Promise.all([
      fetch(`/api/cartoes?fiscal_year_id=${fiscalYearId}`).then((r) => r.json()),
      fetch(`/api/pagamentos?fiscal_year_id=${fiscalYearId}&month=${compMonth}&year=${compYear}`).then((r) => r.json()),
    ])
    const cardList: CreditCardEntry[] = Array.isArray(cardsRes) ? cardsRes : []
    setCards(cardList)
    setPayments(Array.isArray(payRes) ? payRes : [])

    const installsEntries = await Promise.all(
      cardList.map(async (c) => {
        const res = await fetch(`/api/parcelas?credit_card_id=${c.id}`).then((r) => r.json())
        return [c.id, Array.isArray(res) ? res : []] as [string, CreditCardInstallment[]]
      })
    )
    setInstallmentsMap(Object.fromEntries(installsEntries))
    setLoading(false)
  }, [fiscalYearId, compMonth, compYear])

  const paymentOf = (id: string) => payments.find((p) => p.ref_id === id)
  const statusOf  = (id: string): PaymentStatus | null => paymentOf(id)?.status ?? null

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleDeleteCard(id: string) {
    await fetch(`/api/cartoes?id=${id}`, { method: 'DELETE' })
    setCards((prev) => prev.filter((c) => c.id !== id))
    setInstallmentsMap((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  async function handleDeleteInstallment(cardId: string, installId: string) {
    await fetch(`/api/parcelas?id=${installId}`, { method: 'DELETE' })
    setInstallmentsMap((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] ?? []).filter((i) => i.id !== installId),
    }))
  }

  async function reloadInstallments(cardId: string) {
    const res = await fetch(`/api/parcelas?credit_card_id=${cardId}`).then((r) => r.json())
    setInstallmentsMap((prev) => ({ ...prev, [cardId]: Array.isArray(res) ? res : [] }))
  }

  // Sumário global
  const allInstallments = Object.values(installmentsMap).flat()
  const totalCurrentBill = cards.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalMonthlyInstallments = allInstallments.reduce((s, i) => s + Number(i.installment_amount), 0)
  const totalRemainingDebt = allInstallments.reduce((s, i) => s + Number(i.installment_amount) * Number(i.installments_remaining), 0)
  const totalLimit = cards.reduce((s, c) => s + Number(c.credit_limit), 0)
  const totalRealDebt = totalCurrentBill + totalRemainingDebt
  const overallUtilization = totalLimit > 0 ? totalRealDebt / totalLimit : 0

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Cartões de Crédito</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Faturas, parcelamentos e projeção de gastos futuros</p>
      </div>

      {fiscalYearId && <CreditCardForm fiscalYearId={fiscalYearId} onAdded={fetchAll} />}

      {/* Sumário global */}
      {cards.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Faturas do mês</p>
                <p className="text-base font-bold tabular-nums text-rose-600">{formatBRL(totalCurrentBill)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parcelas/mês</p>
                <p className="text-base font-bold tabular-nums text-orange-600">{formatBRL(totalMonthlyInstallments)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dívida total real</p>
                <p className="text-base font-bold tabular-nums text-rose-700">{formatBRL(totalRealDebt)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">faturas + parcelamentos futuros</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilização real</p>
                <p className={`text-base font-bold tabular-nums ${overallUtilization >= 0.8 ? 'text-red-600' : overallUtilization >= 0.5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {(overallUtilization * 100).toFixed(0)}%
                </p>
                <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overallUtilization >= 0.8 ? 'bg-red-500' : overallUtilization >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(overallUtilization * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projeção consolidada de todos os cartões */}
      {cards.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <BillProjection
              currentBalance={totalCurrentBill}
              installments={allInstallments}
            />
          </CardContent>
        </Card>
      )}

      {cards.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar cartão" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const cardInstallments = installmentsMap[card.id] ?? []
            const { totalRealDebt: cardTotalDebt, realUtilization, monthlyInstallmentsTotal } = computeCardMetrics(card, cardInstallments)

            return (
              <Card key={card.id} className="overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Lado esquerdo: card + métricas */}
                  <div className="p-4 space-y-3">
                    <CreditCardCard
                      card={card}
                      onDelete={handleDeleteCard}
                      paymentSlot={fiscalYearId ? (
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
                      ) : null}
                    />

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Fatura atual</p>
                        <p className="text-xs font-bold tabular-nums text-rose-600">{formatBRL(card.current_balance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Parcelas/mês</p>
                        <p className="text-xs font-bold tabular-nums text-orange-600">{formatBRL(monthlyInstallmentsTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Dívida real</p>
                        <p className="text-xs font-bold tabular-nums text-rose-700">{formatBRL(cardTotalDebt)}</p>
                      </div>
                    </div>

                    {realUtilization > 0 && (
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Utilização real do limite</span>
                          <span className={realUtilization >= 0.8 ? 'text-red-600 font-medium' : realUtilization >= 0.5 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                            {(realUtilization * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${realUtilization >= 0.8 ? 'bg-red-500' : realUtilization >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(realUtilization * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {card.monthly_interest_rate > 0 && card.current_balance > 0 && (
                      <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-[10px] text-red-700 font-medium">⚠ Juros rotativos ativos</p>
                        <p className="text-[10px] text-red-600 mt-0.5">
                          Se não pagar a fatura completa, pagará{' '}
                          <span className="font-bold">
                            {formatBRL(card.current_balance * card.monthly_interest_rate)}
                          </span>{' '}
                          em juros ({(card.monthly_interest_rate * 100).toFixed(2)}% a.m.)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lado direito: parcelamentos */}
                  <div className="p-4 space-y-3">
                    <CardHeader className="p-0 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Parcelamentos</CardTitle>
                        <InstallmentForm
                          creditCardId={card.id}
                          onAdded={() => reloadInstallments(card.id)}
                        />
                      </div>
                    </CardHeader>
                    <InstallmentList
                      installments={cardInstallments}
                      onDelete={(id) => handleDeleteInstallment(card.id, id)}
                      onUpdated={(updated) =>
                        setInstallmentsMap((prev) => ({
                          ...prev,
                          [card.id]: (prev[card.id] ?? []).map((i) => i.id === updated.id ? updated : i),
                        }))
                      }
                    />
                    {cardInstallments.length > 0 && (
                      <BillProjection
                        currentBalance={card.current_balance}
                        installments={cardInstallments}
                      />
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
