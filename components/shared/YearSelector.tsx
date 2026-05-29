'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getYearRange } from '@/lib/utils/dates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function YearSelector() {
  const { selectedYear, setSelectedYear } = useAppStore()
  const years = getYearRange()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Evita mismatch de hidratação: o ano deriva de new Date(), que pode
  // divergir entre servidor e cliente. Renderiza placeholder até montar.
  if (!mounted) {
    return <div className="w-28 h-9 rounded-md border border-border/10 bg-transparent" />
  }

  return (
    <Select
      value={String(selectedYear)}
      onValueChange={(v) => setSelectedYear(Number(v))}
    >
      <SelectTrigger className="w-28 h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
