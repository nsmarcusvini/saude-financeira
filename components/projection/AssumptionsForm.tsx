'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ProjectionAssumptions } from '@/types/financial'

interface AssumptionsFormProps {
  assumptions: ProjectionAssumptions
  onSave: (a: ProjectionAssumptions) => void
}

export function AssumptionsForm({ assumptions, onSave }: AssumptionsFormProps) {
  const [local, setLocal] = useState(assumptions)

  function pctToNum(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n / 100
  }

  function numToPct(v: number): string {
    return (v * 100).toFixed(2)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Premissas da Projeção</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Inflação a.a. (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={numToPct(local.inflation_rate)}
              onChange={(e) => setLocal({ ...local, inflation_rate: pctToNum(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Crescimento real renda (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={numToPct(local.real_income_growth)}
              onChange={(e) => setLocal({ ...local, real_income_growth: pctToNum(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rentabilidade invest. (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={numToPct(local.investment_return)}
              onChange={(e) => setLocal({ ...local, investment_return: pctToNum(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">% do superávit poupado</Label>
            <Input
              type="number"
              step="1"
              max="100"
              value={numToPct(local.savings_pct)}
              onChange={(e) => setLocal({ ...local, savings_pct: pctToNum(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Patrimônio inicial (R$)</Label>
            <Input
              type="number"
              step="1000"
              value={local.initial_patrimony}
              onChange={(e) => setLocal({ ...local, initial_patrimony: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button className="mt-4" size="sm" onClick={() => onSave(local)}>
          Atualizar projeção
        </Button>
      </CardContent>
    </Card>
  )
}
