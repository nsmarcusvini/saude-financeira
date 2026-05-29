'use client'

import { YearSelector } from '@/components/shared/YearSelector'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-card/80 backdrop-blur-md transition-colors duration-300 z-10">
      <div />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <YearSelector />
      </div>
    </header>
  )
}
