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
  category VARCHAR(100) NOT NULL,
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
  type VARCHAR(100),
  original_value NUMERIC(12,2),
  current_balance NUMERIC(12,2),
  monthly_interest_rate NUMERIC(6,4),
  monthly_payment NUMERIC(12,2),
  remaining_installments INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Premissas da projeção 5 anos
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
  type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  UNIQUE(user_id, type, name)
);

-- Row Level Security
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- Policies: fiscal_years
CREATE POLICY "Users can manage own fiscal years"
  ON fiscal_years FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies: income_entries (via fiscal_year)
CREATE POLICY "Users can manage own income entries"
  ON income_entries FOR ALL
  USING (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  );

-- Policies: expense_entries
CREATE POLICY "Users can manage own expense entries"
  ON expense_entries FOR ALL
  USING (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  );

-- Policies: loans
CREATE POLICY "Users can manage own loans"
  ON loans FOR ALL
  USING (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  );

-- Policies: projection_assumptions
CREATE POLICY "Users can manage own projection assumptions"
  ON projection_assumptions FOR ALL
  USING (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    fiscal_year_id IN (
      SELECT id FROM fiscal_years WHERE user_id = auth.uid()
    )
  );

-- Policies: custom_categories
CREATE POLICY "Users can manage own categories"
  ON custom_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
