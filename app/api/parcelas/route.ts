import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { effectiveRemaining } from '@/lib/calculations/schedule'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const creditCardId = searchParams.get('credit_card_id')
  if (!creditCardId) return NextResponse.json({ error: 'credit_card_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('credit_card_installments')
    .select('*')
    .eq('credit_card_id', creditCardId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-decremento: recalcula parcelas restantes com base na data de início,
  // sem depender do número estático cadastrado.
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const refMonth = now.getMonth() + 1
  const refYear = now.getFullYear()

  const adjusted = (data ?? []).map((i) => ({
    ...i,
    installments_remaining: effectiveRemaining(
      Number(i.start_month), Number(i.start_year),
      Number(i.installments_total), Number(i.installments_remaining),
      refMonth, refYear,
    ),
  }))

  return NextResponse.json(adjusted)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('credit_card_installments')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('credit_card_installments')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('credit_card_installments').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
