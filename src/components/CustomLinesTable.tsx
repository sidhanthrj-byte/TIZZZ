'use client'
import { Copy, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import type { CustomLine } from '@/lib/types'
import { fmtINR } from '@/lib/calculations'
import { NumberInput, TextInput } from './ui'

export function CustomLinesTable({
  lines,
  onChange,
}: {
  lines: CustomLine[]
  onChange: (lines: CustomLine[]) => void
}) {
  const update = (id: string, patch: Partial<CustomLine>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id))
  const duplicate = (l: CustomLine) => onChange([...lines, { ...l, id: uuid() }])
  const add = () =>
    onChange([...lines, { id: uuid(), description: '', qty: 1, cost: 0, sellingPrice: 0 }])

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-xs text-amber-800">
          <strong>Manual Custom Quote</strong> — this mode bypasses the standard ceiling
          calculations entirely. Prices are taken directly from the table below (qty × selling
          price). Markup and installation do not apply; transport and GST still do.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase text-ink-500">
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="w-20 px-3 py-2 font-medium">Qty</th>
              <th className="w-32 px-3 py-2 font-medium">Cost (int.)</th>
              <th className="w-32 px-3 py-2 font-medium">Selling price</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-400">
                  No custom lines yet — add your first row.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-ink-100 last:border-0">
                <td className="px-3 py-2">
                  <TextInput
                    value={l.description}
                    onChange={(v) => update(l.id, { description: v })}
                    placeholder="Line description"
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput value={l.qty} onChange={(v) => update(l.id, { qty: v })} min={0} />
                </td>
                <td className="px-3 py-2">
                  <NumberInput value={l.cost} onChange={(v) => update(l.id, { cost: v })} min={0} />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={l.sellingPrice}
                    onChange={(v) => update(l.id, { sellingPrice: v })}
                    min={0}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-ink-900">
                  {fmtINR((l.qty || 0) * (l.sellingPrice || 0))}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => duplicate(l)} title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost btn-sm text-red-600"
                      onClick={() => remove(l.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-ink-100 p-3">
        <button className="btn-secondary btn-sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add row
        </button>
      </div>
    </div>
  )
}
