'use client'
import { clsx } from 'clsx'
import type { QuoteBreakdown, QuoteDisplayMode } from '@/lib/types'
import { fmtINR, fmtNum } from '@/lib/calculations'

export function QuoteSummary({
  breakdown,
  displayMode,
  includeGst,
  markupPercent,
  variant = 'sidebar',
}: {
  breakdown: QuoteBreakdown
  displayMode: QuoteDisplayMode
  includeGst: boolean
  markupPercent: number
  variant?: 'sidebar' | 'bar'
}) {
  const rows: { label: string; value: string; muted?: boolean }[] = []
  if (breakdown.isCustom) {
    rows.push({ label: 'Custom lines', value: fmtINR(breakdown.materialsTotalTier) })
  } else {
    rows.push({ label: 'Materials', value: fmtINR(breakdown.materialsTotalTier) })
    if (markupPercent > 0)
      rows.push({ label: `Markup (${markupPercent}%)`, value: fmtINR(breakdown.markupAmount) })
    rows.push({ label: 'Installation', value: fmtINR(breakdown.totalInstallation) })
  }
  if (breakdown.transportCost > 0)
    rows.push({ label: 'Transport', value: fmtINR(breakdown.transportCost) })
  rows.push({ label: 'Subtotal', value: fmtINR(breakdown.subtotalBeforeGst), muted: true })
  if (includeGst) rows.push({ label: 'GST (18%)', value: fmtINR(breakdown.gstAmount) })

  if (variant === 'bar') {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Grand Total</p>
          <p className="truncate text-lg font-bold text-ink-900">{fmtINR(breakdown.grandTotal)}</p>
        </div>
        {!breakdown.isCustom && breakdown.totalSqft > 0 && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-ink-400">Per sqft</p>
            <p className="text-sm font-semibold text-ink-700">
              {fmtINR(breakdown.pricePerSqft)}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ink-900">Quote Summary</h3>
      <dl className="space-y-2.5 text-sm">
        {rows.map((r, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-baseline justify-between gap-2',
              r.muted && 'border-t border-ink-100 pt-2.5',
            )}
          >
            <dt className={clsx('text-ink-500', r.muted && 'font-medium text-ink-700')}>
              {r.label}
            </dt>
            <dd
              className={clsx(
                'tabular-nums font-medium text-ink-800',
                r.muted && 'font-semibold text-ink-900',
              )}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-lg bg-ink-900 p-4 text-white">
        <p className="text-[11px] uppercase tracking-wide text-white/60">Grand Total</p>
        <p className="text-2xl font-bold">{fmtINR(breakdown.grandTotal)}</p>
        {!breakdown.isCustom && breakdown.totalSqft > 0 && (
          <p className="mt-1 text-xs text-white/70">
            {fmtINR(breakdown.pricePerSqft)} / sqft · {fmtNum(breakdown.totalSqft, 0)} sqft
          </p>
        )}
      </div>
      {breakdown.errors.length > 0 && (
        <p className="mt-3 text-xs text-red-600">
          {breakdown.errors.length} item error{breakdown.errors.length > 1 ? 's' : ''} — resolve before
          sending.
        </p>
      )}
    </div>
  )
}
