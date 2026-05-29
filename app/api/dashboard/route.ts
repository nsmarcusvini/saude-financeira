import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  savingsStatus, debtStatus, fixedExpensesStatus,
  generateInsights, generateStructuredInsights, buildMonthlyFlow,
} from '@/lib/calculations/health-indicators'
import { calculateProjection } from '@/lib/calculations/projection'
import { totalMonthlyPayments } from '@/lib/calculations/loan-calculator'
import { buildDebtSchedule, annualDebtForFutureYear } from '@/lib/calculations/schedule'
import type { DashboardKpis, Loan } from '@/types/financial'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  if (!fiscalYearId) return NextResponse.json({ error: 'fiscal_year_id required' }, { status: 400 })

  const supabase = await createClient()

  const [incomeRes, expenseRes, loansRes, assumptionsRes, cardsRes] = await Promise.all([
    supabase.from('income_entries').select('*').eq('fiscal_year_id', fiscalYearId),
    supabase.from('expense_entries').select('*').eq('fiscal_year_id', fiscalYearId),
    supabase.from('loans').select('*').eq('fiscal_year_id', fiscalYearId),
    supabase.from('projection_assumptions').select('*').eq('fiscal_year_id', fiscalYearId).single(),
    supabase.from('credit_cards').select('id, current_balance').eq('fiscal_year_id', fiscalYearId),
  ])

  const incomeEntries = incomeRes.data ?? []
  const expenseEntries = expenseRes.data ?? []
  const loans: Loan[] = (loansRes.data ?? []).map((l) => ({
    ...l,
    original_value: Number(l.original_value),
    current_balance: Number(l.current_balance),
    monthly_interest_rate: Number(l.monthly_interest_rate),
    monthly_payment: Number(l.monthly_payment),
  }))

  // Parcelamentos com datas para o schedule unificado
  const cardIds = (cardsRes.data ?? []).map((c) => c.id)
  const installmentsRes = cardIds.length > 0
    ? await supabase
        .from('credit_card_installments')
        .select('installment_amount, installments_remaining, start_month, start_year')
        .in('credit_card_id', cardIds)
        .gt('installments_remaining', 0)
    : { data: [] }

  const installments = (installmentsRes.data ?? []).map((i) => ({
    installment_amount: Number(i.installment_amount),
    installments_remaining: Number(i.installments_remaining),
    start_month: Number(i.start_month),
    start_year: Number(i.start_year),
  }))

  // UTC-3 (horário de Brasília) para evitar divergência de fuso na virada de mês
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const referenceMonth = now.getMonth() + 1
  const referenceYear  = now.getFullYear()

  // ── Schedule unificado: empréstimos + parcelas de cartão por mês fiscal ──
  const loanPaymentsByMonth = buildDebtSchedule(loans, installments, referenceMonth, referenceYear)
  const monthlyLoanTotal    = loanPaymentsByMonth[referenceMonth] ?? 0 // mês corrente

  // ── Receitas e despesas ──
  const incomeByMonth:   Record<number, number> = {}
  const fixedByMonth:    Record<number, number> = {}
  const variableByMonth: Record<number, number> = {}

  for (let m = 1; m <= 12; m++) {
    incomeByMonth[m]   = incomeEntries.filter((e) => e.month === m).reduce((s, r) => s + Number(r.amount), 0)
    fixedByMonth[m]    = expenseEntries.filter((e) => e.type === 'fixed'    && e.month === m).reduce((s, r) => s + Number(r.amount), 0)
    variableByMonth[m] = expenseEntries.filter((e) => e.type === 'variable' && e.month === m).reduce((s, r) => s + Number(r.amount), 0)
  }

  const annualIncome   = incomeEntries.reduce((s, r) => s + Number(r.amount), 0)
  const annualFixed    = expenseEntries.filter((e) => e.type === 'fixed').reduce((s, r) => s + Number(r.amount), 0)
  const annualVariable = expenseEntries.filter((e) => e.type === 'variable').reduce((s, r) => s + Number(r.amount), 0)
  const annualExpenses = annualFixed + annualVariable

  // ── Fix #B: base homogênea — compara renda e dívida nos mesmos meses ──
  // Só considera meses onde o usuário preencheu renda (evita comparar N meses de renda
  // com 12 meses de dívida projetada, o que distorce surplus e savingsRate).
  const monthsWithIncome = new Set(
    incomeEntries.filter((e) => Number(e.amount) > 0).map((e) => e.month)
  )
  const effectiveMonths = Math.max(monthsWithIncome.size, 1)

  // Dívida para os mesmos meses que têm renda preenchida
  const debtForEffectiveMonths = [...monthsWithIncome].reduce(
    (s, m) => s + (loanPaymentsByMonth[m] ?? 0), 0
  )

  // Surplus calculado em base homogênea (mesmo período)
  const periodExpenses = [...monthsWithIncome].reduce(
    (s, m) => s + (fixedByMonth[m] ?? 0) + (variableByMonth[m] ?? 0), 0
  )
  const annualSurplus = annualIncome - periodExpenses - debtForEffectiveMonths

  // annualDebtPayments = projeção forward de 12 meses (para exibição e projeção patrimonial)
  const annualDebtPayments = Object.values(loanPaymentsByMonth).reduce((s, v) => s + v, 0)

  // avgMonthlyIncome baseado nos meses efetivos (não divide pelo calendário inteiro)
  const avgMonthlyIncome    = annualIncome / effectiveMonths
  const savingsRate         = avgMonthlyIncome > 0 ? annualSurplus / annualIncome : 0
  const debtCommitmentPct   = avgMonthlyIncome > 0 ? monthlyLoanTotal / avgMonthlyIncome : 0
  const fixedExpensesPct    = annualIncome > 0 ? annualFixed / annualIncome : 0
  const variableExpensesPct = annualIncome > 0 ? annualVariable / annualIncome : 0

  // Parcelas de cartão no mês corrente (para creditCardMonthlyTotal)
  const monthlyCardInstallments = installments.reduce(
    (s, i) => Number(i.installments_remaining) > 0 ? s + i.installment_amount : s, 0
  )

  const assumptions = assumptionsRes.data ?? {
    fiscal_year_id: fiscalYearId,
    inflation_rate: 0.045,
    real_income_growth: 0.03,
    investment_return: 0.10,
    savings_pct: 0.80,
    initial_patrimony: 0,
  }

  // ── Fix #C: projeção com dívida decaindo ano a ano ──
  const annualDebtPerYear = [1, 2, 3, 4, 5].map((yr) =>
    annualDebtForFutureYear(loans, installments, yr, referenceMonth, referenceYear)
  )
  const projectionYears      = calculateProjection(annualIncome, annualExpenses, annualDebtPerYear, assumptions)
  const projectedPatrimony5y = projectionYears[4]?.patrimony ?? 0

  // Fluxo mensal usa o schedule completo (todos os 12 meses)
  const monthlyFlow = buildMonthlyFlow(incomeByMonth, fixedByMonth, variableByMonth, loanPaymentsByMonth)

  const kpisWithoutInsights = {
    annualIncome, annualExpenses, annualDebtPayments, annualSurplus,
    savingsRate,         savingsRateStatus:     savingsStatus(savingsRate),
    debtCommitmentPct,   debtCommitmentStatus:  debtStatus(debtCommitmentPct),
    fixedExpensesPct,    fixedExpensesStatus:   fixedExpensesStatus(fixedExpensesPct),
    variableExpensesPct,
    reserveMonths: 0,
    monthlyFlow,
    projectedPatrimony5y,
    creditCardMonthlyTotal: monthlyCardInstallments,
  }

  const kpis: DashboardKpis = {
    ...kpisWithoutInsights,
    insights:           generateInsights(kpisWithoutInsights),
    structuredInsights: generateStructuredInsights(kpisWithoutInsights),
  }

  return NextResponse.json(kpis)
}
