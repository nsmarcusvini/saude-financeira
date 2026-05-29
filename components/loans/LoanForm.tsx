'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LOAN_TYPES } from '@/lib/constants/categories'
import { loanCurrentBalance, totalLoanCost, totalLoanInterest } from '@/lib/calculations/loan-calculator'
import { formatBRL } from '@/lib/utils/currency'

interface LoanFormProps {
  fiscalYearId: string
  onAdded: () => void
}

const _now = new Date()
const empty = {
  description: '',
  type: '',
  original_value: '',
  monthly_interest_rate: '0',
  monthly_payment: '',
  remaining_installments: '',
  start_month: String(_now.getMonth() + 1),
  start_year: String(_now.getFullYear()),
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function LoanForm({ fiscalYearId, onAdded }: LoanFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(field: keyof typeof empty, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.type || !form.monthly_payment || !form.remaining_installments) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    const rate = (Number(form.monthly_interest_rate) || 0) / 100
    const payment = Number(form.monthly_payment)
    const installments = Number(form.remaining_installments)
    const computedBalance = loanCurrentBalance({
      monthly_interest_rate: rate,
      monthly_payment: payment,
      remaining_installments: installments,
    } as never)
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiscal_year_id: fiscalYearId,
        description: form.description,
        type: form.type,
        original_value: Number(form.original_value) || 0,
        current_balance: computedBalance,
        monthly_interest_rate: rate,
        monthly_payment: payment,
        remaining_installments: installments,
        start_month: Number(form.start_month),
        start_year: Number(form.start_year),
      }),
    })
    setForm(empty)
    setOpen(false)
    setSaving(false)
    onAdded()
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Adicionar empréstimo</Button>
  }

  const payment = Number(form.monthly_payment)
  const installments = Number(form.remaining_installments)
  const preview = payment > 0 && installments > 0
    ? (() => {
        const loan = {
          monthly_interest_rate: (Number(form.monthly_interest_rate) || 0) / 100,
          monthly_payment: payment,
          remaining_installments: installments,
          current_balance: 0,
        } as never
        return {
          total: totalLoanCost(loan),
          balance: loanCurrentBalance(loan),
          interest: totalLoanInterest(loan),
        }
      })()
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Novo Empréstimo / Dívida</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Descrição *</Label>
            <Input placeholder="Ex: Financiamento Honda Fit" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Taxa a.m. (%)</Label>
            <Input type="number" step="0.01" placeholder="1.99" value={form.monthly_interest_rate} onChange={(e) => set('monthly_interest_rate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor Original (R$)</Label>
            <Input type="number" step="0.01" placeholder="30000" value={form.original_value} onChange={(e) => set('original_value', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Parcela Mensal (R$) *</Label>
            <Input type="number" step="0.01" placeholder="650" value={form.monthly_payment} onChange={(e) => set('monthly_payment', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Parcelas Restantes *</Label>
            <Input type="number" placeholder="36" value={form.remaining_installments} onChange={(e) => set('remaining_installments', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mês de Referência</Label>
            <Select value={form.start_month} onValueChange={(v) => set('start_month', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ano de Referência</Label>
            <Input type="number" min={2020} max={2099} value={form.start_year} onChange={(e) => set('start_year', e.target.value)} />
          </div>
          <p className="col-span-2 text-[11px] text-muted-foreground -mt-1">
            As "parcelas restantes" valem para o mês/ano de referência. A partir daí, o sistema decrementa automaticamente a cada mês.
          </p>

          {preview && (
            <div className="col-span-2 grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total a pagar</p>
                <p className="text-sm font-semibold tabular-nums text-orange-700">{formatBRL(preview.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo devedor</p>
                <p className="text-sm font-semibold tabular-nums">{formatBRL(preview.balance)}</p>
                <p className="text-[9px] text-muted-foreground">para quitar hoje</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Juros futuros</p>
                <p className="text-sm font-semibold tabular-nums text-red-600">{formatBRL(preview.interest)}</p>
              </div>
            </div>
          )}

          {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
          <div className="col-span-2 flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            <Button type="button" variant="outline" onClick={() => { setForm(empty); setOpen(false) }}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
