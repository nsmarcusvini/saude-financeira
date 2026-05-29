import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET ?fiscal_year_id=...&month=..&year=..  → eventos de pagamento (filtra por competência se informado)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  if (!fiscalYearId) return NextResponse.json({ error: 'fiscal_year_id required' }, { status: 400 })

  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const supabase = await createClient()
  let query = supabase
    .from('payment_events')
    .select('*')
    .eq('fiscal_year_id', fiscalYearId)

  if (month) query = query.eq('competence_month', Number(month))
  if (year) query = query.eq('competence_year', Number(year))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST → upsert do evento (1 por ref + competência)
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const payload = {
    fiscal_year_id: body.fiscal_year_id,
    ref_type: body.ref_type,
    ref_id: body.ref_id,
    competence_month: Number(body.competence_month),
    competence_year: Number(body.competence_year),
    status: body.status,
    amount: Number(body.amount) || 0,
    note: body.note ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('payment_events')
    .upsert(payload, { onConflict: 'ref_type,ref_id,competence_month,competence_year' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE ?id=...  → remove (desfaz registro)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('payment_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
