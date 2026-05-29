'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils/currency'
import { Check, CreditCard, XCircle, Layers, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react'
import type { PaymentRefType, PaymentStatus } from '@/types/financial'

interface PaymentFlowProps {
  fiscalYearId: string
  refType: PaymentRefType
  refId: string
  label: string
  amountDue: number
  competenceMonth: number
  competenceYear: number
  currentStatus?: PaymentStatus | null
  /** id do registro em payment_events (necessário para poder desfazer) */
  currentPaymentId?: string | null
  onDone?: () => void
  /** 'badge' mostra o status atual + editar; 'button' mostra só o botão de registrar */
  variant?: 'badge' | 'button'
}

const STATUS_META: Record<PaymentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  paid:        { label: 'Pago',      cls: 'text-green-700 bg-green-500/10',  icon: <CheckCircle2 className="h-3 w-3" /> },
  installment: { label: 'Parcelado', cls: 'text-amber-700 bg-amber-500/10',  icon: <Layers className="h-3 w-3" /> },
  unpaid:      { label: 'Em aberto', cls: 'text-red-700 bg-red-500/10',      icon: <AlertCircle className="h-3 w-3" /> },
}

export function PaymentFlow({
  fiscalYearId, refType, refId, label, amountDue,
  competenceMonth, competenceYear, currentStatus, currentPaymentId, onDone, variant = 'button',
}: PaymentFlowProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function register(status: PaymentStatus) {
    setSaving(true)
    await fetch('/api/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiscal_year_id: fiscalYearId,
        ref_type: refType,
        ref_id: refId,
        competence_month: competenceMonth,
        competence_year: competenceYear,
        status,
        amount: status === 'paid' ? amountDue : 0,
      }),
    })
    setSaving(false)
    setOpen(false)
    onDone?.()
  }

  async function unregister() {
    if (!currentPaymentId) return
    setSaving(true)
    await fetch(`/api/pagamentos?id=${currentPaymentId}`, { method: 'DELETE' })
    setSaving(false)
    setOpen(false)
    onDone?.()
  }

  const options: { status: PaymentStatus; label: string; desc: string; icon: React.ReactNode; cls: string }[] =
    refType === 'card'
      ? [
          { status: 'paid',        label: 'Paguei integral',  desc: 'Quitei a fatura toda',                icon: <CheckCircle2 className="h-4 w-4" />, cls: 'hover:border-green-500/50 hover:bg-green-500/5' },
          { status: 'installment', label: 'Parcelei a fatura', desc: 'Dividi o pagamento em parcelas',      icon: <Layers className="h-4 w-4" />,       cls: 'hover:border-amber-500/50 hover:bg-amber-500/5' },
          { status: 'unpaid',      label: 'Não paguei',        desc: 'Fatura em aberto / atrasada',         icon: <XCircle className="h-4 w-4" />,      cls: 'hover:border-red-500/50 hover:bg-red-500/5' },
        ]
      : [
          { status: 'paid',   label: 'Paguei a parcela', desc: 'Parcela do mês quitada',     icon: <CheckCircle2 className="h-4 w-4" />, cls: 'hover:border-green-500/50 hover:bg-green-500/5' },
          { status: 'unpaid', label: 'Não paguei',       desc: 'Parcela em aberto / atrasada', icon: <XCircle className="h-4 w-4" />,    cls: 'hover:border-red-500/50 hover:bg-red-500/5' },
        ]

  return (
    <>
      {variant === 'badge' && currentStatus ? (
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${STATUS_META[currentStatus].cls}`}
          title="Alterar registro de pagamento"
        >
          {STATUS_META[currentStatus].icon}
          {STATUS_META[currentStatus].label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <Clock className="h-3 w-3" />
          Registrar pagamento
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Vencimento de {String(competenceMonth).padStart(2, '0')}/{competenceYear} · {formatBRL(amountDue)}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Como foi o pagamento deste mês?</p>

            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.status}
                  disabled={saving}
                  onClick={() => register(o.status)}
                  className={`w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors disabled:opacity-50 ${o.cls} ${currentStatus === o.status ? 'ring-1 ring-primary' : ''}`}
                >
                  <span className="text-muted-foreground">{o.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.desc}</span>
                  </span>
                  {currentStatus === o.status && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            {currentPaymentId && (
              <button
                disabled={saving}
                onClick={unregister}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-red-300 dark:border-red-800 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Desfazer registro
              </button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </>
  )
}
