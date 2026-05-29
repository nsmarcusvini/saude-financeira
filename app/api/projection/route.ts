import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateProjection } from '@/lib/calculations/projection'
import { annualDebtForFutureYear } from '@/lib/calculations/schedule'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  if (!fiscalYearId) return NextResponse.json({ error: 'fiscal_year_id required' }, { status: 400 })

  const supabase = await createClient()

  const [incomeRes, expenseRes, loansRes, assumptionsRes, cardsRes] = await Promise.all([
    supabase.from('income_entries').select('amount').eq('fiscal_year_id', fiscalYearId),
    supabase.from('expense_entries').select('amount').eq('fiscal_year_id', fiscalYearId),
    supabase.from('loans').select('monthly_payment, remaining_installments').eq('fiscal_year_id', fiscalYearId),
    supabase.from('projection_assumptions').select('*').eq('fiscal_year_id', fiscalYearId).single(),
    supabase.from('credit_cards').select('id').eq('fiscal_year_id', fiscalYearId),
  ])

  const cardIds = (cardsRes.data ?? []).map((c: { id: string }) => c.id)
  // N2: sem filtro remaining>0 — consistente com dashboard/route.ts
  const installmentsRes = cardIds.length > 0
    ? await supabase
        .from('credit_card_installments')
        .select('installment_amount, installments_remaining, start_month, start_year')
        .in('credit_card_id', cardIds)
    : { data: [] }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const referenceMonth = now.getMonth() + 1
  const referenceYear  = now.getFullYear()

  const loans = (loansRes.data ?? []).map((l) => ({
    monthly_payment: Number(l.monthly_payment),
    remaining_installments: Number(l.remaining_installments),
  }))

  const installments = (installmentsRes.data ?? []).map((i) => ({
    installment_amount: Number(i.installment_amount),
    installments_remaining: Number(i.installments_remaining),
    start_month: Number(i.start_month),
    start_year: Number(i.start_year),
  }))

  const annualIncome   = (incomeRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const annualExpenses = (expenseRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // Dívida decaindo por ano (não mais flat × 12)
  const annualDebtByYear = [1, 2, 3, 4, 5].map((yr) =>
    annualDebtForFutureYear(loans, installments, yr, referenceMonth, referenceYear)
  )

  const assumptions = assumptionsRes.data ?? {
    fiscal_year_id: fiscalYearId,
    inflation_rate: 0.045,
    real_income_growth: 0.03,
    investment_return: 0.10,
    savings_pct: 0.80,
    initial_patrimony: 0,
  }

  const years = calculateProjection(annualIncome, annualExpenses, annualDebtByYear, assumptions)

  return NextResponse.json({ years, assumptions })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { fiscal_year_id, ...rest } = body

  const { error } = await supabase
    .from('projection_assumptions')
    .upsert({ fiscal_year_id, ...rest }, { onConflict: 'fiscal_year_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
