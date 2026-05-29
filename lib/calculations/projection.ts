import type { ProjectionAssumptions, ProjectionYear } from '@/types/financial'

export function calculateProjection(
  baseAnnualIncome: number,
  baseAnnualExpenses: number,
  baseAnnualLoanPayments: number,
  assumptions: ProjectionAssumptions,
): ProjectionYear[] {
  const {
    inflation_rate,
    real_income_growth,
    investment_return,
    savings_pct,
    initial_patrimony,
  } = assumptions

  const years: ProjectionYear[] = []
  let patrimony = initial_patrimony

  for (let n = 1; n <= 5; n++) {
    const incomeGrowth = (1 + real_income_growth + inflation_rate) ** n
    const expenseGrowth = (1 + inflation_rate) ** n

    const income = baseAnnualIncome * incomeGrowth
    const expenses = baseAnnualExpenses * expenseGrowth
    const loanPayments = baseAnnualLoanPayments * expenseGrowth
    const surplus = income - expenses - loanPayments
    const contribution = Math.max(0, surplus * savings_pct)

    patrimony = patrimony * (1 + investment_return) + contribution

    years.push({
      year: new Date().getFullYear() + n,
      income,
      expenses,
      surplus,
      contribution,
      patrimony,
    })
  }

  return years
}
