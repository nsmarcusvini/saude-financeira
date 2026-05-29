/**
 * Fonte única de verdade para cálculo de dívida por mês.
 * Usada pelo dashboard, projeção e componentes de cartão.
 * Corrige: empréstimos e parcelas decaem corretamente; data de início respeitada.
 */

export interface LoanScheduleItem {
  monthly_payment: number
  remaining_installments: number
}

/**
 * Parcelas restantes de empréstimo hoje.
 * Diferente do cartão (que tem total fixo), o empréstimo guarda apenas
 * "parcelas restantes" — tratado como válido na data de início (start).
 * Cada mês decorrido desde o start reduz uma parcela.
 *
 * Sem start_month/start_year (dados antigos), retorna o valor estático.
 */
export function effectiveLoanRemaining(
  startMonth: number | null | undefined,
  startYear: number | null | undefined,
  storedRemaining: number,
  refMonth: number,
  refYear: number,
): number {
  const stored = Math.max(0, Number(storedRemaining) || 0)
  if (!startMonth || !startYear) return stored
  const elapsed = (refYear * 12 + refMonth) - (Number(startYear) * 12 + Number(startMonth))
  return Math.max(0, stored - Math.max(0, elapsed))
}

export interface InstallmentScheduleItem {
  installment_amount: number
  installments_remaining: number
  start_month: number
  start_year: number
}

/**
 * Calcula quantas parcelas REALMENTE restam hoje, a partir da data de início
 * e do total de parcelas — sem depender do número estático cadastrado.
 *
 * Convenção: no mês de início (elapsed=0) ainda faltam TODAS as parcelas
 * (a 1ª é cobrada neste ciclo). Cada mês decorrido reduz uma parcela.
 *
 * Se installments_total não estiver disponível, cai no valor estático (fallback).
 */
export function effectiveRemaining(
  startMonth: number,
  startYear: number,
  installmentsTotal: number,
  storedRemaining: number,
  refMonth: number,
  refYear: number,
): number {
  if (!installmentsTotal || installmentsTotal <= 0) {
    return Math.max(0, Number(storedRemaining) || 0)
  }
  const elapsed = (refYear * 12 + refMonth) - (startYear * 12 + startMonth)
  const remaining = installmentsTotal - Math.max(0, elapsed)
  return Math.max(0, Math.min(installmentsTotal, remaining))
}

/**
 * Total de dívida (empréstimos + parcelas de cartão) para um dado mês do ano fiscal (1-12).
 *
 * offset = fiscalMonth - referenceMonth
 *  offset >= 0 → mês atual ou futuro
 *  offset <  0 → mês passado do mesmo ano fiscal
 */
export function debtForFiscalMonth(
  loans: LoanScheduleItem[],
  installments: InstallmentScheduleItem[],
  fiscalMonth: number,
  referenceMonth: number,
  referenceYear: number,
): number {
  const offset = fiscalMonth - referenceMonth

  // Empréstimos (sem data de início; assume que existiam antes do mês corrente)
  const loanTotal = loans.reduce((s, l) => {
    const rem = Number(l.remaining_installments)
    if (offset >= 0) {
      return rem > offset ? s + Number(l.monthly_payment) : s
    } else {
      // Passado: ativo se ainda existia naquele mês (rem + meses decorridos > 0)
      return rem + (-offset) > 0 ? s + Number(l.monthly_payment) : s
    }
  }, 0)

  // Parcelamentos de cartão (com data de início e fim derivada)
  const refAbsolute = referenceYear * 12 + referenceMonth
  const cardTotal = installments.reduce((s, i) => {
    const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
    const endAbs   = refAbsolute + Number(i.installments_remaining) // exclusive
    const mAbs     = referenceYear * 12 + fiscalMonth

    if (offset >= 0) {
      // Futuro/atual: ainda não começou?
      if (startAbs > mAbs) return s
      return Number(i.installments_remaining) > offset ? s + Number(i.installment_amount) : s
    } else {
      // Passado: estava ativo naquele mês?
      return startAbs <= mAbs && mAbs < endAbs ? s + Number(i.installment_amount) : s
    }
  }, 0)

  return loanTotal + cardTotal
}

/**
 * Monta o mapa mês fiscal (1-12) → valor total de dívida.
 */
export function buildDebtSchedule(
  loans: LoanScheduleItem[],
  installments: InstallmentScheduleItem[],
  referenceMonth: number,
  referenceYear: number,
): Record<number, number> {
  const schedule: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) {
    schedule[m] = debtForFiscalMonth(loans, installments, m, referenceMonth, referenceYear)
  }
  return schedule
}

/**
 * Estima o total anual de dívida para um ano futuro (offset 1-5 a partir de agora).
 * Dívidas nominais fixas — NÃO reajustadas por inflação.
 * Quando uma dívida termina, para de somar automaticamente.
 */
export function annualDebtForFutureYear(
  loans: LoanScheduleItem[],
  installments: InstallmentScheduleItem[],
  yearOffset: number,
  referenceMonth: number,
  referenceYear: number,
): number {
  // meses 0-11 do yearOffset (1-indexed) a partir de hoje
  const startOffset = (yearOffset - 1) * 12
  let total = 0

  for (let k = startOffset; k < startOffset + 12; k++) {
    // Empréstimos
    for (const l of loans) {
      if (Number(l.remaining_installments) > k) total += Number(l.monthly_payment)
    }

    // Parcelas de cartão
    const refAbs = referenceYear * 12 + referenceMonth
    for (const i of installments) {
      const startAbs = Number(i.start_year) * 12 + Number(i.start_month)
      const thisAbs  = refAbs + k
      if (startAbs > thisAbs) continue
      if (Number(i.installments_remaining) > k) total += Number(i.installment_amount)
    }
  }

  return total
}
