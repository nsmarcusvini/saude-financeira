'use client'

import { create } from 'zustand'
import { currentYear } from '@/lib/utils/dates'

interface AppState {
  selectedYear: number
  selectedMonth: number | null
  fiscalYearId: string | null
  setSelectedYear: (year: number) => void
  setSelectedMonth: (month: number | null) => void
  setFiscalYearId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedYear: currentYear(),
  selectedMonth: null,
  fiscalYearId: null,
  setSelectedYear: (year) => set({ selectedYear: year, fiscalYearId: null }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setFiscalYearId: (id) => set({ fiscalYearId: id }),
}))
