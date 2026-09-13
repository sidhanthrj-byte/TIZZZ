import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { dbGetQuote } from '@/lib/db'
import { calculateQuote, fmtINR, fmtNum } from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export default async function TeamPage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  const bd = calculateQuote(quote)

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Link href={`/quotes/${quote.id}/edit`} className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-ink-900">
              Team Breakdown · {quote.quoteNumber}
            </h1>
            <p className="text-xs text-ink-400">
              {quote.clientName} · {quote.projectName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {bd.itemBreakdowns.map((ib) => (
          <div key={ib.itemId} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">{ib.itemName}</h2>
              <span className="text-xs text-ink-400">
                {fmtNum(ib.areaM2)} m² · {fmtNum(ib.sqft, 0)} sqft
              </span>
            </div>

            {ib.fabricDetail && (
              <p className="mb-3 text-xs text-ink-500">
                Fabric: {ib.fabricDetail.orientation} · billed {fmtNum(ib.fabricDetail.billedAreaM2)} m²/pc
                · wastage {fmtNum(ib.fabricDetail.wastageM2)} m²
              </p>
            )}
            {ib.ledDetail && (
              <p className="mb-3 text-xs text-ink-500">
                LED: {ib.ledDetail.strips} strips × {ib.ledDetail.runningLengthM}m ={' '}
                {ib.ledDetail.totalRunningMeters}m/pc · {fmtNum(ib.ledDetail.totalWatts, 0)}W/pc
              </p>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase text-ink-500">
                  <th className="py-2 font-medium">Line</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ib.lineItems.map((li) => (
                  <tr key={li.key} className="border-b border-ink-50">
                    <td className="py-2 text-ink-700">{li.description}</td>
                    <td className="py-2 text-right tabular-nums text-ink-600">
                      {fmtNum(li.qty)} {li.unit}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-600">{fmtINR(li.rate)}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-ink-900">
                      {fmtINR(li.tierAmount)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-medium text-ink-700">Installation</td>
                  <td colSpan={2} />
                  <td className="py-2 text-right font-medium tabular-nums text-ink-900">
                    {fmtINR(ib.installationCost)}
                  </td>
                </tr>
                <tr className="border-t border-ink-200">
                  <td className="py-2 font-semibold text-ink-900">Item total</td>
                  <td colSpan={2} />
                  <td className="py-2 text-right font-semibold tabular-nums text-ink-900">
                    {fmtINR(ib.itemTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        <div className="card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">Materials (tier)</span>
            <span className="tabular-nums font-medium">{fmtINR(bd.materialsTotalTier)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-500">Materials + markup</span>
            <span className="tabular-nums font-medium">{fmtINR(bd.materialsTotalFinal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-500">Installation</span>
            <span className="tabular-nums font-medium">{fmtINR(bd.totalInstallation)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3 text-lg font-bold">
            <span>Grand total</span>
            <span className="tabular-nums">{fmtINR(bd.grandTotal)}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
