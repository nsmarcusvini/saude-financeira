'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function useFiscalYear() {
  const { selectedYear, fiscalYearId, setFiscalYearId } = useAppStore()

  useEffect(() => {
    async function ensureFiscalYear() {
      const res = await fetch(`/api/fiscal-years`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: selectedYear }) })
      if (res.ok) {
        const data = await res.json()
        setFiscalYearId(data.id)
      }
    }
    ensureFiscalYear()
  }, [selectedYear, setFiscalYearId])

  return fiscalYearId
}
