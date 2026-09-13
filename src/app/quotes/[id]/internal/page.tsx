import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { dbGetQuote } from '@/lib/db'
import { calculateQuote, fmtINR } from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export default async function InternalPage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  const bd = calculateQuote(quote)

  const totalCost = bd.itemBreakdowns.reduce(
    (s, ib) => s + ib.lineItems.reduce((a, li) => a + (li.costAmount ?? 0), 0),
    0,
  )
  const sellingMaterials = bd.materialsTotalFinal
  const margin = sellingMaterials - totalCost
  const marginPct = sellingMaterials > 0 ? (margin / sellingMaterials) * 100 : 0

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Link href={`/quotes/${quote.id}/edit`} className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-ink-900">
              Internal Cost Review · {quote.quoteNumber}
            </h1>
            <p className="text-xs text-ink-400">Confidential — internal use only</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Est. cost (materials)" value={fmtINR(totalCost)} />
          <Stat label="Selling (materials)" value={fmtINR(sellingMaterials)} />
          <Stat label="Gross margin" value={fmtINR(margin)} />
          <Stat label="Margin %" value={`${marginPct.toFixed(1)}%`} accent />
        </div>

        {bd.itemBreakdowns.map((ib) => (
          <div key={ib.itemId} className="card p-5">
            <h2 className="section-title mb-3">{ib.itemName}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase text-ink-500">
                  <th className="py-2 font-medium">Line</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                  <th className="py-2 text-right font-medium">Selling (tier)</th>
                  <th className="py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {ib.lineItems.map((li) => {
                  const cost = li.costAmount ?? 0
                  const m = li.tierAmount - cost
                  return (
                    <tr key={li.key} className="border-b border-ink-50">
                      <td className="py-2 text-ink-700">{li.description}</td>
                      <td className="py-2 text-right tabular-nums text-ink-600">{fmtINR(cost)}</td>
                      <td className="py-2 text-right tabular-nums text-ink-800">
                        {fmtINR(li.tierAmount)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium text-emerald-600">
                        {fmtINR(m)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </main>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? 'text-brand-600' : 'text-ink-900'}`}>
        {value}
      </p>
    </div>
  )
}
