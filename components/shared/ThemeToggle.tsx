"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="flex items-center justify-center h-9 w-9 rounded-md border border-border/10 bg-transparent opacity-50 cursor-default">
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center h-9 w-9 rounded-md border border-border/10 bg-background/50 hover:bg-muted transition-colors relative overflow-hidden"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 absolute transition-all duration-300 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 text-orange-500" />
      <Moon className="h-4 w-4 absolute transition-all duration-300 scale-0 rotate-90 dark:scale-100 dark:rotate-0 text-orange-500" />
    </button>
  )
}
