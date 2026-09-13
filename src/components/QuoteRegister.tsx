'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import type { Quote, QuoteStatus } from '@/lib/types'
import { QUOTE_STATUSES } from '@/lib/types'
import { calculateQuote, fmtINR } from '@/lib/calculations'
import { newQuote } from '@/lib/defaults'
import { Select, StatBadge } from './ui'

type SortKey = 'updated' | 'total' | 'client' | 'number'

export function QuoteRegister() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all')
  const [sort, setSort] = useState<SortKey>('updated')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/quotes', { cache: 'no-store' })
      const data = await res.json()
      setQuotes(data.quotes ?? [])
    } catch {
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = quotes
    if (statusFilter !== 'all') list = list.filter((x) => (x.status ?? 'draft') === statusFilter)
    if (q.trim()) {
      const needle = q.toLowerCase()
      list = list.filter((x) =>
        [x.quoteNumber, x.clientName, x.projectName, x.location]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(needle)),
      )
    }
    const total = (x: Quote) => x.grandTotal ?? calculateQuote(x).grandTotal
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'total':
          return total(b) - total(a)
        case 'client':
          return (a.clientName || '').localeCompare(b.clientName || '')
        case 'number':
          return (b.quoteNumber || '').localeCompare(a.quoteNumber || '')
        default:
          return (b.updatedAt || '').localeCompare(a.updatedAt || '')
      }
    })
  }, [quotes, q, statusFilter, sort])

  const createQuote = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote()),
      })
      const data = await res.json()
      if (data.quote?.id) router.push(`/quotes/${data.quote.id}/edit`)
    } finally {
      setCreating(false)
    }
  }

  const duplicate = async (src: Quote) => {
    const copy = newQuote({
      ...src,
      id: undefined as any,
      quoteNumber: '',
      status: 'draft',
      clientName: src.clientName,
      projectName: src.projectName ? `${src.projectName} (copy)` : '',
    })
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    })
    const data = await res.json()
    if (data.quote?.id) router.push(`/quotes/${data.quote.id}/edit`)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this quote permanently? This cannot be undone.')) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes((x) => x.filter((qq) => qq.id !== id))
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
              P
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink-900">PONGS Quote Maker</h1>
              <p className="text-xs text-ink-400">Stretch-ceiling quotation terminal</p>
            </div>
          </div>
          <button className="btn-primary" onClick={createQuote} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New quote
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Controls */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search by quote no, client, project, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={[
                { value: 'all', label: 'All statuses' },
                ...QUOTE_STATUSES.map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                })),
              ]}
            />
            <Select
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={[
                { value: 'updated', label: 'Recently updated' },
                { value: 'total', label: 'Highest total' },
                { value: 'client', label: 'Client A–Z' },
                { value: 'number', label: 'Quote number' },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase text-ink-500">
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium">Client / Project</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-ink-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-ink-400">
                      No quotes found. Create your first quote to get started.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((x) => {
                    const total = x.grandTotal ?? calculateQuote(x).grandTotal
                    return (
                      <tr key={x.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                        <td className="px-4 py-3 font-medium text-ink-900">
                          <Link href={`/quotes/${x.id}/edit`} className="hover:text-brand-600">
                            {x.quoteNumber || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-800">{x.clientName || '—'}</div>
                          <div className="text-xs text-ink-400">{x.projectName}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-600">{x.location || '—'}</td>
                        <td className="px-4 py-3 text-ink-600">{x.date}</td>
                        <td className="px-4 py-3 text-ink-600 capitalize">
                          {x.priceTier.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                          {fmtINR(total)}
                        </td>
                        <td className="px-4 py-3">
                          <StatBadge status={x.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/quotes/${x.id}/edit`} className="btn-ghost btn-sm" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/quotes/${x.id}/client`}
                              className="btn-ghost btn-sm"
                              title="Client PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/quotes/${x.id}/team`}
                              className="btn-ghost btn-sm"
                              title="Team breakdown"
                            >
                              <Users className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/quotes/${x.id}/internal`}
                              className="btn-ghost btn-sm"
                              title="Internal view"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => duplicate(x)}
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              className="btn-ghost btn-sm text-red-600"
                              onClick={() => remove(x.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
