import type { ProjectionAssumptions, ProjectionYear } from '@/types/financial'

/**
 * Calcula a projeção patrimonial de 5 anos.
 *
 * Correções aplicadas vs. versão anterior:
 * - annualDebtByYear[n] é o total real de dívida para cada ano futuro (já calculado
 *   com decaimento correto em schedule.ts). NÃO é inflacionado — parcelas de
 *   empréstimo e cartão são nominalmente fixas.
 * - Quando uma dívida termina, o aporte aumenta automaticamente (o valor que
 *   era parcela vira poupança).
 */
export function calculateProjection(
  baseAnnualIncome: number,
  baseAnnualExpenses: number,
  annualDebtByYear: number[], // vetor [ano1, ano2, ano3, ano4, ano5] — valores nominais
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
  let patrimony = Number(initial_patrimony)

  for (let n = 1; n <= 5; n++) {
    const incomeGrowth  = (1 + Number(real_income_growth) + Number(inflation_rate)) ** n
    const expenseGrowth = (1 + Number(inflation_rate)) ** n

    const income       = baseAnnualIncome   * incomeGrowth
    const expenses     = baseAnnualExpenses * expenseGrowth
    // Dívida: nominal fixa (não cresce com inflação); usa o vetor real por ano
    const loanPayments = annualDebtByYear[n - 1] ?? 0

    const surplus      = income - expenses - loanPayments
    const contribution = Math.max(0, surplus * Number(savings_pct))

    patrimony = patrimony * (1 + Number(investment_return)) + contribution

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
