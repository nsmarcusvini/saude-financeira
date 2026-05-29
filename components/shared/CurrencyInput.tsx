'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function CurrencyInput({ value, onChange, className, placeholder = 'R$ 0,00', disabled }: CurrencyInputProps) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function displayValue(): string {
    if (value === 0) return ''
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  function handleFocus() {
    setEditing(true)
    setRaw(value > 0 ? String(value).replace('.', ',') : '')
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function handleBlur() {
    setEditing(false)
    const cleaned = raw.replace(/[^\d,]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    onChange(isNaN(parsed) ? 0 : parsed)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/[^\d,]/g, '')
    setRaw(v)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={editing ? raw : displayValue()}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={cn(
        'h-9 w-full rounded-md border-0 bg-transparent px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring',
        className,
      )}
    />
  )
}
