'use client'

import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatBRL } from '@/lib/utils/currency'
import type { CreditCardInstallment } from '@/types/financial'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface InstallmentListProps {
  installments: CreditCardInstallment[]
  onDelete: (id: string) => void
  onUpdated: (updated: CreditCardInstallment) => void
}

interface EditForm {
  description: string
  total_amount: string
  installments_total: string
  installments_remaining: string
  start_month: string
  start_year: string
}

function toEditForm(inst: CreditCardInstallment): EditForm {
  return {
    description: inst.description,
    total_amount: inst.total_amount.toString().replace('.', ','),
    installments_total: String(inst.installments_total),
    installments_remaining: String(inst.installments_remaining),
    start_month: String(inst.start_month),
    start_year: String(inst.start_year),
  }
}

export function InstallmentList({ installments, onDelete, onUpdated }: InstallmentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(inst: CreditCardInstallment) {
    setEditingId(inst.id)
    setEditForm(toEditForm(inst))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function confirmEdit(id: string) {
    if (!editForm) return
    setSaving(true)
    const total_amount = parseFloat(editForm.total_amount.replace(/\./g, '').replace(',', '.')) || 0
    const installments_total = parseInt(editForm.installments_total) || 1
    const installments_remaining = parseInt(editForm.installments_remaining) || 1
    const installment_amount = total_amount / installments_total

    const body = {
      description: editForm.description.trim(),
      total_amount,
      installment_amount,
      installments_total,
      installments_remaining,
      start_month: parseInt(editForm.start_month),
      start_year: parseInt(editForm.start_year),
    }

    const res = await fetch(`/api/parcelas?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const updated = await res.json()
      onUpdated(updated)
    }
    setSaving(false)
    cancelEdit()
  }

  if (installments.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum parcelamento cadastrado.</p>
  }

  return (
    <ul className="space-y-2">
      {installments.map((inst) => {
        const paid = inst.installments_total - inst.installments_remaining
        const progress = (paid / inst.installments_total) * 100
        const totalRemaining = inst.installment_amount * inst.installments_remaining
        const isEditing = editingId === inst.id

        if (isEditing && editForm) {
          const previewTotal = parseFloat(editForm.total_amount.replace(/\./g, '').replace(',', '.')) || 0
          const previewN = parseInt(editForm.installments_total) || 1
          const previewInstallment = previewTotal / previewN

          return (
            <li key={inst.id} className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">Descrição</label>
                  <Input
                    className="h-7 text-xs mt-0.5"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => p ? { ...p, description: e.target.value } : p)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Valor total (R$)</label>
                  <Input
                    className="h-7 text-xs mt-0.5"
                    value={editForm.total_amount}
                    onChange={(e) => setEditForm((p) => p ? { ...p, total_amount: e.target.value } : p)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Total de parcelas</label>
                  <Input
                    className="h-7 text-xs mt-0.5"
                    type="number"
                    min={1}
                    value={editForm.installments_total}
                    onChange={(e) => setEditForm((p) => p ? { ...p, installments_total: e.target.value } : p)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Parcelas restantes</label>
                  <Input
                    className="h-7 text-xs mt-0.5"
                    type="number"
                    min={1}
                    value={editForm.installments_remaining}
                    onChange={(e) => setEditForm((p) => p ? { ...p, installments_remaining: e.target.value } : p)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Mês de início</label>
                  <select
                    className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs mt-0.5"
                    value={editForm.start_month}
                    onChange={(e) => setEditForm((p) => p ? { ...p, start_month: e.target.value } : p)}
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Ano de início</label>
                  <Input
                    className="h-7 text-xs mt-0.5"
                    type="number"
                    min={2020}
                    max={2099}
                    value={editForm.start_year}
                    onChange={(e) => setEditForm((p) => p ? { ...p, start_year: e.target.value } : p)}
                  />
                </div>
              </div>

              {previewInstallment > 0 && (
                <p className="text-xs text-muted-foreground">
                  Parcela mensal:{' '}
                  <span className="font-semibold text-foreground">
                    {formatBRL(previewInstallment)}
                  </span>
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={() => confirmEdit(inst.id)}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </li>
          )
        }

        return (
          <li key={inst.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{inst.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Início: <span className="font-medium">{MONTHS[inst.start_month - 1]}/{inst.start_year}</span>
                  {' · '}
                  <span className="font-medium">{inst.installments_remaining}/{inst.installments_total}</span> parcelas restantes
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold tabular-nums text-rose-600">
                  {formatBRL(inst.installment_amount)}<span className="text-muted-foreground font-normal">/mês</span>
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                  {formatBRL(totalRemaining)} restante
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(inst)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(inst.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{paid} {paid === 1 ? 'paga' : 'pagas'}</span>
                <span>{inst.installments_remaining} {inst.installments_remaining === 1 ? 'restante' : 'restantes'}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
