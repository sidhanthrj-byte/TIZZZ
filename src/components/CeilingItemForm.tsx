'use client'
import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Copy,
  Trash2,
  AlertTriangle,
  Lightbulb,
  Ruler,
  Layers,
  Cpu,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { CeilingItem, LightType, Quote, ShapeType, UnitSystem } from '@/lib/types'
import { calculateItem, fmtINR, fmtNum, formatDims } from '@/lib/calculations'
import { validateItem } from '@/lib/validation'
import { FABRIC_TYPES, GRIPPER } from '@/lib/pricing'
import { Field, NumberInput, Segmented, Select, TextInput, Toggle } from './ui'

const SHAPE_OPTIONS: { value: ShapeType; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'l-shape', label: 'L-Shape' },
]
const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'meters', label: 'm' },
  { value: 'feet', label: 'ft' },
  { value: 'mm', label: 'mm' },
]
const LIGHT_OPTIONS: { value: LightType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'single_color', label: 'Single Colour' },
  { value: 'single_color_dimmable', label: 'Single Colour Dimmable' },
  { value: 'tunable', label: 'Tunable White' },
  { value: 'tunable_dali', label: 'Tunable DALI' },
  { value: 'rgb', label: 'RGB' },
  { value: 'rgbw', label: 'RGBW' },
]

export function CeilingItemForm({
  item,
  index,
  quote,
  loopGroupsInUse,
  onChange,
  onDelete,
  onDuplicate,
}: {
  item: CeilingItem
  index: number
  quote: Quote
  loopGroupsInUse: number[]
  onChange: (item: CeilingItem) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [open, setOpen] = useState(true)

  const breakdown = useMemo(() => calculateItem(item, quote), [item, quote])
  const validation = useMemo(() => validateItem(item), [item])
  const fab = breakdown.fabricDetail
  const led = breakdown.ledDetail

  const set = <K extends keyof CeilingItem>(key: K, value: CeilingItem[K]) =>
    onChange({ ...item, [key]: value })
  const setDim = (key: string, value: number) =>
    onChange({ ...item, dimensions: { ...item.dimensions, [key]: value } })

  const hasErrors = validation.errors.length > 0 || breakdown.errors.length > 0
  const isDali = Boolean(
    (item.lightType === 'single_color_dimmable' && !item.dimmableWithoutDali) ||
      item.lightType === 'tunable_dali' ||
      ((item.lightType === 'rgb' || item.lightType === 'rgbw') && item.rgbDali),
  )

  return (
    <div className={clsx('card overflow-hidden', hasErrors && 'ring-1 ring-red-200')}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink-900">
              {item.name || `Item ${index + 1}`}
            </span>
            <span className="block truncate text-xs text-ink-500">
              {SHAPE_OPTIONS.find((s) => s.value === item.shape)?.label} · {formatDims(item)} · Qty{' '}
              {item.quantity}
              {item.lightType !== 'none' &&
                ` · ${LIGHT_OPTIONS.find((l) => l.value === item.lightType)?.label}`}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {hasErrors && (
            <AlertTriangle className="h-4 w-4 text-red-500" aria-label="Has errors" />
          )}
          <span className="hidden text-right font-semibold text-ink-900 sm:block">
            {fmtINR(breakdown.subtotalTier)}
          </span>
          <button className="btn-ghost btn-sm" onClick={onDuplicate} title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <button className="btn-ghost btn-sm text-red-600" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setOpen((o) => !o)}
            title={open ? 'Collapse' : 'Expand'}
          >
            <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-ink-50/40 p-4">
          {(validation.errors.length > 0 || breakdown.errors.length > 0) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <ul className="list-inside list-disc space-y-0.5">
                {[...new Set([...validation.errors, ...breakdown.errors])].map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: inputs */}
            <div className="space-y-5">
              {/* Basic */}
              <Group icon={<Layers className="h-4 w-4" />} title="Basic">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Item name" className="col-span-2">
                    <TextInput
                      value={item.name}
                      onChange={(v) => set('name', v)}
                      placeholder="e.g. Lobby Feature Ceiling"
                    />
                  </Field>
                  <Field label="Surface">
                    <Segmented
                      value={item.surface}
                      onChange={(v) => set('surface', v)}
                      options={[
                        { value: 'ceiling', label: 'Ceiling' },
                        { value: 'wall', label: 'Wall' },
                      ]}
                      size="sm"
                    />
                  </Field>
                  <Field label="Quantity">
                    <NumberInput
                      value={item.quantity}
                      onChange={(v) => set('quantity', v)}
                      min={1}
                      invalid={item.quantity <= 0}
                    />
                  </Field>
                  <Field label="Shape">
                    <Select value={item.shape} onChange={(v) => set('shape', v)} options={SHAPE_OPTIONS} />
                  </Field>
                  <Field label="Unit">
                    <Select value={item.unit} onChange={(v) => set('unit', v)} options={UNIT_OPTIONS} />
                  </Field>
                </div>
              </Group>

              {/* Dimensions */}
              <Group icon={<Ruler className="h-4 w-4" />} title="Dimensions">
                <DimensionInputs item={item} setDim={setDim} />
              </Group>

              {/* Fabric */}
              <Group title="Fabric & finish">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fabric type" className="col-span-2">
                    <Select
                      value={item.fabricType}
                      onChange={(v) => set('fabricType', v)}
                      options={FABRIC_TYPES.map((f) => ({ value: f, label: f }))}
                    />
                  </Field>
                  <Field label="Gripper track">
                    <Select
                      value={item.gripperType}
                      onChange={(v) => set('gripperType', v)}
                      options={Object.keys(GRIPPER).map((g) => ({ value: g as any, label: g }))}
                    />
                  </Field>
                  <Field label="Margin (mm/side)" hint="Billing only">
                    <NumberInput value={item.marginMM ?? 0} onChange={(v) => set('marginMM', v)} min={0} />
                  </Field>
                  <div className="col-span-2 flex items-center gap-6 pt-1">
                    <Toggle
                      checked={item.withPrinting}
                      onChange={(v) => set('withPrinting', v)}
                      label="Digital printing"
                    />
                    <Toggle
                      checked={item.withFleece}
                      onChange={(v) => set('withFleece', v)}
                      label="Acoustic fleece"
                    />
                  </div>
                </div>
              </Group>

              {/* Joints */}
              {item.shape !== 'circle' && (
                <Group title="Joint">
                  <Field label="Joint type">
                    <Segmented
                      value={item.jointType}
                      onChange={(v) => set('jointType', v)}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'center', label: 'Center' },
                        { value: 'off-center', label: 'Off-center' },
                      ]}
                      size="sm"
                    />
                  </Field>
                  {item.jointType === 'off-center' && (
                    <Field
                      label="Joint position (mm from one end)"
                      className="mt-3"
                      hint={
                        fab && !fab.jointRequired
                          ? `Resulting panels: ${fab.panels
                              .map((p) => `${fmtNum(p.rollAxisM)}m`)
                              .join(' + ')}`
                          : 'Enter a valid position within the larger dimension'
                      }
                      error={
                        item.jointPosition <= 0 ? 'Position must be greater than 0.' : undefined
                      }
                    >
                      <NumberInput
                        value={item.jointPosition}
                        onChange={(v) => set('jointPosition', v)}
                        min={0}
                        suffix="mm"
                      />
                    </Field>
                  )}
                  {item.jointType === 'center' && fab && !fab.jointRequired && (
                    <p className="field-hint mt-2">
                      Split into {fab.panels.length} panels · {fab.orientation}
                    </p>
                  )}
                </Group>
              )}

              {/* Lighting */}
              <Group icon={<Lightbulb className="h-4 w-4" />} title="Lighting">
                <Field label="Lighting type">
                  <Select
                    value={item.lightType}
                    onChange={(v) => set('lightType', v)}
                    options={LIGHT_OPTIONS}
                  />
                </Field>
                {item.lightType !== 'none' && (
                  <LightingControls item={item} set={set} loopGroupsInUse={loopGroupsInUse} />
                )}
              </Group>

              {/* Notes */}
              <Field label="Item notes">
                <textarea
                  className="input min-h-[64px]"
                  value={item.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Internal notes for this item…"
                />
              </Field>
            </div>

            {/* RIGHT: live previews */}
            <div className="space-y-4">
              {/* Fabric preview */}
              <PreviewPanel title="Fabric calculation">
                {fab?.impossible || (fab?.jointRequired && item.jointType === 'none') ? (
                  <div className="flex items-start gap-2 text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-xs">
                      Joint required — {fab?.note ?? 'dimensions cannot be manufactured in one piece.'}
                    </span>
                  </div>
                ) : fab ? (
                  <dl className="space-y-1.5 text-xs">
                    <Row k="Required size" v={`${fmtNum(fab.requiredW)} × ${fmtNum(fab.requiredL)} m`} />
                    <Row k="Orientation" v={fab.orientation} />
                    <Row k="Panels" v={String(fab.panels.length)} />
                    {fab.panels.map((p, i) => (
                      <Row
                        key={i}
                        k={`  Panel ${i + 1}`}
                        v={`${p.rollWidthM}m roll × ${fmtNum(p.cutM)}m cut`}
                        sub
                      />
                    ))}
                    <Row k="Billed fabric" v={`${fmtNum(fab.billedAreaM2)} m²/pc`} strong />
                    <Row k="Used area" v={`${fmtNum(fab.usedAreaM2)} m²`} />
                    <Row
                      k="Wastage"
                      v={`${fmtNum(fab.wastageM2)} m² (${
                        fab.billedAreaM2 > 0
                          ? Math.round((fab.wastageM2 / fab.billedAreaM2) * 100)
                          : 0
                      }%)`}
                    />
                  </dl>
                ) : (
                  <p className="text-xs text-ink-400">Enter valid dimensions.</p>
                )}
              </PreviewPanel>

              {/* LED preview */}
              {item.lightType !== 'none' && led && (
                <PreviewPanel title="LED calculation" icon={<Cpu className="h-4 w-4" />}>
                  <dl className="space-y-1.5 text-xs">
                    <Row k="Strip count" v={String(led.strips)} />
                    <Row k="Spacing" v={`${led.spacingMM} mm`} />
                    <Row k="Running length" v={`${led.runningLengthM} m`} />
                    <Row k="Total LED" v={`${led.totalRunningMeters} m/pc`} strong />
                    <Row k="Power" v={`${fmtNum(led.totalWatts, 0)} W/pc`} />
                    <Row k="LED type" v={led.ledKey} />
                  </dl>
                  <DriverSummary breakdown={breakdown} isDali={isDali} />
                </PreviewPanel>
              )}

              {/* Cost preview */}
              <PreviewPanel title="Item cost">
                <dl className="space-y-1.5 text-xs">
                  {breakdown.lineItems.map((li) => (
                    <Row
                      key={li.key}
                      k={`${li.description}`}
                      v={fmtINR(li.tierAmount)}
                      sub2={`${fmtNum(li.qty)} ${li.unit} × ${fmtINR(li.rate)}`}
                    />
                  ))}
                  <div className="my-1 border-t border-ink-100" />
                  <Row k="Materials subtotal" v={fmtINR(breakdown.subtotalTier)} strong />
                  <Row k="Installation" v={fmtINR(breakdown.installationCost)} />
                  <Row k="Item total" v={fmtINR(breakdown.itemTotal)} strong />
                </dl>
              </PreviewPanel>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function Group({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-ink-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

function DimensionInputs({
  item,
  setDim,
}: {
  item: CeilingItem
  setDim: (k: string, v: number) => void
}) {
  const d = item.dimensions
  switch (item.shape) {
    case 'rectangle':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length">
            <NumberInput value={d.dim1 ?? 0} onChange={(v) => setDim('dim1', v)} min={0} suffix={item.unit === 'meters' ? 'm' : item.unit} />
          </Field>
          <Field label="Width">
            <NumberInput value={d.dim2 ?? 0} onChange={(v) => setDim('dim2', v)} min={0} suffix={item.unit === 'meters' ? 'm' : item.unit} />
          </Field>
        </div>
      )
    case 'circle':
      return (
        <Field label="Diameter">
          <NumberInput value={d.diameter ?? 0} onChange={(v) => setDim('diameter', v)} min={0} suffix={item.unit === 'meters' ? 'm' : item.unit} />
        </Field>
      )
    case 'triangle':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base"><NumberInput value={d.dim1 ?? 0} onChange={(v) => setDim('dim1', v)} min={0} /></Field>
          <Field label="Height"><NumberInput value={d.dim2 ?? 0} onChange={(v) => setDim('dim2', v)} min={0} /></Field>
          <Field label="Side 1"><NumberInput value={d.side1 ?? 0} onChange={(v) => setDim('side1', v)} min={0} /></Field>
          <Field label="Side 2"><NumberInput value={d.side2 ?? 0} onChange={(v) => setDim('side2', v)} min={0} /></Field>
          <Field label="Side 3"><NumberInput value={d.side3 ?? 0} onChange={(v) => setDim('side3', v)} min={0} /></Field>
        </div>
      )
    case 'l-shape':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length 1"><NumberInput value={d.length1 ?? 0} onChange={(v) => setDim('length1', v)} min={0} /></Field>
          <Field label="Width 1"><NumberInput value={d.width1 ?? 0} onChange={(v) => setDim('width1', v)} min={0} /></Field>
          <Field label="Length 2"><NumberInput value={d.length2 ?? 0} onChange={(v) => setDim('length2', v)} min={0} /></Field>
          <Field label="Width 2"><NumberInput value={d.width2 ?? 0} onChange={(v) => setDim('width2', v)} min={0} /></Field>
        </div>
      )
  }
}

function LightingControls({
  item,
  set,
  loopGroupsInUse,
}: {
  item: CeilingItem
  set: <K extends keyof CeilingItem>(k: K, v: CeilingItem[K]) => void
  loopGroupsInUse: number[]
}) {
  const isSingle = item.lightType === 'single_color' || item.lightType === 'single_color_dimmable'
  const isRgb = item.lightType === 'rgb' || item.lightType === 'rgbw'
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="mt-3 space-y-3">
      {/* DALI / non-DALI variant switches */}
      {item.lightType === 'single_color_dimmable' && (
        <Field label="Control protocol">
          <Segmented
            value={item.dimmableWithoutDali ? 'non' : 'dali'}
            onChange={(v) => set('dimmableWithoutDali', v === 'non')}
            options={[
              { value: 'dali', label: 'DALI' },
              { value: 'non', label: 'Non-DALI' },
            ]}
            size="sm"
          />
        </Field>
      )}
      {isRgb && (
        <Field label="Control protocol">
          <Segmented
            value={item.rgbDali ? 'dali' : 'analog'}
            onChange={(v) => set('rgbDali', v === 'dali')}
            options={[
              { value: 'analog', label: 'Analog' },
              { value: 'dali', label: 'DALI' },
            ]}
            size="sm"
          />
        </Field>
      )}
      {item.lightType === 'tunable_dali' && (
        <Field label="DALI driver">
          <Segmented
            value={item.daliDriver}
            onChange={(v) => set('daliDriver', v)}
            options={[
              { value: 'dt8', label: 'DT8 + DA4m' },
              { value: 'da4m', label: 'DA4m only' },
            ]}
            size="sm"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cove depth (mm)">
          <NumberInput value={item.lightDepth} onChange={(v) => set('lightDepth', v)} min={0} />
        </Field>
        <Field label="LED width">
          <Segmented
            value={item.ledWidth}
            onChange={(v) => set('ledWidth', v)}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'wider', label: 'Wider' },
            ]}
            size="sm"
          />
        </Field>
        <Field label="Strip spacing (mm)">
          <NumberInput value={item.ledSpacingMM} onChange={(v) => set('ledSpacingMM', v)} min={1} />
        </Field>
        {isSingle && (
          <Field label="Module type">
            <Segmented
              value={item.ledModuleType}
              onChange={(v) => set('ledModuleType', v)}
              options={[
                { value: 'standard', label: '10-dot' },
                { value: '12dot', label: '12-dot' },
              ]}
              size="sm"
            />
          </Field>
        )}
      </div>

      {/* Looping */}
      <div className="rounded-lg border border-ink-200 bg-white p-3 space-y-3">
        <div>
          <label className="label">Quantity looping</label>
          <Segmented
            value={item.lightingConfig ?? 'non_looped'}
            onChange={(v) => set('lightingConfig', v)}
            options={[
              { value: 'non_looped', label: 'Non-looped' },
              { value: 'looped', label: 'Looped' },
            ]}
            size="sm"
          />
          <p className="field-hint">
            {item.lightingConfig === 'looped'
              ? 'One driver/control set shared across all identical pieces.'
              : 'Each piece gets its own driver/control set.'}
          </p>
        </div>
        <div>
          <label className="label">Cross-item loop group</label>
          <div className="flex items-center gap-2">
            <NumberInput
              value={item.loopGroup ?? 0}
              onChange={(v) => set('loopGroup', Math.max(0, Math.floor(v)))}
              min={0}
            />
          </div>
          <p className="field-hint">
            Items sharing the same group number (&gt; 0) share one driver set. 0 = none.
            {loopGroupsInUse.length > 0 && ` In use: ${loopGroupsInUse.join(', ')}.`}
          </p>
        </div>
      </div>

      {/* Advanced driver controls */}
      <button
        type="button"
        className="text-xs font-medium text-brand-600 hover:underline"
        onClick={() => setShowAdvanced((s) => !s)}
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced driver controls
      </button>
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <Field label="Preferred driver watt" className="col-span-2" hint="Force a single driver size">
            <Select
              value={item.preferredDriverWatt ?? ''}
              onChange={(v) => set('preferredDriverWatt', (v || undefined) as any)}
              options={[
                { value: '', label: 'Auto (recommended)' },
                ...(['50W', '100W', '150W', '200W', '350W', '400W', '600W'] as const).map((w) => ({
                  value: w,
                  label: w,
                })),
              ]}
            />
          </Field>
          <DriverOverrideEditor item={item} set={set} />
        </div>
      )}
    </div>
  )
}

function DriverOverrideEditor({
  item,
  set,
}: {
  item: CeilingItem
  set: <K extends keyof CeilingItem>(k: K, v: CeilingItem[K]) => void
}) {
  const entries = Object.entries(item.driverOverrides ?? {})
  return (
    <div className="col-span-2">
      <label className="label">Driver overrides</label>
      <p className="field-hint mb-2">
        Override applies to the <strong>TOTAL</strong> quantity of that driver/control line.
      </p>
      {entries.map(([desc, qty]) => (
        <div key={desc} className="mb-2 flex items-center gap-2">
          <input
            className="input flex-1"
            value={desc}
            onChange={(e) => {
              const next = { ...item.driverOverrides }
              delete next[desc]
              next[e.target.value] = qty
              set('driverOverrides', next)
            }}
            placeholder="Driver 200W"
          />
          <NumberInput
            value={qty}
            onChange={(v) => set('driverOverrides', { ...item.driverOverrides, [desc]: v })}
            min={0}
          />
          <button
            className="btn-ghost btn-sm text-red-600"
            onClick={() => {
              const next = { ...item.driverOverrides }
              delete next[desc]
              set('driverOverrides', next)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        className="btn-secondary btn-sm"
        onClick={() =>
          set('driverOverrides', { ...item.driverOverrides, ['Driver 200W']: 1 })
        }
      >
        + Add override
      </button>
    </div>
  )
}

function DriverSummary({
  breakdown,
  isDali,
}: {
  breakdown: ReturnType<typeof calculateItem>
  isDali: boolean
}) {
  const drivers = breakdown.lineItems.filter((l) => l.category === 'driver')
  const controls = breakdown.lineItems.filter((l) => l.category === 'control')
  if (drivers.length === 0 && controls.length === 0) return null
  return (
    <div className="mt-3 border-t border-ink-100 pt-2">
      <p className="mb-1 text-[11px] font-semibold uppercase text-ink-500">
        Recommended configuration {isDali && '· DALI'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {[...drivers, ...controls].map((l) => (
          <span
            key={l.key}
            className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-ink-700 ring-1 ring-ink-200"
          >
            {l.description} × {l.qty}
          </span>
        ))}
      </div>
    </div>
  )
}

// small preview building blocks
function PreviewPanel({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-ink-900">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({
  k,
  v,
  strong,
  sub,
  sub2,
}: {
  k: string
  v: string
  strong?: boolean
  sub?: boolean
  sub2?: string
}) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-2', sub && 'pl-3 text-ink-400')}>
      <dt className={clsx('text-ink-500', strong && 'font-semibold text-ink-800')}>
        {k}
        {sub2 && <span className="block text-[10px] text-ink-400">{sub2}</span>}
      </dt>
      <dd className={clsx('tabular-nums text-ink-700', strong && 'font-semibold text-ink-900')}>
        {v}
      </dd>
    </div>
  )
}
