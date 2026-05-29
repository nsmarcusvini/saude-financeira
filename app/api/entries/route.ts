import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  if (!fiscalYearId) return NextResponse.json({ error: 'fiscal_year_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('income_entries')
    .select('*')
    .eq('fiscal_year_id', fiscalYearId)
    .order('category')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { fiscal_year_id, category, month, amount } = body

  const { data, error } = await supabase
    .from('income_entries')
    .upsert({ fiscal_year_id, category, month, amount }, { onConflict: 'fiscal_year_id,category,month' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
