import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { effectiveLoanRemaining } from '@/lib/calculations/schedule'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  if (!fiscalYearId) return NextResponse.json({ error: 'fiscal_year_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('fiscal_year_id', fiscalYearId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-decremento: parcelas restantes derivadas da data de início
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const refMonth = now.getMonth() + 1
  const refYear = now.getFullYear()

  const adjusted = (data ?? []).map((l) => ({
    ...l,
    remaining_installments: effectiveLoanRemaining(
      l.start_month, l.start_year, Number(l.remaining_installments), refMonth, refYear,
    ),
  }))

  return NextResponse.json(adjusted)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('loans')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('loans').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
