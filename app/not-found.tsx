export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground mt-2">A página que você procura não existe.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
