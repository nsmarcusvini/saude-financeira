CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID REFERENCES fiscal_years ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  operator VARCHAR(100),
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  due_day INT CHECK (due_day BETWEEN 1 AND 31),
  closing_day INT CHECK (closing_day BETWEEN 1 AND 31),
  annual_fee NUMERIC(10,2) DEFAULT 0,
  monthly_interest_rate NUMERIC(6,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credit cards"
  ON credit_cards FOR ALL
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
