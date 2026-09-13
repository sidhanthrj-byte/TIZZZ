'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import type { QuoteBreakdown, QuoteDisplayMode } from '@/lib/types'
import { fmtINR, fmtNum } from '@/lib/calculations'

const CATEGORY_LABELS: Record<string, string> = {
  fabric: 'Fabric',
  printing: 'Printing',
  fleece: 'Fleece',
  gripper: 'Gripper',
  led: 'LED',
  driver: 'Drivers',
  control: 'Controls',
  custom: 'Custom',
}

export function BreakdownView({
  breakdown,
  displayMode,
}: {
  breakdown: QuoteBreakdown
  displayMode: QuoteDisplayMode
}) {
  const [open, setOpen] = useState(false)
  if (breakdown.itemBreakdowns.length === 0) return null

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <span className="section-title">View calculation breakdown</span>
        <ChevronDown className={clsx('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-5 border-t border-ink-100 p-5">
          {breakdown.itemBreakdowns.map((ib) => (
            <div key={ib.itemId}>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink-900">{ib.itemName}</h4>
                <span className="text-xs text-ink-400">
                  {fmtNum(ib.areaM2)} m² · {fmtNum(ib.sqft, 0)} sqft
                </span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {ib.lineItems.map((li) => (
                    <tr key={li.key} className="border-b border-ink-50">
                      <td className="py-1.5 text-ink-600">
                        {li.description}
                        <span className="ml-1 text-ink-300">
                          ({CATEGORY_LABELS[li.category] ?? li.category})
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-ink-400">
                        {fmtNum(li.qty)} {li.unit} × {fmtINR(li.rate)}
                      </td>
                      <td className="w-24 py-1.5 text-right font-medium tabular-nums text-ink-800">
                        {fmtINR(li.tierAmount)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-1.5 font-medium text-ink-700">Installation</td>
                    <td />
                    <td className="py-1.5 text-right font-medium tabular-nums text-ink-800">
                      {fmtINR(ib.installationCost)}
                    </td>
                  </tr>
                  <tr className="border-t border-ink-200">
                    <td className="py-1.5 font-semibold text-ink-900">Item total</td>
                    <td />
                    <td className="py-1.5 text-right font-semibold tabular-nums text-ink-900">
                      {fmtINR(ib.itemTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {ib.errors.length > 0 && (
                <p className="mt-1 text-[11px] text-red-600">{ib.errors.join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
