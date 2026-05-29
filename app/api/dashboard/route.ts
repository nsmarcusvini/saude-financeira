import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  savingsStatus, debtStatus, fixedExpensesStatus,
  generateInsights, generateStructuredInsights, buildMonthlyFlow,
} from '@/lib/calculations/health-indicators'
import { calculateProjection } from '@/lib/calculations/projection'
import { totalMonthlyPayments } from '@/lib/calculations/loan-calculator'
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

  // Busca parcelamentos de todos os cartões deste fiscal year
  const cardIds = (cardsRes.data ?? []).map((c) => c.id)
  const installmentsRes = cardIds.length > 0
    ? await supabase
        .from('credit_card_installments')
        .select('installment_amount, installments_remaining')
        .in('credit_card_id', cardIds)
        .gt('installments_remaining', 0)
    : { data: [] }

  const monthlyCardInstallments = (installmentsRes.data ?? [])
    .reduce((s, i) => s + Number(i.installment_amount), 0)

  const annualIncome = incomeEntries.reduce((s, r) => s + Number(r.amount), 0)
  const annualFixed = expenseEntries.filter((e) => e.type === 'fixed').reduce((s, r) => s + Number(r.amount), 0)
  const annualVariable = expenseEntries.filter((e) => e.type === 'variable').reduce((s, r) => s + Number(r.amount), 0)
  const annualExpenses = annualFixed + annualVariable
  const monthlyLoanTotal = totalMonthlyPayments(loans) + monthlyCardInstallments
  const annualDebtPayments = monthlyLoanTotal * 12
  const annualSurplus = annualIncome - annualExpenses - annualDebtPayments

  const avgMonthlyIncome = annualIncome / 12
  const savingsRate = avgMonthlyIncome > 0 ? annualSurplus / annualIncome : 0
  const debtCommitmentPct = avgMonthlyIncome > 0 ? monthlyLoanTotal / avgMonthlyIncome : 0
  const fixedExpensesPct = annualIncome > 0 ? annualFixed / annualIncome : 0
  const variableExpensesPct = annualIncome > 0 ? annualVariable / annualIncome : 0

  const assumptions = assumptionsRes.data ?? {
    fiscal_year_id: fiscalYearId,
    inflation_rate: 0.045,
    real_income_growth: 0.03,
    investment_return: 0.10,
    savings_pct: 0.80,
    initial_patrimony: 0,
  }

  const projectionYears = calculateProjection(annualIncome, annualExpenses, annualDebtPayments, assumptions)
  const projectedPatrimony5y = projectionYears[4]?.patrimony ?? 0

  const incomeByMonth: Record<number, number> = {}
  const fixedByMonth: Record<number, number> = {}
  const variableByMonth: Record<number, number> = {}

  for (let m = 1; m <= 12; m++) {
    incomeByMonth[m] = incomeEntries.filter((e) => e.month === m).reduce((s, r) => s + Number(r.amount), 0)
    fixedByMonth[m] = expenseEntries.filter((e) => e.type === 'fixed' && e.month === m).reduce((s, r) => s + Number(r.amount), 0)
    variableByMonth[m] = expenseEntries.filter((e) => e.type === 'variable' && e.month === m).reduce((s, r) => s + Number(r.amount), 0)
  }

  const monthlyFlow = buildMonthlyFlow(incomeByMonth, fixedByMonth, variableByMonth, monthlyLoanTotal)

  const kpisWithoutInsights = {
    annualIncome, annualExpenses, annualDebtPayments, annualSurplus,
    savingsRate, savingsRateStatus: savingsStatus(savingsRate),
    debtCommitmentPct, debtCommitmentStatus: debtStatus(debtCommitmentPct),
    fixedExpensesPct, fixedExpensesStatus: fixedExpensesStatus(fixedExpensesPct),
    variableExpensesPct,
    reserveMonths: 0,
    monthlyFlow,
    projectedPatrimony5y,
    creditCardMonthlyTotal: monthlyCardInstallments,
  }

  const kpis: DashboardKpis = {
    ...kpisWithoutInsights,
    insights: generateInsights(kpisWithoutInsights),
    structuredInsights: generateStructuredInsights(kpisWithoutInsights),
  }

  return NextResponse.json(kpis)
}
