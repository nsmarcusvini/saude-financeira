# CLAUDE.md — Micro SaaS: Painel de Saúde Financeira

> Documento de referência para desenvolvimento do MVP. Baseado na lógica da planilha `Planilha_Saude_Financeira.xlsx`.
> Última atualização: 2026-05-28

---

## 1. VISÃO DO PRODUTO

### O que é
Um micro SaaS web para organização e monitoramento de saúde financeira pessoal — equivalente à planilha Excel, mas com UX moderna, persistência em nuvem, multi-dispositivo e insights automáticos.

### Proposta de valor
> "Você preenche uma vez por mês. O app te diz se você tá saudável financeiramente — e o que fazer para melhorar."

### Público-alvo (MVP)
- Assalariados CLT e PJ que querem controlar finanças
- Pessoas com dívidas que precisam visualizar comprometimento de renda
- Quem já usa planilha mas quer algo mais prático no celular

---

## 2. ANÁLISE DA LÓGICA DA PLANILHA (fonte de verdade do domínio)

### 2.1 Módulos identificados

| Aba | Função | Dados de entrada | Saída calculada |
|-----|--------|-----------------|-----------------|
| **Entradas** | Receitas mensais por categoria | 11 categorias × 12 meses | Total mensal + média anual |
| **Saídas** | Despesas fixas (14) + variáveis (14) por mês | 28 categorias × 12 meses | Subtotais fixas/variáveis + total |
| **Empréstimos** | Cadastro de dívidas ativas | Descrição, tipo, valor, taxa, parcela, parcelas restantes | Saldo devedor, juros, % comprometimento |
| **Dashboard** | Painel consolidado | Nenhum (lê das outras abas) | KPIs, fluxo mensal, insights |
| **Projeção 5 anos** | Simulação de longo prazo | 5 premissas editáveis | Patrimônio acumulado por ano |
| **Categorias** | Lookup/referência | Estático + editável | Dropdown nas outras abas |

### 2.2 Indicadores de saúde (regras de negócio críticas)

```
Taxa de Poupança = Sobra / Entradas
  ≥ 20% → Saudável (verde)
  10–20% → Atenção (amarelo)
  < 10%  → Revisar (vermelho)

% Comprometimento Dívidas = Total parcelas / Entradas mensais
  ≤ 30% → Saudável
  30–50% → Atenção
  > 50%  → Perigo

% Gastos Fixos = Subtotal fixas / Entradas
  ≤ 50% → Saudável
  50–70% → Atenção
  > 70%  → Pesado

% Gastos Variáveis = Subtotal variáveis / Entradas
  Ideal ≤ 30%

Reserva em meses = Patrimônio atual / Despesa mensal média
  Meta: 6 a 12 meses
```

### 2.3 Fórmulas-chave da Projeção 5 anos

```
Entradas_ano_n = Entradas_ano_1 × (1 + crescimento_real + inflação)^n
Saídas_ano_n   = Saídas_ano_1   × (1 + inflação)^n
Superávit_n    = Entradas_n − Saídas_n − Parcelas_n
Aporte_n       = Superávit_n × % poupado
Patrimônio_n   = Patrimônio_{n-1} × (1 + rentabilidade) + Aporte_n
```

Premissas padrão da planilha:
- Inflação: 4,5% a.a.
- Crescimento real da renda: 3% a.a.
- Rentabilidade dos investimentos: 10% a.a.
- % poupado do superávit: 80%

### 2.4 Insights automáticos (lógica textual)
```
IF entradas == 0 → "Comece preenchendo a aba Entradas"
IF dívidas == 0 → "Sem dívidas cadastradas"
IF gastos_fixos / entradas <= 0.5 → "Estrutura de custos fixos enxuta"
ALWAYS → "Mire em poupar pelo menos 20%..."
Patrimônio projetado 5 anos → calculado da aba Projeção
```

---

## 3. TECH STACK (MVP)

### Frontend
- **Next.js 14** (App Router) — SSR + client components
- **TypeScript** — tipagem forte no domínio financeiro
- **Tailwind CSS + shadcn/ui** — UI rápida e consistente
- **Recharts** — gráficos do dashboard (linha, barra, pizza)
- **React Hook Form + Zod** — formulários com validação

### Backend / Infraestrutura
- **Supabase** — PostgreSQL + Auth + Row Level Security
  - Auth: email/senha + Google OAuth
  - RLS: cada usuário vê apenas seus próprios dados
- **Next.js API Routes** — lógica de cálculo server-side
- **Vercel** — deploy (free tier suficiente para MVP)

### Libs utilitárias
- `date-fns` — manipulação de datas/anos
- `numeral` ou `Intl.NumberFormat` — formatação BRL
- `zustand` — state global leve (mês selecionado, ano ativo)

---

## 4. MODELO DE DADOS (Supabase / PostgreSQL)

```sql
-- Usuário (gerenciado pelo Supabase Auth)
-- auth.users → id, email

-- Ano fiscal do usuário
CREATE TABLE fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Entradas mensais
CREATE TABLE income_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID REFERENCES fiscal_years ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,  -- 'Salário CLT', 'Freelance / PJ', etc.
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(fiscal_year_id, category, month)
);

-- Saídas mensais
CREATE TABLE expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID REFERENCES fiscal_years ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('fixed', 'variable')),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(fiscal_year_id, category, month)
);

-- Empréstimos / dívidas
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID REFERENCES fiscal_years ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  type VARCHAR(100),               -- 'Financiamento Imóvel', 'Cartão', etc.
  original_value NUMERIC(12,2),
  current_balance NUMERIC(12,2),
  monthly_interest_rate NUMERIC(6,4),  -- ex: 0.0199 = 1.99%
  monthly_payment NUMERIC(12,2),
  remaining_installments INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Premissas da projeção 5 anos (por fiscal_year)
CREATE TABLE projection_assumptions (
  fiscal_year_id UUID PRIMARY KEY REFERENCES fiscal_years ON DELETE CASCADE,
  inflation_rate NUMERIC(5,4) DEFAULT 0.045,
  real_income_growth NUMERIC(5,4) DEFAULT 0.03,
  investment_return NUMERIC(5,4) DEFAULT 0.10,
  savings_pct NUMERIC(5,4) DEFAULT 0.80,
  initial_patrimony NUMERIC(12,2) DEFAULT 0
);

-- Categorias customizadas do usuário
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- 'income', 'fixed', 'variable', 'loan'
  name VARCHAR(100) NOT NULL,
  UNIQUE(user_id, type, name)
);
```

---

## 5. ARQUITETURA DE PÁGINAS (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx          → Login email + Google
│   └── signup/page.tsx         → Cadastro
├── (app)/
│   ├── layout.tsx              → Sidebar + Header + Auth guard
│   ├── dashboard/page.tsx      → /dashboard — KPIs + fluxo mensal
│   ├── entradas/page.tsx       → /entradas — tabela de receitas
│   ├── saidas/page.tsx         → /saidas — tabela de despesas
│   ├── emprestimos/page.tsx    → /emprestimos — cadastro de dívidas
│   ├── projecao/page.tsx       → /projecao — simulação 5 anos
│   └── configuracoes/page.tsx  → /configuracoes — categorias + preferências
├── api/
│   ├── dashboard/route.ts      → GET: calcula todos os KPIs
│   ├── entries/route.ts        → GET/POST: entradas
│   ├── expenses/route.ts       → GET/POST: saídas
│   ├── loans/route.ts          → GET/POST/DELETE: empréstimos
│   └── projection/route.ts     → GET: calcula projeção 5 anos
└── page.tsx                    → Landing page / redirect
```

---

## 6. COMPONENTES CORE

```
components/
├── dashboard/
│   ├── KpiCard.tsx             → Card com valor, label e semáforo de status
│   ├── MonthlyFlowTable.tsx    → Tabela Jan-Dez com Sobra e % Poupança
│   ├── InsightsList.tsx        → Insights automáticos (regras de negócio)
│   ├── FlowChart.tsx           → Gráfico de barras Entradas vs Saídas
│   └── SavingsRateGauge.tsx    → Medidor circular da taxa de poupança
├── entries/
│   ├── IncomeTable.tsx         → Tabela editável de entradas (12 meses)
│   └── ExpenseTable.tsx        → Tabela editável de saídas fixas + variáveis
├── loans/
│   ├── LoanForm.tsx            → Formulário de cadastro de dívida
│   ├── LoanCard.tsx            → Card de dívida com cálculos
│   └── DebtHealthBar.tsx       → Barra de comprometimento de renda
├── projection/
│   ├── AssumptionsForm.tsx     → 5 inputs de premissas editáveis
│   └── ProjectionChart.tsx     → Gráfico linha patrimônio 5 anos
├── shared/
│   ├── MonthSelector.tsx       → Seletor de mês ativo
│   ├── YearSelector.tsx        → Troca de ano fiscal
│   ├── CurrencyInput.tsx       → Input com máscara BRL
│   ├── StatusBadge.tsx         → Badge verde/amarelo/vermelho
│   └── InlineEdit.tsx          → Click-to-edit em células da tabela
```

---

## 7. LÓGICA DE CÁLCULO (server-side, `/api/dashboard`)

```typescript
// Tipos
type HealthStatus = 'healthy' | 'attention' | 'danger';

interface DashboardKpis {
  annualIncome: number;
  annualExpenses: number;
  annualDebtPayments: number;
  annualSurplus: number;
  savingsRate: number;
  savingsRateStatus: HealthStatus;
  debtCommitmentPct: number;
  debtCommitmentStatus: HealthStatus;
  fixedExpensesPct: number;
  fixedExpensesStatus: HealthStatus;
  variableExpensesPct: number;
  reserveMonths: number;
  monthlyFlow: MonthlyFlowRow[];
  insights: string[];
  projectedPatrimony5y: number;
}

// Regras de status
function savingsStatus(rate: number): HealthStatus {
  if (rate >= 0.20) return 'healthy';
  if (rate >= 0.10) return 'attention';
  return 'danger';
}

function debtStatus(pct: number): HealthStatus {
  if (pct <= 0.30) return 'healthy';
  if (pct <= 0.50) return 'attention';
  return 'danger';
}

function fixedExpensesStatus(pct: number): HealthStatus {
  if (pct <= 0.50) return 'healthy';
  if (pct <= 0.70) return 'attention';
  return 'danger';
}
```

---

## 8. TODO — MVP (ordem de execução)

### FASE 1 — Fundação (Semana 1)
- [ ] **T01** Criar projeto Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] **T02** Configurar Supabase: criar projeto, rodar migrations SQL do item 4
- [ ] **T03** Configurar Row Level Security (RLS) em todas as tabelas
- [ ] **T04** Implementar Auth: login email/senha + Google OAuth via Supabase
- [ ] **T05** Criar layout base: sidebar com navegação entre módulos
- [ ] **T06** Criar `YearSelector` — criar/trocar ano fiscal (padrão: ano atual)
- [ ] **T07** Seed de categorias padrão na criação da conta (mesmas da planilha)ls

### FASE 2 — Módulo de Entradas (Semana 1-2)
- [ ] **T08** Criar tabela `income_entries` no Supabase
- [ ] **T09** API Route `GET/POST /api/entries` com upsert por categoria+mês
- [ ] **T10** Componente `IncomeTable` — grid 11 linhas × 12 meses, click-to-edit
- [ ] **T11** `CurrencyInput` com máscara BRL (ex: `R$ 5.000,00`)
- [ ] **T12** Linha "TOTAL ENTRADAS" calculada em tempo real no cliente
- [ ] **T13** Persistência automática ao sair da célula (debounce 500ms + blur)

### FASE 3 — Módulo de Saídas (Semana 2)
- [ ] **T14** API Route `GET/POST /api/expenses`
- [ ] **T15** Componente `ExpenseTable` — duas seções: Fixas (14) + Variáveis (14)
- [ ] **T16** Subtotal por seção + Total Saídas no rodapé da tabela
- [ ] **T17** Highlight visual: célula vermelha se variável > média dos últimos 3 meses

### FASE 4 — Módulo de Empréstimos (Semana 2)
- [ ] **T18** API Route `GET/POST/DELETE /api/loans`
- [ ] **T19** Componente `LoanForm` com campos: descrição, tipo (dropdown), valor original, saldo, taxa a.m.%, parcela, nº parcelas restantes
- [ ] **T20** Cálculo automático: Total a pagar = parcela × parcelas restantes; Juros = Total a pagar − Saldo devedor
- [ ] **T21** `DebtHealthBar` — barra visual de comprometimento de renda
- [ ] **T22** Lista de empréstimos com `LoanCard` + botão de exclusão

### FASE 5 — Dashboard (Semana 3)
- [ ] **T23** API Route `GET /api/dashboard` — consolida todos os KPIs
- [ ] **T24** Implementar todas as fórmulas de saúde (item 2.2) server-side
- [ ] **T25** `KpiCard` com valor formatado + `StatusBadge` colorido
- [ ] **T26** `MonthlyFlowTable` — Jan a Dez com Entradas, Saídas, Parcelas, Sobra, Acumulado, % Poupança, Status
- [ ] **T27** `FlowChart` — gráfico de barras agrupadas (Recharts)
- [ ] **T28** `InsightsList` — implementar as 5 regras de insights automáticos
- [ ] **T29** Card "Patrimônio projetado em 5 anos" (preview simples)

### FASE 6 — Projeção 5 Anos (Semana 3)
- [ ] **T30** API Route `GET /api/projection` com fórmulas do item 2.3
- [ ] **T31** `AssumptionsForm` — 5 sliders/inputs editáveis com tooltips explicativos
- [ ] **T32** `ProjectionChart` — gráfico de linha Patrimônio Acumulado por ano
- [ ] **T33** Tabela resumo: Entradas, Saídas, Superávit, Aporte, Patrimônio por ano
- [ ] **T34** Persistir premissas na tabela `projection_assumptions`

### FASE 7 — Configurações & UX (Semana 4)
- [ ] **T35** Página `/configuracoes` — gerenciar categorias customizadas (add/remove)
- [ ] **T36** `MonthSelector` no header — filtrar dashboard por mês específico
- [ ] **T37** Responsividade mobile: tabelas com scroll horizontal, cards empilhados
- [ ] **T38** Loading skeletons em todas as tabelas e cards
- [ ] **T39** Toast de confirmação ao salvar dados
- [ ] **T40** Empty states com CTA ("Adicione sua primeira entrada →")

### FASE 8 — Qualidade & Launch (Semana 4)
- [ ] **T41** Testes unitários das funções de cálculo (Jest)
- [ ] **T42** Variáveis de ambiente: `.env.local` + Vercel env vars
- [ ] **T43** Deploy no Vercel + domínio customizado
- [ ] **T44** Landing page mínima com CTA de cadastro
- [ ] **T45** Analytics básico (Vercel Analytics ou Plausible)

---

## 9. FORA DO ESCOPO DO MVP

Estas features NÃO entram no MVP — registradas para V2:

- Importação de extrato bancário (OFX/CSV)
- Open Finance / integração com bancos
- Notificações por email/push
- Modo família (múltiplos usuários no mesmo orçamento)
- Metas financeiras com progresso
- Categorização automática com IA
- App mobile nativo
- Plano pago / paywall / Stripe

---

## 10. ESTRUTURA DE ARQUIVOS DO PROJETO

```
financial-health-saas/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (app)/layout.tsx
│   ├── (app)/dashboard/page.tsx
│   ├── (app)/entradas/page.tsx
│   ├── (app)/saidas/page.tsx
│   ├── (app)/emprestimos/page.tsx
│   ├── (app)/projecao/page.tsx
│   ├── (app)/configuracoes/page.tsx
│   └── api/
│       ├── dashboard/route.ts
│       ├── entries/route.ts
│       ├── expenses/route.ts
│       ├── loans/route.ts
│       └── projection/route.ts
├── components/
│   ├── dashboard/...
│   ├── entries/...
│   ├── loans/...
│   ├── projection/...
│   └── shared/...
├── lib/
│   ├── supabase/
│   │   ├── client.ts           → createBrowserClient
│   │   └── server.ts           → createServerClient
│   ├── calculations/
│   │   ├── health-indicators.ts  → todas as fórmulas de KPI
│   │   ├── loan-calculator.ts    → cálculos de empréstimo
│   │   └── projection.ts         → projeção 5 anos
│   ├── constants/
│   │   └── categories.ts         → categorias padrão (da planilha)
│   └── utils/
│       ├── currency.ts           → formatação BRL
│       └── dates.ts              → meses, anos
├── types/
│   └── financial.ts              → todos os tipos TypeScript do domínio
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local.example
├── CLAUDE.md                     → este arquivo
└── package.json
```

---

## 11. VARIÁVEIS DE AMBIENTE

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # apenas server-side
```

---

## 12. COMANDOS ÚTEIS

```bash
# Iniciar projeto
npx create-next-app@latest financial-health --typescript --tailwind --app

# Instalar dependências principais
npm install @supabase/supabase-js @supabase/ssr
npm install @shadcn/ui recharts react-hook-form zod zustand
npm install date-fns

# Inicializar shadcn
npx shadcn@latest init

# Rodar localmente
npm run dev

# Deploy
vercel --prod
```

---

## 13. CRITÉRIOS DE ACEITE DO MVP

O MVP está pronto quando:

1. ✅ Usuário consegue criar conta e logar
2. ✅ Usuário consegue preencher entradas mensais (12 meses)
3. ✅ Usuário consegue preencher saídas fixas e variáveis (12 meses)
4. ✅ Usuário consegue cadastrar dívidas/empréstimos
5. ✅ Dashboard mostra todos os 5 KPIs com semáforo de status
6. ✅ Fluxo mensal Jan-Dez aparece completo no dashboard
7. ✅ Insights automáticos são exibidos baseados nos dados
8. ✅ Projeção de patrimônio em 5 anos é calculada e exibida
9. ✅ Dados persistem entre sessões e dispositivos
10. ✅ Funciona no mobile (responsivo)

---

## 14. NOTAS PARA O CLAUDE (IA)

Quando for implementar qualquer módulo deste projeto:

1. **Sempre referencie este arquivo** para entender as regras de negócio antes de codificar
2. **As fórmulas do item 2.2 e 2.3 são a fonte de verdade** — não invente lógica própria
3. **Upsert, não insert** — os dados de entradas/saídas são editados no mesmo registro (categoria + mês + fiscal_year_id)
4. **RLS é obrigatório** — nunca exponha dados de um usuário para outro
5. **Formatação BRL** — todos os valores monetários são `R$ X.XXX,XX` (ponto milhar, vírgula decimal)
6. **O ano fiscal** é o contexto global — quase toda query precisa filtrar por `fiscal_year_id`
7. **Cálculos financeiros server-side** — não faça cálculos de KPI no cliente para evitar inconsistências
8. **Categorias padrão** são fixas (da planilha) mas o usuário pode adicionar mais via `/configuracoes`
