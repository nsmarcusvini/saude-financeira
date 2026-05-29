export type HealthStatus = 'healthy' | 'attention' | 'danger'

export interface FiscalYear {
  id: string
  user_id: string
  year: number
  created_at: string
}

export interface IncomeEntry {
  id: string
  fiscal_year_id: string
  category: string
  month: number
  amount: number
}

export interface ExpenseEntry {
  id: string
  fiscal_year_id: string
  category: string
  type: 'fixed' | 'variable'
  month: number
  amount: number
}

export interface Loan {
  id: string
  fiscal_year_id: string
  description: string
  type: string
  original_value: number
  current_balance: number
  monthly_interest_rate: number
  monthly_payment: number
  remaining_installments: number
  start_month: number | null
  start_year: number | null
  created_at: string
}

export interface ProjectionAssumptions {
  fiscal_year_id: string
  inflation_rate: number
  real_income_growth: number
  investment_return: number
  savings_pct: number
  initial_patrimony: number
}

export interface CustomCategory {
  id: string
  user_id: string
  type: 'income' | 'fixed' | 'variable' | 'loan'
  name: string
}

export interface MonthlyFlowRow {
  month: number
  income: number
  fixed: number
  variable: number
  loanPayments: number
  surplus: number
  accumulated: number
  savingsRate: number
  status: HealthStatus
}

export type InsightType = 'success' | 'warning' | 'danger' | 'tip' | 'action'

export interface Insight {
  text: string
  type: InsightType
}

export interface StructuredInsights {
  diagnosis: Insight[]
  nextSteps: Insight[]
  savingsTips: Insight[]
}

export interface ForecastMonth {
  month: number        // 1-12
  isCurrent: boolean
  income: number
  expenses: number     // fixas + variáveis
  loans: number        // parcelas de empréstimo
  card: number         // fatura real (mês atual) ou parcelas previstas (futuro)
  total: number        // expenses + loans + card
  surplus: number      // income - total
}

export interface DashboardKpis {
  annualIncome: number
  annualExpenses: number
  annualDebtPayments: number
  annualSurplus: number
  savingsRate: number
  savingsRateStatus: HealthStatus
  debtCommitmentPct: number
  debtCommitmentStatus: HealthStatus
  fixedExpensesPct: number
  fixedExpensesStatus: HealthStatus
  variableExpensesPct: number
  reserveMonths: number
  monthlyFlow: MonthlyFlowRow[]
  forecast: ForecastMonth[]
  insights: string[]
  structuredInsights: StructuredInsights
  projectedPatrimony5y: number
  creditCardMonthlyTotal: number
}

export interface CreditCardInstallment {
  id: string
  credit_card_id: string
  description: string
  total_amount: number
  installment_amount: number
  installments_total: number
  installments_remaining: number
  start_month: number
  start_year: number
  created_at: string
}

export interface CreditCardEntry {
  id: string
  fiscal_year_id: string
  name: string
  operator: string | null
  credit_limit: number
  current_balance: number
  due_day: number | null
  closing_day: number | null
  annual_fee: number
  monthly_interest_rate: number
  created_at: string
}

export interface ProjectionYear {
  year: number
  income: number
  expenses: number
  surplus: number
  contribution: number
  patrimony: number
}
