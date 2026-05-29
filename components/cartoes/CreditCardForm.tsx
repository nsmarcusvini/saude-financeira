'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

interface CreditCardFormProps {
  fiscalYearId: string
  onAdded: () => void
}

const OPERATORS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'Inter', 'C6 Bank', 'BTG', 'XP', 'Outro']

export function CreditCardForm({ fiscalYearId, onAdded }: CreditCardFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    operator: '',
    credit_limit: '',
    current_balance: '',
    due_day: '',
    closing_day: '',
    annual_fee: '',
    monthly_interest_rate: '',
  })

  function parseBRL(value: string): number {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)

    await fetch('/api/cartoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiscal_year_id: fiscalYearId,
        name: form.name.trim(),
        operator: form.operator || null,
        credit_limit: parseBRL(form.credit_limit),
        current_balance: parseBRL(form.current_balance),
        due_day: form.due_day ? parseInt(form.due_day) : null,
        closing_day: form.closing_day ? parseInt(form.closing_day) : null,
        annual_fee: parseBRL(form.annual_fee),
        monthly_interest_rate: parseFloat(form.monthly_interest_rate.replace(',', '.')) / 100 || 0,
      }),
    })

    setForm({ name: '', operator: '', credit_limit: '', current_balance: '', due_day: '', closing_day: '', annual_fee: '', monthly_interest_rate: '' })
    setOpen(false)
    setLoading(false)
    onAdded()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Plus className="h-4 w-4" />
        Adicionar cartão
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Novo Cartão de Crédito</CardTitle>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do cartão *</Label>
              <Input
                placeholder="Ex: Nubank Roxinho"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Operadora</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.operator}
                onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Limite de crédito (R$)</Label>
              <Input
                placeholder="0,00"
                value={form.credit_limit}
                onChange={(e) => setForm((p) => ({ ...p, credit_limit: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fatura atual (R$)</Label>
              <Input
                placeholder="0,00"
                value={form.current_balance}
                onChange={(e) => setForm((p) => ({ ...p, current_balance: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia do vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="Ex: 10"
                value={form.due_day}
                onChange={(e) => setForm((p) => ({ ...p, due_day: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia do fechamento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="Ex: 3"
                value={form.closing_day}
                onChange={(e) => setForm((p) => ({ ...p, closing_day: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Anuidade (R$)</Label>
              <Input
                placeholder="0,00"
                value={form.annual_fee}
                onChange={(e) => setForm((p) => ({ ...p, annual_fee: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Juros rotativos (% a.m.)</Label>
              <Input
                placeholder="Ex: 15,99"
                value={form.monthly_interest_rate}
                onChange={(e) => setForm((p) => ({ ...p, monthly_interest_rate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar cartão'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
