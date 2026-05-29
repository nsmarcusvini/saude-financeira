import type { Loan } from '@/types/financial'

export function totalLoanCost(loan: Loan): number {
  return loan.monthly_payment * loan.remaining_installments
}

/**
 * Saldo devedor = valor presente das parcelas restantes (quanto quitaria hoje).
 * Tabela Price: saldo = parcela × [1 − (1 + i)^−n] / i
 * Com taxa 0, é simplesmente parcela × parcelas restantes.
 */
export function loanCurrentBalance(loan: Loan): number {
  const i = Number(loan.monthly_interest_rate) || 0
  const n = Number(loan.remaining_installments) || 0
  const pmt = Number(loan.monthly_payment) || 0
  if (n <= 0 || pmt <= 0) return 0
  if (i <= 0) return pmt * n
  return pmt * (1 - Math.pow(1 + i, -n)) / i
}

export function totalLoanInterest(loan: Loan): number {
  return Math.max(0, totalLoanCost(loan) - loanCurrentBalance(loan))
}

export function totalMonthlyPayments(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.monthly_payment, 0)
}

