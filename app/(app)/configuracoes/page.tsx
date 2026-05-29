'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react'
import {
  INCOME_CATEGORIES,
  FIXED_EXPENSE_CATEGORIES,
  VARIABLE_EXPENSE_CATEGORIES,
} from '@/lib/constants/categories'
import type { CustomCategory } from '@/types/financial'

type CategoryType = 'income' | 'fixed' | 'variable'

const SECTIONS: { type: CategoryType; label: string; defaults: string[] }[] = [
  { type: 'income', label: 'Entradas', defaults: INCOME_CATEGORIES },
  { type: 'fixed', label: 'Despesas Fixas', defaults: FIXED_EXPENSE_CATEGORIES },
  { type: 'variable', label: 'Despesas Variáveis', defaults: VARIABLE_EXPENSE_CATEGORIES },
]

export default function ConfiguracoesPage() {
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [inputs, setInputs] = useState<Record<CategoryType, string>>({ income: '', fixed: '', variable: '' })
  const [addLoading, setAddLoading] = useState<Record<CategoryType, boolean>>({ income: false, fixed: false, variable: false })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [seeded, setSeeded] = useState(false)

  const getUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  const fetchCategories = useCallback(async () => {
    const supabase = createClient()
    const user = await getUser()
    if (!user) return
    const { data } = await supabase
      .from('custom_categories')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['income', 'fixed', 'variable'])
      .order('name')
    setCategories(data ?? [])
    return data ?? []
  }, [])

  const seedDefaults = useCallback(async (existing: CustomCategory[]) => {
    const supabase = createClient()
    const user = await getUser()
    if (!user) return

    const toInsert: { user_id: string; type: string; name: string }[] = []
    for (const { type, defaults } of SECTIONS) {
      const hasAny = existing.some((c) => c.type === type)
      if (!hasAny) {
        defaults.forEach((name) => toInsert.push({ user_id: user.id, type, name }))
      }
    }
    if (toInsert.length > 0) {
      await supabase.from('custom_categories').insert(toInsert)
      await fetchCategories()
    }
    setSeeded(true)
  }, [fetchCategories])

  useEffect(() => {
    fetchCategories().then((data) => {
      if (data && !seeded) seedDefaults(data)
    })
  }, [fetchCategories, seedDefaults, seeded])

  async function handleAdd(type: CategoryType) {
    const name = inputs[type].trim()
    if (!name) return
    setAddLoading((p) => ({ ...p, [type]: true }))
    const supabase = createClient()
    const user = await getUser()
    if (!user) { setAddLoading((p) => ({ ...p, [type]: false })); return }
    await supabase.from('custom_categories').insert({ user_id: user.id, type, name })
    setInputs((p) => ({ ...p, [type]: '' }))
    fetchCategories()
    setAddLoading((p) => ({ ...p, [type]: false }))
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('custom_categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  function startEdit(cat: CustomCategory) {
    setEditingId(cat.id)
    setEditValue(cat.name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function confirmEdit(id: string) {
    const name = editValue.trim()
    if (!name) return
    const supabase = createClient()
    await supabase.from('custom_categories').update({ name }).eq('id', id)
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edite, remova ou adicione categorias nas tabelas de entradas e saídas
        </p>
      </div>

      {SECTIONS.map(({ type, label }) => {
        const items = categories.filter((c) => c.type === type)
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length > 0 ? (
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {items.map((cat) => (
                    <li key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/10 transition-colors">
                      {editingId === cat.id ? (
                        <>
                          <Input
                            className="h-7 text-sm flex-1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEdit(cat.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => confirmEdit(cat.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm flex-1">{cat.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => startEdit(cat)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Nenhuma categoria. Adicione abaixo.</p>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); handleAdd(type) }}
                className="flex gap-2"
              >
                <Input
                  className="flex-1"
                  placeholder={`Nova categoria em "${label}"...`}
                  value={inputs[type]}
                  onChange={(e) => setInputs((p) => ({ ...p, [type]: e.target.value }))}
                />
                <Button type="submit" variant="outline" size="icon" disabled={addLoading[type] || !inputs[type].trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
