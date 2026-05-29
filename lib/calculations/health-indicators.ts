import type { HealthStatus, MonthlyFlowRow, DashboardKpis, Insight, StructuredInsights } from '@/types/financial'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const pct = (v: number) => `${(v * 100).toFixed(0)}%`

export function savingsStatus(rate: number): HealthStatus {
  if (rate >= 0.20) return 'healthy'
  if (rate >= 0.10) return 'attention'
  return 'danger'
}

export function debtStatus(pct: number): HealthStatus {
  if (pct <= 0.30) return 'healthy'
  if (pct <= 0.50) return 'attention'
  return 'danger'
}

export function fixedExpensesStatus(pct: number): HealthStatus {
  if (pct <= 0.50) return 'healthy'
  if (pct <= 0.70) return 'attention'
  return 'danger'
}

export function generateStructuredInsights(kpis: Omit<DashboardKpis, 'insights' | 'structuredInsights'>): StructuredInsights {
  const diagnosis: Insight[] = []
  const nextSteps: Insight[] = []
  const savingsTips: Insight[] = []

  const avgMonthlyIncome = kpis.annualIncome / 12
  const avgMonthlyExpenses = kpis.annualExpenses / 12
  const avgMonthlySurplus = kpis.annualSurplus / 12
  const missingToTarget = avgMonthlyIncome * 0.20 - avgMonthlySurplus

  if (kpis.annualIncome === 0) {
    diagnosis.push({ text: 'Preencha a aba Entradas para começar a ver seus indicadores.', type: 'warning' })
    nextSteps.push({ text: 'Cadastre pelo menos sua renda principal — mesmo uma estimativa já ativa todos os cálculos.', type: 'action' })
    return { diagnosis, nextSteps, savingsTips }
  }

  // ── DIAGNÓSTICO ──────────────────────────────────────────────────
  // Poupança
  if (kpis.savingsRateStatus === 'healthy') {
    diagnosis.push({ text: `Taxa de poupança de ${pct(kpis.savingsRate)} — acima da meta de 20%. Excelente!`, type: 'success' })
  } else if (kpis.savingsRateStatus === 'attention') {
    diagnosis.push({ text: `Taxa de poupança de ${pct(kpis.savingsRate)} — abaixo dos 20% recomendados.`, type: 'warning' })
  } else {
    diagnosis.push({ text: `Taxa de poupança de ${pct(kpis.savingsRate)} — situação crítica. Gastos superam ou consomem quase toda a renda.`, type: 'danger' })
  }

  // Gastos fixos
  if (kpis.fixedExpensesStatus === 'healthy') {
    diagnosis.push({ text: `Gastos fixos em ${pct(kpis.fixedExpensesPct)} da renda — estrutura enxuta e saudável.`, type: 'success' })
  } else if (kpis.fixedExpensesStatus === 'attention') {
    diagnosis.push({ text: `Gastos fixos em ${pct(kpis.fixedExpensesPct)} da renda — acima do ideal de 50%.`, type: 'warning' })
  } else {
    diagnosis.push({ text: `Gastos fixos em ${pct(kpis.fixedExpensesPct)} da renda — muito pesados. Pouco espaço para variáveis e poupança.`, type: 'danger' })
  }

  // Gastos variáveis
  if (kpis.variableExpensesPct > 0.30) {
    diagnosis.push({ text: `Gastos variáveis em ${pct(kpis.variableExpensesPct)} da renda — acima dos 30% recomendados.`, type: 'warning' })
  } else if (kpis.variableExpensesPct > 0) {
    diagnosis.push({ text: `Gastos variáveis em ${pct(kpis.variableExpensesPct)} da renda — dentro do limite saudável.`, type: 'success' })
  }

  // Dívidas
  if (kpis.annualDebtPayments === 0) {
    diagnosis.push({ text: 'Sem dívidas ou parcelamentos ativos — ótima base para construir patrimônio.', type: 'success' })
  } else if (kpis.debtCommitmentStatus === 'danger') {
    diagnosis.push({ text: `${pct(kpis.debtCommitmentPct)} da renda comprometida com dívidas e cartões — zona de perigo (limite: 30%).`, type: 'danger' })
  } else if (kpis.debtCommitmentStatus === 'attention') {
    diagnosis.push({ text: `${pct(kpis.debtCommitmentPct)} da renda vai para dívidas e cartões — ainda controlável, mas próximo do limite.`, type: 'warning' })
  } else {
    diagnosis.push({ text: `Comprometimento de dívidas em ${pct(kpis.debtCommitmentPct)} — dentro do saudável (abaixo de 30%).`, type: 'success' })
  }

  // Projeção
  if (kpis.projectedPatrimony5y > 0) {
    diagnosis.push({ text: `Patrimônio projetado em 5 anos: ${brl(kpis.projectedPatrimony5y)} com as premissas atuais.`, type: kpis.savingsRateStatus === 'healthy' ? 'success' : 'tip' })
  }

  // ── PRÓXIMOS PASSOS ───────────────────────────────────────────────
  if (kpis.savingsRateStatus !== 'healthy' && missingToTarget > 0) {
    nextSteps.push({ text: `Faltam ${brl(missingToTarget)}/mês para atingir 20% de poupança. Identifique os 3 maiores gastos variáveis e tente cortar 20% de cada.`, type: 'action' })
  }

  if (kpis.debtCommitmentStatus === 'danger') {
    nextSteps.push({ text: 'Liste suas dívidas por taxa de juros e ataque a mais cara primeiro (método avalanche). Renegocie com o banco se a taxa estiver acima de 2% a.m.', type: 'action' })
  } else if (kpis.debtCommitmentStatus === 'attention') {
    nextSteps.push({ text: 'Evite assumir novas dívidas enquanto o comprometimento estiver acima de 30%. Foque em quitar as existentes.', type: 'action' })
  }

  if (kpis.creditCardMonthlyTotal > 0) {
    const cardPct = avgMonthlyIncome > 0 ? kpis.creditCardMonthlyTotal / avgMonthlyIncome : 0
    if (cardPct >= 0.15) {
      nextSteps.push({ text: `Parcelas de cartão consomem ${pct(cardPct)} da renda. Considere antecipar as parcelas com maior taxa de juros rotativos.`, type: 'action' })
    }
  }

  if (kpis.fixedExpensesStatus !== 'healthy') {
    nextSteps.push({ text: 'Revise contratos de planos, streaming e assinaturas — cancele o que não usa todo mês. Cada R$ 50 cortado em fixo libera R$ 600/ano.', type: 'action' })
  }

  if (kpis.savingsRateStatus === 'healthy' && kpis.projectedPatrimony5y > 0) {
    nextSteps.push({ text: 'Você está no caminho certo! Considere diversificar: Tesouro Selic para reserva de emergência + CDB/fundos para o médio prazo.', type: 'action' })
  }

  if (kpis.annualSurplus > 0 && kpis.savingsRateStatus !== 'healthy') {
    nextSteps.push({ text: `Você tem sobra de ${brl(avgMonthlySurplus)}/mês. Automatize a transferência para uma conta de investimento no dia do salário — antes de gastar.`, type: 'action' })
  }

  // ── DICAS DE ECONOMIA ────────────────────────────────────────────
  savingsTips.push({ text: 'Regra 50/30/20: destine 50% para necessidades fixas, 30% para variáveis e lazer, e 20% para poupança e investimentos.', type: 'tip' })

  if (kpis.variableExpensesPct > 0.20) {
    savingsTips.push({ text: 'Gastos com alimentação e lazer tendem a ser os mais fáceis de reduzir. Cozinhar em casa 3x a mais por semana pode economizar R$ 300–600/mês.', type: 'tip' })
  }

  savingsTips.push({ text: 'Pague-se primeiro: transfira para investimentos assim que receber o salário, antes de qualquer gasto. Adapte os gastos ao que sobrar.', type: 'tip' })

  if (kpis.creditCardMonthlyTotal > 0 || kpis.annualDebtPayments > 0) {
    savingsTips.push({ text: 'Nunca pague só o mínimo do cartão — os juros rotativos chegam a 400% ao ano. Quite sempre o total da fatura.', type: 'tip' })
  }

  if (kpis.savingsRateStatus !== 'healthy') {
    savingsTips.push({ text: 'Desafio dos 1%: aumente sua poupança em 1% da renda a cada mês. Em 6 meses você estará poupando 6% a mais sem sentir impacto drástico.', type: 'tip' })
  }

  savingsTips.push({ text: 'Mantenha uma reserva de emergência de 6 a 12 meses de despesas antes de investir em renda variável. Ela evita endividamento em imprevistos.', type: 'tip' })

  return { diagnosis, nextSteps, savingsTips }
}

export function generateInsights(kpis: Omit<DashboardKpis, 'insights' | 'structuredInsights'>): string[] {
  const { diagnosis, nextSteps, savingsTips } = generateStructuredInsights(kpis)
  return [...diagnosis, ...nextSteps, ...savingsTips].map((i) => i.text)
}

export function buildMonthlyFlow(
  incomeByMonth: Record<number, number>,
  fixedByMonth: Record<number, number>,
  variableByMonth: Record<number, number>,
  totalMonthlyLoanPayment: number,
): MonthlyFlowRow[] {
  const rows: MonthlyFlowRow[] = []
  let accumulated = 0

  for (let month = 1; month <= 12; month++) {
    const income = incomeByMonth[month] ?? 0
    const fixed = fixedByMonth[month] ?? 0
    const variable = variableByMonth[month] ?? 0
    const loanPayments = totalMonthlyLoanPayment
    const surplus = income - fixed - variable - loanPayments
    accumulated += surplus
    const savingsRate = income > 0 ? surplus / income : 0

    rows.push({
      month,
      income,
      fixed,
      variable,
      loanPayments,
      surplus,
      accumulated,
      savingsRate,
      status: savingsStatus(savingsRate),
    })
  }

  return rows
}
