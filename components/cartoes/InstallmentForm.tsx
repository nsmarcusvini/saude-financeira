'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

interface InstallmentFormProps {
  creditCardId: string
  onAdded: () => void
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function InstallmentForm({ creditCardId, onAdded }: InstallmentFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const now = new Date()
  const [form, setForm] = useState({
    description: '',
    total_amount: '',
    installments_total: '',
    installments_remaining: '',
    start_month: String(now.getMonth() + 1),
    start_year: String(now.getFullYear()),
  })

  function calcInstallmentAmount(): number {
    const total = parseFloat(form.total_amount.replace(/\./g, '').replace(',', '.')) || 0
    const n = parseInt(form.installments_total) || 1
    return total / n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim() || !form.total_amount || !form.installments_total) return
    setLoading(true)

    const total_amount = parseFloat(form.total_amount.replace(/\./g, '').replace(',', '.')) || 0
    const installments_total = parseInt(form.installments_total)
    const installments_remaining = parseInt(form.installments_remaining) || installments_total
    const installment_amount = total_amount / installments_total

    await fetch('/api/parcelas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credit_card_id: creditCardId,
        description: form.description.trim(),
        total_amount,
        installment_amount,
        installments_total,
        installments_remaining,
        start_month: parseInt(form.start_month),
        start_year: parseInt(form.start_year),
      }),
    })

    setForm({
      description: '',
      total_amount: '',
      installments_total: '',
      installments_remaining: '',
      start_month: String(now.getMonth() + 1),
      start_year: String(now.getFullYear()),
    })
    setOpen(false)
    setLoading(false)
    onAdded()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar parcelamento
      </button>
    )
  }

  const installmentAmount = calcInstallmentAmount()

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Novo parcelamento</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <Label className="text-xs">Descrição *</Label>
          <Input
            className="h-7 text-xs mt-0.5"
            placeholder="Ex: iPhone 16 Pro"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Valor total (R$) *</Label>
            <Input
              className="h-7 text-xs mt-0.5"
              placeholder="0,00"
              value={form.total_amount}
              onChange={(e) => setForm((p) => ({ ...p, total_amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label className="text-xs">Total de parcelas *</Label>
            <Input
              className="h-7 text-xs mt-0.5"
              type="number"
              min={1}
              max={120}
              placeholder="12"
              value={form.installments_total}
              onChange={(e) => setForm((p) => ({ ...p, installments_total: e.target.value, installments_remaining: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label className="text-xs">Parcelas restantes</Label>
            <Input
              className="h-7 text-xs mt-0.5"
              type="number"
              min={1}
              max={120}
              placeholder={form.installments_total || '12'}
              value={form.installments_remaining}
              onChange={(e) => setForm((p) => ({ ...p, installments_remaining: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Mês de início</Label>
            <select
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs mt-0.5"
              value={form.start_month}
              onChange={(e) => setForm((p) => ({ ...p, start_month: e.target.value }))}
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
        {installmentAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Parcela mensal: <span className="font-semibold text-foreground">
              {installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </p>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="h-7 text-xs" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
