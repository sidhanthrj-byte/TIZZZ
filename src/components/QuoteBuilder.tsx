'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Cloud,
  Eye,
  FileText,
  Loader2,
  Plus,
  Users,
  Wallet,
} from 'lucide-react'
import type { CeilingItem, PriceTier, Quote } from '@/lib/types'
import { QUOTE_STATUSES } from '@/lib/types'
import { calculateQuote } from '@/lib/calculations'
import { newItem } from '@/lib/defaults'
import { COMPANY_LIST } from '@/lib/companies'
import { CeilingItemForm } from './CeilingItemForm'
import { QuoteSummary } from './QuoteSummary'
import { CustomLinesTable } from './CustomLinesTable'
import { BreakdownView } from './BreakdownView'
import { Field, NumberInput, Segmented, Select, TextInput, Toggle, StatBadge } from './ui'

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const TIER_OPTIONS: { value: PriceTier; label: string }[] = [
  { value: 'dealer', label: 'Dealer' },
  { value: 'msp', label: 'MSP' },
  { value: 'specifiors', label: 'Specifiers' },
  { value: 'manual', label: 'Manual' },
  { value: 'manual_custom', label: 'Manual Custom' },
]

export function QuoteBuilder({ mode, initial }: { mode: 'new' | 'edit'; initial: Quote }) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote>(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSaved, setLastSaved] = useState<string>('')
  const [persistedId, setPersistedId] = useState<string | null>(mode === 'edit' ? initial.id : null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRender = useRef(true)

  const breakdown = useMemo(() => calculateQuote(quote), [quote])

  const patch = useCallback((p: Partial<Quote>) => {
    setQuote((q) => ({ ...q, ...p }))
    setSaveState('dirty')
  }, [])

  const doSave = useCallback(async () => {
    setSaveState('saving')
    try {
      const isCreate = !persistedId
      const url = isCreate ? '/api/quotes' : `/api/quotes/${persistedId}`
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const saved: Quote = data.quote
      setPersistedId(saved.id)
      setQuote((q) => ({ ...q, id: saved.id, quoteNumber: saved.quoteNumber }))
      setSaveState('saved')
      setLastSaved(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      )
      if (isCreate) {
        // reflect the id in the URL without a full navigation
        window.history.replaceState(null, '', `/quotes/${saved.id}/edit`)
      }
    } catch (e) {
      console.error(e)
      setSaveState('error')
    }
  }, [persistedId, quote])

  // Debounced autosave
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (saveState !== 'dirty') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [quote, saveState, doSave])

  const loopGroupsInUse = useMemo(
    () =>
      Array.from(new Set(quote.items.map((i) => i.loopGroup ?? 0).filter((g) => g > 0))).sort(
        (a, b) => a - b,
      ),
    [quote.items],
  )

  const updateItem = (id: string, next: CeilingItem) =>
    patch({ items: quote.items.map((i) => (i.id === id ? next : i)) })
  const addItem = () => patch({ items: [...quote.items, newItem({ name: '' })] })
  const deleteItem = (id: string) => patch({ items: quote.items.filter((i) => i.id !== id) })
  const duplicateItem = (id: string) => {
    const src = quote.items.find((i) => i.id === id)
    if (!src) return
    patch({ items: [...quote.items, newItem({ ...src, name: `${src.name} (copy)` })] })
  }

  const isCustom = quote.priceTier === 'manual_custom'
  const isManual = quote.priceTier === 'manual'
  const canPreview = !!persistedId

  return (
    <div className="min-h-screen bg-ink-50/60 pb-28 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-ink-900">
                {quote.quoteNumber || 'New Quote'}
              </h1>
              <StatBadge status={quote.status} />
            </div>
            <p className="text-xs text-ink-400">
              {quote.clientName || 'Unnamed client'}
              {quote.projectName && ` · ${quote.projectName}`}
            </p>
          </div>
          <SaveIndicator state={saveState} lastSaved={lastSaved} onSave={doSave} />
          <div className="hidden items-center gap-2 sm:flex">
            {canPreview && (
              <>
                <Link href={`/quotes/${persistedId}/client`} className="btn-secondary btn-sm">
                  <FileText className="h-4 w-4" /> Client PDF
                </Link>
                <Link href={`/quotes/${persistedId}/team`} className="btn-ghost btn-sm">
                  <Users className="h-4 w-4" /> Team
                </Link>
                <Link href={`/quotes/${persistedId}/internal`} className="btn-ghost btn-sm">
                  <Eye className="h-4 w-4" /> Internal
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="space-y-6">
          {/* Client & Project */}
          <section className="card p-5">
            <h2 className="section-title mb-4">Client &amp; Project</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Client name">
                <TextInput value={quote.clientName} onChange={(v) => patch({ clientName: v })} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={quote.clientEmail} onChange={(v) => patch({ clientEmail: v })} />
              </Field>
              <Field label="Phone">
                <TextInput value={quote.clientPhone} onChange={(v) => patch({ clientPhone: v })} />
              </Field>
              <Field label="Project name">
                <TextInput value={quote.projectName} onChange={(v) => patch({ projectName: v })} />
              </Field>
              <Field label="Location">
                <TextInput value={quote.location} onChange={(v) => patch({ location: v })} />
              </Field>
              <Field label="Company">
                <Select
                  value={quote.company ?? 'STC'}
                  onChange={(v) => patch({ company: v })}
                  options={COMPANY_LIST.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Field>
              <Field label="Quote date">
                <TextInput type="date" value={quote.date} onChange={(v) => patch({ date: v })} />
              </Field>
              <Field label="Valid until">
                <TextInput type="date" value={quote.validUntil} onChange={(v) => patch({ validUntil: v })} />
              </Field>
              <Field label="Status">
                <Select
                  value={quote.status ?? 'draft'}
                  onChange={(v) => patch({ status: v })}
                  options={QUOTE_STATUSES.map((s) => ({
                    value: s,
                    label: s.charAt(0).toUpperCase() + s.slice(1),
                  }))}
                />
              </Field>
            </div>
          </section>

          {/* Commercial settings */}
          <section className="card p-5">
            <h2 className="section-title mb-1">Commercial Settings</h2>
            <p className="mb-4 text-xs text-ink-400">
              Markup applies to <strong>materials only</strong> — not installation or transport.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Pricing tier" className="sm:col-span-2 lg:col-span-3">
                <Segmented value={quote.priceTier} onChange={(v) => patch({ priceTier: v })} options={TIER_OPTIONS} />
              </Field>
              {!isCustom && (
                <>
                  <Field label="Markup %">
                    <NumberInput value={quote.markupPercent} onChange={(v) => patch({ markupPercent: v })} min={0} suffix="%" />
                  </Field>
                  <Field label="Installation rate">
                    <NumberInput
                      value={quote.installationRatePerSqft}
                      onChange={(v) => patch({ installationRatePerSqft: v })}
                      min={0}
                      suffix="₹/sqft"
                    />
                  </Field>
                </>
              )}
              <Field label="Transport cost">
                <NumberInput value={quote.transportCost} onChange={(v) => patch({ transportCost: v })} min={0} suffix="₹" />
              </Field>
              <Field label="Display mode">
                <Segmented
                  value={quote.displayMode}
                  onChange={(v) => patch({ displayMode: v })}
                  options={[
                    { value: 'total', label: 'Total' },
                    { value: 'per-sqft', label: 'Per sqft' },
                  ]}
                  size="sm"
                />
              </Field>
              <Field label="GST">
                <div className="pt-1.5">
                  <Toggle checked={quote.includeGst} onChange={(v) => patch({ includeGst: v })} label="Add 18% GST" />
                </div>
              </Field>
            </div>

            {isManual && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
                <p className="mb-3 text-xs font-medium text-brand-800">
                  Manual rates apply to fabric, LED &amp; gripper. Drivers, controls, printing &amp;
                  fleece use the selected &ldquo;other items&rdquo; tier.
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Fabric ₹/sqm">
                    <NumberInput
                      value={quote.manualRates?.fabricPerSqm ?? 0}
                      onChange={(v) => patch({ manualRates: { ...quote.manualRates!, fabricPerSqm: v } })}
                      min={0}
                    />
                  </Field>
                  <Field label="LED ₹/mtr">
                    <NumberInput
                      value={quote.manualRates?.ledPerMtr ?? 0}
                      onChange={(v) => patch({ manualRates: { ...quote.manualRates!, ledPerMtr: v } })}
                      min={0}
                    />
                  </Field>
                  <Field label="Gripper ₹/rmt">
                    <NumberInput
                      value={quote.manualRates?.gripperPerRmt ?? 0}
                      onChange={(v) => patch({ manualRates: { ...quote.manualRates!, gripperPerRmt: v } })}
                      min={0}
                    />
                  </Field>
                  <Field label="Other items tier">
                    <Select
                      value={quote.manualRates?.otherItemsTier ?? 'dealer'}
                      onChange={(v) =>
                        patch({ manualRates: { ...quote.manualRates!, otherItemsTier: v } })
                      }
                      options={[
                        { value: 'dealer', label: 'Dealer' },
                        { value: 'msp', label: 'MSP' },
                        { value: 'specifiors', label: 'Specifiers' },
                      ]}
                    />
                  </Field>
                </div>
              </div>
            )}
          </section>

          {/* Items OR custom table */}
          {isCustom ? (
            <section>
              <h2 className="section-title mb-3">Custom Lines</h2>
              <CustomLinesTable
                lines={quote.customLines ?? []}
                onChange={(customLines) => patch({ customLines })}
              />
            </section>
          ) : (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">
                  Ceiling Items <span className="text-ink-400">({quote.items.length})</span>
                </h2>
                <button className="btn-primary btn-sm" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Add item
                </button>
              </div>
              <div className="space-y-4">
                {quote.items.map((it, idx) => (
                  <CeilingItemForm
                    key={it.id}
                    item={it}
                    index={idx}
                    quote={quote}
                    loopGroupsInUse={loopGroupsInUse}
                    onChange={(next) => updateItem(it.id, next)}
                    onDelete={() => deleteItem(it.id)}
                    onDuplicate={() => duplicateItem(it.id)}
                  />
                ))}
                {quote.items.length === 0 && (
                  <div className="card p-10 text-center text-sm text-ink-400">
                    No items yet. Add your first ceiling item to begin.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Breakdown */}
          {!isCustom && <BreakdownView breakdown={breakdown} displayMode={quote.displayMode} />}

          {/* Quote notes */}
          <section className="card p-5">
            <Field label="Quote notes (appear on the PDF)">
              <textarea
                className="input min-h-[80px]"
                value={quote.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Optional notes shown to the client…"
              />
            </Field>
          </section>
        </div>

        {/* SIDEBAR (desktop) */}
        <aside className="no-print hidden lg:block">
          <div className="sticky top-[76px] space-y-4">
            <QuoteSummary
              breakdown={breakdown}
              displayMode={quote.displayMode}
              includeGst={quote.includeGst}
              markupPercent={quote.markupPercent}
            />
            {canPreview && (
              <div className="card space-y-2 p-4">
                <Link href={`/quotes/${persistedId}/client`} className="btn-primary w-full">
                  <FileText className="h-4 w-4" /> Generate Client PDF
                </Link>
                <Link href={`/quotes/${persistedId}/team`} className="btn-secondary w-full">
                  <Users className="h-4 w-4" /> Team breakdown
                </Link>
                <Link href={`/quotes/${persistedId}/internal`} className="btn-ghost w-full">
                  <Wallet className="h-4 w-4" /> Internal cost view
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky bottom summary (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white p-3 shadow-lift no-print lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="flex-1">
            <QuoteSummary
              breakdown={breakdown}
              displayMode={quote.displayMode}
              includeGst={quote.includeGst}
              markupPercent={quote.markupPercent}
              variant="bar"
            />
          </div>
          {canPreview && (
            <Link href={`/quotes/${persistedId}/client`} className="btn-primary btn-sm">
              <FileText className="h-4 w-4" /> PDF
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({
  state,
  lastSaved,
  onSave,
}: {
  state: SaveState
  lastSaved: string
  onSave: () => void
}) {
  return (
    <button onClick={onSave} className="flex items-center gap-1.5 text-xs text-ink-500" title="Save now">
      {state === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === 'saved' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
      {state === 'dirty' && <Cloud className="h-3.5 w-3.5 text-amber-500" />}
      {state === 'error' && <Cloud className="h-3.5 w-3.5 text-red-500" />}
      {state === 'idle' && <Cloud className="h-3.5 w-3.5 text-ink-300" />}
      <span className="hidden sm:inline">
        {state === 'saving' && 'Saving…'}
        {state === 'saved' && `Saved ${lastSaved}`}
        {state === 'dirty' && 'Unsaved changes'}
        {state === 'error' && 'Save failed — retry'}
        {state === 'idle' && (lastSaved ? `Saved ${lastSaved}` : 'Not saved')}
      </span>
    </button>
  )
}
