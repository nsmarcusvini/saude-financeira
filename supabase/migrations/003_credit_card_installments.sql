CREATE TABLE credit_card_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES credit_cards ON DELETE CASCADE NOT NULL,
  description VARCHAR(255) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installment_amount NUMERIC(12,2) NOT NULL,
  installments_total INT NOT NULL,
  installments_remaining INT NOT NULL,
  start_month INT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_card_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own installments"
  ON credit_card_installments FOR ALL
  USING (
    credit_card_id IN (
      SELECT id FROM credit_cards
      WHERE fiscal_year_id IN (
        SELECT id FROM fiscal_years WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    credit_card_id IN (
      SELECT id FROM credit_cards
      WHERE fiscal_year_id IN (
        SELECT id FROM fiscal_years WHERE user_id = auth.uid()
      )
    )
  );
