// ============================================================================
// Pongs Quote Maker — Calculation Engine (source of truth: spec §4)
// PURE + DETERMINISTIC + FRAMEWORK-FREE.
// Imports only ./pricing and ./types.
//   Quote -> calculateQuote(Quote) -> QuoteBreakdown
// ============================================================================

import {
  CONTROLS,
  CIRCLE_ROLL_WIDTHS,
  DALI_DRIVERS,
  DRIVER_BY_LABEL,
  DRIVER_LOAD_FACTOR,
  FABRIC,
  FLEECE,
  GRIPPER,
  GST_RATE,
  LED,
  LED_WATTS_PER_M,
  PRINTING,
  ROLL_WIDTHS,
  SQFT_PER_SQM,
  STANDARD_DRIVERS,
  baseTierFor,
  p,
} from './pricing'
import type {
  CeilingItem,
  FabricDetail,
  FabricPanel,
  ItemBreakdown,
  LEDDetail,
  LineItem,
  PriceTier,
  Quote,
  QuoteBreakdown,
} from './types'

const EPS = 1e-4 // 0.1 mm tolerance for floating point roll comparisons

// ---------------------------------------------------------------------------
// Formatting helpers (spec §7: live in calculations.ts)
// ---------------------------------------------------------------------------
export function fmtINR(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const rounded = Math.round(v)
  return '₹' + rounded.toLocaleString('en-IN')
}

export function fmtNum(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return '0'
  return n.toFixed(dp)
}

export function formatDims(item: CeilingItem): string {
  const u = item.unit === 'meters' ? 'm' : item.unit
  const d = item.dimensions
  switch (item.shape) {
    case 'rectangle':
      return `${d.dim1 ?? 0} × ${d.dim2 ?? 0} ${u}`
    case 'circle':
      return `⌀ ${d.diameter ?? 0} ${u}`
    case 'triangle':
      return `base ${d.dim1 ?? 0} × h ${d.dim2 ?? 0} ${u}`
    case 'l-shape':
      return `${d.length1 ?? 0}×${d.width1 ?? 0} + ${d.length2 ?? 0}×${d.width2 ?? 0} ${u}`
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Units & geometry (spec §4.1)
// ---------------------------------------------------------------------------
export function toM(v: number, unit: CeilingItem['unit']): number {
  const n = Number(v) || 0
  switch (unit) {
    case 'feet':
      return n * 0.3048
    case 'mm':
      return n * 0.001
    case 'meters':
      return n
  }
}

export interface Geometry {
  dim1M: number
  dim2M: number
  areaM2: number
  perimeterM: number
}

export function getGeometry(item: CeilingItem): Geometry {
  const d = item.dimensions
  const u = item.unit
  switch (item.shape) {
    case 'rectangle': {
      const a = toM(d.dim1 ?? 0, u)
      const b = toM(d.dim2 ?? 0, u)
      return { dim1M: a, dim2M: b, areaM2: a * b, perimeterM: 2 * (a + b) }
    }
    case 'circle': {
      const D = toM(d.diameter ?? 0, u)
      // treated as a D×D bounding square for area (install/printing); real circle area for fabric.
      return { dim1M: D, dim2M: D, areaM2: D * D, perimeterM: Math.PI * D }
    }
    case 'triangle': {
      const base = toM(d.dim1 ?? 0, u)
      const height = toM(d.dim2 ?? 0, u)
      const s1 = toM(d.side1 ?? 0, u)
      const s2 = toM(d.side2 ?? 0, u)
      const s3 = toM(d.side3 ?? 0, u)
      const perim = s1 + s2 + s3
      // bounding box for fabric axes: base × height
      return {
        dim1M: base,
        dim2M: height,
        areaM2: 0.5 * base * height,
        perimeterM: perim > 0 ? perim : base + 2 * Math.hypot(base / 2, height),
      }
    }
    case 'l-shape': {
      const L1 = toM(d.length1 ?? 0, u)
      const W1 = toM(d.width1 ?? 0, u)
      const L2 = toM(d.length2 ?? 0, u)
      const W2 = toM(d.width2 ?? 0, u)
      const area = L1 * W1 + L2 * W2
      const perim = 2 * (L1 + W1 + L2 + W2) - 2 * Math.min(W1, W2)
      // bounding box axes for fabric: overall extents
      return { dim1M: Math.max(L1, L2), dim2M: W1 + W2, areaM2: area, perimeterM: perim }
    }
  }
}

// ---------------------------------------------------------------------------
// Fabric roll selection & wastage (spec §4.2)
// ---------------------------------------------------------------------------

/** smallest standard roll >= w (with FP tolerance); null if > 5 m. */
export function bestRollForWidth(w: number, rolls: number[] = ROLL_WIDTHS): number | null {
  for (const r of rolls) {
    if (w <= r + EPS) return r
  }
  return null
}

function makePanel(rollAxis: number, cut: number): FabricPanel {
  const roll = bestRollForWidth(rollAxis) ?? 5
  const panelArea = roll * cut
  const usedArea = rollAxis * cut
  return {
    rollAxisM: rollAxis,
    cutM: cut,
    rollWidthM: roll,
    panelAreaM2: panelArea,
    usedAreaM2: usedArea,
    wastageM2: panelArea - usedArea,
  }
}

interface Orient {
  panels: FabricPanel[]
  wastage: number
  orientation: string
  jointRequired: boolean
}

/** No-joint orientation: pick lower-wastage roll axis; force the only fit; else joint required. */
function orientNoJoint(a: number, b: number): Orient {
  const aFits = a <= 5 + EPS
  const bFits = b <= 5 + EPS
  if (!aFits && !bFits) {
    return { panels: [], wastage: Infinity, orientation: 'joint-required', jointRequired: true }
  }
  const candidates: { rollAxis: number; cut: number; label: string }[] = []
  if (aFits) candidates.push({ rollAxis: a, cut: b, label: `${a.toFixed(2)}m on roll axis` })
  if (bFits) candidates.push({ rollAxis: b, cut: a, label: `${b.toFixed(2)}m on roll axis` })

  let best: Orient | null = null
  for (const c of candidates) {
    const panel = makePanel(c.rollAxis, c.cut)
    if (!best || panel.wastageM2 < best.wastage - EPS) {
      best = {
        panels: [panel],
        wastage: panel.wastageM2,
        orientation: c.label,
        jointRequired: false,
      }
    }
  }
  return best!
}

/** Center joint: split larger dim in half (×2 panels) vs smaller dim; keep lower wastage. */
function orientCenterJoint(a: number, b: number): Orient {
  const larger = Math.max(a, b)
  const smaller = Math.min(a, b)

  // Option A: split larger dim in half -> each half is a roll axis, smaller is cut.
  const halfLarge = larger / 2
  const optA =
    bestRollForWidth(halfLarge) !== null
      ? (() => {
          const panel = makePanel(halfLarge, smaller)
          return {
            panels: [panel, { ...panel }],
            wastage: panel.wastageM2 * 2,
            orientation: `center joint on ${larger.toFixed(2)}m dim (2 panels)`,
            jointRequired: false,
          }
        })()
      : null

  // Option B: split smaller dim in half.
  const halfSmall = smaller / 2
  const optB =
    bestRollForWidth(halfSmall) !== null
      ? (() => {
          const panel = makePanel(halfSmall, larger)
          return {
            panels: [panel, { ...panel }],
            wastage: panel.wastageM2 * 2,
            orientation: `center joint on ${smaller.toFixed(2)}m dim (2 panels)`,
            jointRequired: false,
          }
        })()
      : null

  const opts = [optA, optB].filter(Boolean) as Orient[]
  if (opts.length === 0) {
    return { panels: [], wastage: Infinity, orientation: 'joint-required', jointRequired: true }
  }
  opts.sort((x, y) => x.wastage - y.wastage)
  return opts[0]
}

/** Off-center joint: split larger dim at jointPosition mm from one end -> two panels. */
function orientOffCenter(a: number, b: number, jointPosMM: number): Orient {
  const larger = Math.max(a, b)
  const smaller = Math.min(a, b)
  const posM = (Number(jointPosMM) || 0) / 1000
  const p1 = posM
  const p2 = larger - posM
  if (p1 <= EPS || p2 <= EPS) {
    return {
      panels: [],
      wastage: Infinity,
      orientation: 'invalid joint position',
      jointRequired: true,
    }
  }
  if (bestRollForWidth(p1) === null || bestRollForWidth(p2) === null) {
    return {
      panels: [],
      wastage: Infinity,
      orientation: 'joint pieces exceed 5m',
      jointRequired: true,
    }
  }
  const panel1 = makePanel(p1, smaller)
  const panel2 = makePanel(p2, smaller)
  return {
    panels: [panel1, panel2],
    wastage: panel1.wastageM2 + panel2.wastageM2,
    orientation: `off-center joint at ${(posM).toFixed(2)}m on ${larger.toFixed(2)}m dim`,
    jointRequired: false,
  }
}

/**
 * Smart margin (spec §4.2): normally adds 2*margin to BOTH dims for billing only.
 * First fix the base orientation on the raw dims, then apply margin to that fixed
 * roll axis; if adding margin to the roll axis would bump it to a wider roll, move
 * the whole margin to the cut axis instead (roll axis kept in its bracket).
 */
function orientNoJointWithMargin(a: number, b: number, marginM: number): Orient {
  const base = orientNoJoint(a, b)
  if (base.jointRequired || marginM <= 0 || base.panels.length === 0) return base

  const { rollAxisM, cutM } = base.panels[0]
  const add = 2 * marginM
  const baseRoll = bestRollForWidth(rollAxisM)
  const bumpedRoll = bestRollForWidth(rollAxisM + add)
  const wouldBump = baseRoll !== null && bumpedRoll !== null && bumpedRoll > baseRoll

  const panel = wouldBump
    ? // keep roll axis raw, add both margins (own + moved) to the cut axis
      makePanel(rollAxisM, cutM + 2 * add)
    : makePanel(rollAxisM + add, cutM + add)

  return {
    panels: [panel],
    wastage: panel.wastageM2,
    orientation: base.orientation + (wouldBump ? ' (margin shifted to cut axis)' : ' (with margin)'),
    jointRequired: false,
  }
}

function circleFabric(D: number, marginM: number): FabricDetail {
  const margin = marginM > 0 ? marginM : 0.2
  const roll = bestRollForWidth(D, CIRCLE_ROLL_WIDTHS)
  const cut = D + 2 * margin
  if (roll === null) {
    return {
      requiredW: D,
      requiredL: D,
      orientation: 'circle > 5m — joint required',
      panels: [],
      billedAreaM2: 0,
      usedAreaM2: Math.PI * (D / 2) ** 2,
      wastageM2: 0,
      jointRequired: true,
      jointType: 'none',
      impossible: true,
      note: 'Circle diameter exceeds 5m roll — cannot be manufactured in one piece.',
    }
  }
  const billed = roll * cut
  const used = Math.PI * (D / 2) ** 2
  const panel: FabricPanel = {
    rollAxisM: D,
    cutM: cut,
    rollWidthM: roll,
    panelAreaM2: billed,
    usedAreaM2: used,
    wastageM2: billed - used,
  }
  return {
    requiredW: D,
    requiredL: D,
    orientation: `circle on ${roll}m roll`,
    panels: [panel],
    billedAreaM2: billed,
    usedAreaM2: used,
    wastageM2: billed - used,
    jointRequired: false,
    jointType: 'none',
    note: `Circle billed on ${roll}m roll, cut ${cut.toFixed(2)}m (margin ${margin}m/side).`,
  }
}

export function computeFabric(item: CeilingItem, geom: Geometry): FabricDetail {
  const marginM = (Number(item.marginMM) || 0) / 1000

  if (item.shape === 'circle') {
    return circleFabric(geom.dim1M, marginM)
  }

  const a0 = geom.dim1M
  const b0 = geom.dim2M
  const requiredW = a0
  const requiredL = b0

  let orient: Orient
  if (item.jointType === 'center') {
    orient = orientCenterJoint(a0, b0)
  } else if (item.jointType === 'off-center') {
    orient = orientOffCenter(a0, b0, item.jointPosition)
  } else {
    orient = orientNoJointWithMargin(a0, b0, marginM)
  }

  if (orient.jointRequired || orient.panels.length === 0) {
    return {
      requiredW,
      requiredL,
      orientation: orient.orientation,
      panels: [],
      billedAreaM2: 0,
      usedAreaM2: geom.areaM2,
      wastageM2: 0,
      jointRequired: true,
      jointType: item.jointType,
      impossible: item.jointType === 'none',
      note:
        item.jointType === 'none'
          ? 'Both dimensions exceed 5m — a joint is required to manufacture this panel.'
          : orient.orientation,
    }
  }

  // apply margin to jointed billing too (added to each panel's used footprint is billing-only;
  // spec says margin affects billing only for the no-joint smart path — for jointed we keep panels).
  const billed = orient.panels.reduce((s, pnl) => s + pnl.panelAreaM2, 0)
  const used = orient.panels.reduce((s, pnl) => s + pnl.usedAreaM2, 0)
  const wastage = orient.panels.reduce((s, pnl) => s + pnl.wastageM2, 0)

  return {
    requiredW,
    requiredL,
    orientation: orient.orientation,
    panels: orient.panels,
    billedAreaM2: billed,
    usedAreaM2: used,
    wastageM2: wastage,
    jointRequired: false,
    jointType: item.jointType,
  }
}

// ---------------------------------------------------------------------------
// LED strips, running metres, wattage (spec §4.4)
// ---------------------------------------------------------------------------
export function ledKeyFor(item: CeilingItem): string {
  const wider = item.ledWidth === 'wider'
  switch (item.lightType) {
    case 'tunable':
    case 'tunable_dali':
      return wider ? 'Wider Tunable' : 'Tunable'
    case 'rgb':
      return 'RGB'
    case 'rgbw':
      return 'RGBW/NW/WW'
    case 'single_color':
    case 'single_color_dimmable':
      if (wider) return 'Wider Single Colour'
      return item.ledModuleType === '12dot' ? 'Single Colour 12Dot' : 'Single Colour'
    default:
      return 'Single Colour'
  }
}

function wattsPerMFor(item: CeilingItem): number {
  const isSingle =
    item.lightType === 'single_color' || item.lightType === 'single_color_dimmable'
  if (isSingle) {
    return item.ledModuleType === '12dot'
      ? LED_WATTS_PER_M.singleColour12Dot
      : LED_WATTS_PER_M.singleColourStandard
  }
  return 13
}

export function computeLED(item: CeilingItem, geom: Geometry): LEDDetail {
  const shortM = Math.min(geom.dim1M, geom.dim2M)
  const longM = Math.max(geom.dim1M, geom.dim2M)
  const spacing = item.ledSpacingMM && item.ledSpacingMM > 0 ? item.ledSpacingMM : 125
  const shortMM = shortM * 1000
  const longMM = longM * 1000

  let strips = Math.ceil(shortMM / spacing) + 1
  if (item.shape === 'circle') {
    strips = Math.ceil(strips * 0.8)
  }
  const runningLengthM = Math.ceil(longMM / 1000) // whole 1m modules
  const totalRunningMeters = strips * runningLengthM
  const wattsPerM = wattsPerMFor(item)
  const totalWatts = totalRunningMeters * wattsPerM

  return {
    strips,
    spacingMM: spacing,
    runningLengthM,
    totalRunningMeters,
    wattsPerM,
    totalWatts,
    ledKey: ledKeyFor(item),
  }
}

// ---------------------------------------------------------------------------
// Driver packing (spec §4.5)
// ---------------------------------------------------------------------------
interface PackedDriver {
  label: string
  count: number
}

/** each standard driver holds floor(watts*0.85 / wpm) modules. */
function moduleCapacity(watts: number, wpm: number): number {
  return Math.floor((watts * DRIVER_LOAD_FACTOR) / wpm)
}

/**
 * packDrivers: excludes 600W unless it's the only option, prefers 200W, fills the bulk
 * with the preferred size, covers the remainder with the smallest driver that fits.
 */
function packDrivers(
  modules: number,
  wpm: number,
  forcedLabel?: string,
): PackedDriver[] {
  if (modules <= 0) return []

  // Forced single size
  if (forcedLabel) {
    const spec = DRIVER_BY_LABEL[forcedLabel]
    if (spec) {
      const cap = moduleCapacity(spec.watts, wpm)
      if (cap > 0) {
        return [{ label: spec.label, count: Math.ceil(modules / cap) }]
      }
    }
  }

  // Candidate drivers with capacity, excluding 600W unless only option.
  const withCap = STANDARD_DRIVERS.map((d) => ({
    spec: d,
    cap: moduleCapacity(d.watts, wpm),
  })).filter((x) => x.cap > 0)

  const non600 = withCap.filter((x) => x.spec.label !== '600W')
  const usable = non600.length > 0 ? non600 : withCap

  // Prefer 200W for the bulk if it exists in usable set.
  const preferred =
    usable.find((x) => x.spec.label === '200W') ??
    // otherwise the largest usable (excluding 600 handled above)
    usable.reduce((a, b) => (b.cap > a.cap ? b : a))

  const result: PackedDriver[] = []
  let remaining = modules

  const bulkCount = Math.floor(remaining / preferred.cap)
  if (bulkCount > 0) {
    result.push({ label: preferred.spec.label, count: bulkCount })
    remaining -= bulkCount * preferred.cap
  }

  if (remaining > 0) {
    // smallest driver that fits the remainder
    const fits = usable
      .filter((x) => x.cap >= remaining)
      .sort((a, b) => a.spec.watts - b.spec.watts)
    if (fits.length > 0) {
      const one = fits[0]
      const existing = result.find((r) => r.label === one.spec.label)
      if (existing) existing.count += 1
      else result.push({ label: one.spec.label, count: 1 })
    } else {
      // remainder bigger than any single driver's cap (shouldn't happen after bulk) -> add preferred
      const existing = result.find((r) => r.label === preferred.spec.label)
      const extra = Math.ceil(remaining / preferred.cap)
      if (existing) existing.count += extra
      else result.push({ label: preferred.spec.label, count: extra })
    }
  }

  return result
}

interface DriverBuildResult {
  driverLines: { description: string; qty: number; unitPrice: number; cost: number }[]
  controlLines: { description: string; qty: number; unitPrice: number; cost: number }[]
}

/**
 * buildDriverLines — per light type driver + control rules (spec §4.5 table).
 * `modules` = running metres to power (already multiplied by qty when looped).
 * `tier` is the effective pricing tier for drivers/controls.
 */
export function buildDriverLines(
  item: CeilingItem,
  modules: number,
  tier: PriceTier,
): DriverBuildResult {
  const driverLines: DriverBuildResult['driverLines'] = []
  const controlLines: DriverBuildResult['controlLines'] = []
  if (modules <= 0 || item.lightType === 'none') return { driverLines, controlLines }

  const forced = item.preferredDriverWatt

  const pushDriver = (label: string, qty: number) => {
    const spec = DRIVER_BY_LABEL[label]
    if (!spec || qty <= 0) return
    driverLines.push({
      description: `Driver ${label}`,
      qty,
      unitPrice: p(spec.price, tier),
      cost: spec.price.dealer,
    })
  }
  const pushDaliDriver = (name: keyof typeof DALI_DRIVERS, qty: number) => {
    const spec = DALI_DRIVERS[name]
    if (qty <= 0) return
    driverLines.push({
      description: name,
      qty,
      unitPrice: p(spec.price, tier),
      cost: spec.price.dealer,
    })
  }
  const pushControl = (name: string, qty: number) => {
    const price = CONTROLS[name]
    if (!price || qty <= 0) return
    controlLines.push({
      description: name,
      qty,
      unitPrice: p(price, tier),
      cost: price.dealer,
    })
  }

  const scWpm =
    item.ledModuleType === '12dot'
      ? LED_WATTS_PER_M.singleColour12Dot
      : LED_WATTS_PER_M.singleColourStandard

  switch (item.lightType) {
    case 'single_color': {
      const packed = packDrivers(modules, scWpm, forced)
      packed.forEach((d) => pushDriver(d.label, d.count))
      break
    }
    case 'single_color_dimmable': {
      if (item.dimmableWithoutDali) {
        // non-DALI: packed on SC wpm; EV1 = #drivers, V1 = ceil(reps/3), RT1 x1
        const packed = packDrivers(modules, scWpm, forced)
        const nDrivers = packed.reduce((s, d) => s + d.count, 0)
        packed.forEach((d) => pushDriver(d.label, d.count))
        pushControl('EV1 Power Repeater', nDrivers)
        pushControl('V1 Controller', Math.ceil(nDrivers / 3))
        pushControl('RT1 Remote', 1)
      } else {
        // DALI: DT2 200W x ceil(modules/13); no controls
        pushDaliDriver('DT2 200W', Math.ceil(modules / 13))
      }
      break
    }
    case 'tunable': {
      const packed = packDrivers(modules, 13, forced)
      const nDrivers = packed.reduce((s, d) => s + d.count, 0)
      packed.forEach((d) => pushDriver(d.label, d.count))
      pushControl('EV2 Power Repeater', nDrivers)
      pushControl('V2 Controller', Math.max(1, Math.ceil(nDrivers / 4)))
      pushControl('RT2 Remote', 1)
      break
    }
    case 'tunable_dali': {
      const drv = Math.ceil(modules / 10)
      if (item.daliDriver === 'da4m') {
        pushControl('DA4m', drv)
      } else {
        pushDaliDriver('DT8 150W', drv)
        pushControl('DA4m', Math.ceil(drv / 3))
      }
      break
    }
    case 'rgb':
    case 'rgbw': {
      const count = Math.ceil((modules * 13 * 1.2) / 600)
      pushDriver('600W', count)
      if (item.rgbDali) {
        // one controller per driver: DA4m (RGB) / DA5M (RGBW); no repeater/remote
        const ctrl = item.lightType === 'rgbw' ? 'DA5M' : 'DA4m'
        pushControl(ctrl, count)
      } else {
        pushControl('EV2 Power Repeater', count)
        pushControl('V2 Controller', Math.ceil(count / 4))
        pushControl('RT2 Remote', 1)
      }
      break
    }
  }

  return { driverLines, controlLines }
}

// ---------------------------------------------------------------------------
// Item calculation (spec §4.3, §4.7)
// ---------------------------------------------------------------------------
export interface CalcItemOptions {
  skipDrivers?: boolean // for cross-item loop groups
}

export function calculateItem(
  item: CeilingItem,
  quote: Quote,
  opts: CalcItemOptions = {},
): ItemBreakdown {
  const errors: string[] = []
  const warnings: string[] = []
  const tier = quote.priceTier
  const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
  if (qty <= 0) errors.push('Quantity must be greater than 0.')

  const geom = getGeometry(item)
  if (geom.areaM2 <= 0) errors.push('Dimensions must produce a positive area.')

  const lineItems: LineItem[] = []
  const driverTier: PriceTier =
    tier === 'manual' ? baseTierFor(tier, quote.manualRates?.otherItemsTier) : tier

  // --- Fabric ---
  const fabricDetail = computeFabric(item, geom)
  if (fabricDetail.jointRequired && item.jointType === 'none') {
    errors.push(
      'Fabric cannot be manufactured in one piece — a joint is required (both sides exceed 5m).',
    )
  } else if (fabricDetail.jointRequired) {
    errors.push(fabricDetail.note ?? 'Fabric configuration is invalid.')
  }

  const fabricRate =
    tier === 'manual' && quote.manualRates
      ? quote.manualRates.fabricPerSqm
      : p(FABRIC[item.fabricType] ?? FABRIC['Descor Premium'], tier)
  const fabricQty = fabricDetail.billedAreaM2 * qty
  if (fabricQty > 0) {
    lineItems.push({
      key: 'fabric',
      category: 'fabric',
      description: `${item.fabricType} fabric`,
      detail: `${fmtNum(fabricDetail.billedAreaM2)} m²/pc × ${qty}`,
      qty: fabricQty,
      unit: 'm²',
      rate: fabricRate,
      tierAmount: fabricQty * fabricRate,
      costAmount: fabricQty * (FABRIC[item.fabricType]?.dealer ?? 0),
    })
  }

  // --- Printing ---
  if (item.withPrinting) {
    const rate =
      item.printingRatePerSqm != null && item.printingRatePerSqm > 0
        ? item.printingRatePerSqm
        : p(PRINTING, tier === 'manual' ? driverTier : tier)
    const q = geom.areaM2 * qty
    lineItems.push({
      key: 'printing',
      category: 'printing',
      description: 'Digital printing',
      detail: `${fmtNum(geom.areaM2)} m² × ${qty}`,
      qty: q,
      unit: 'm²',
      rate,
      tierAmount: q * rate,
      costAmount: q * PRINTING.dealer,
    })
  }

  // --- Fleece ---
  if (item.withFleece) {
    const rate = p(FLEECE, tier === 'manual' ? driverTier : tier)
    const q = geom.areaM2 * qty
    lineItems.push({
      key: 'fleece',
      category: 'fleece',
      description: 'Acoustic fleece / felt backing',
      detail: `${fmtNum(geom.areaM2)} m² × ${qty}`,
      qty: q,
      unit: 'm²',
      rate,
      tierAmount: q * rate,
      costAmount: q * FLEECE.dealer,
    })
  }

  // --- Gripper ---
  let gripperMeters: number
  if (!fabricDetail.jointRequired && fabricDetail.panels.length > 1) {
    // jointed: sum each panel perimeter 2*(width + cut)
    gripperMeters = fabricDetail.panels.reduce(
      (s, pnl) => s + 2 * (pnl.rollAxisM + pnl.cutM),
      0,
    )
  } else {
    gripperMeters = geom.perimeterM
  }
  const gripperRmt = Math.ceil(gripperMeters) // sold in 1m lengths, round UP
  const gripperTotal = gripperRmt * qty
  const gripperRate =
    tier === 'manual' && quote.manualRates
      ? quote.manualRates.gripperPerRmt
      : p(GRIPPER[item.gripperType] ?? GRIPPER.CW, tier)
  if (gripperTotal > 0) {
    lineItems.push({
      key: 'gripper',
      category: 'gripper',
      description: `${item.gripperType} gripper track`,
      detail: `${gripperRmt} rmt/pc × ${qty}`,
      qty: gripperTotal,
      unit: 'rmt',
      rate: gripperRate,
      tierAmount: gripperTotal * gripperRate,
      costAmount: gripperTotal * (GRIPPER[item.gripperType]?.dealer ?? 0),
    })
  }

  // --- LED + drivers ---
  let ledDetail: LEDDetail | undefined
  if (item.lightType !== 'none') {
    ledDetail = computeLED(item, geom)
    const ledRate =
      tier === 'manual' && quote.manualRates
        ? quote.manualRates.ledPerMtr
        : p(LED[ledDetail.ledKey] ?? LED['Single Colour'], tier)
    const ledQty = ledDetail.totalRunningMeters * qty
    if (ledQty > 0) {
      lineItems.push({
        key: 'led',
        category: 'led',
        description: `${ledDetail.ledKey} LED strip`,
        detail: `${ledDetail.strips} strips × ${ledDetail.runningLengthM}m = ${ledDetail.totalRunningMeters}m/pc × ${qty}`,
        qty: ledQty,
        unit: 'm',
        rate: ledRate,
        tierAmount: ledQty * ledRate,
        costAmount: ledQty * (LED[ledDetail.ledKey]?.dealer ?? 0),
      })
    }

    if (!opts.skipDrivers) {
      // quantity looping: non-looped sizes per ceiling then × qty; looped sizes once from total.
      const looped = item.lightingConfig === 'looped'
      const modulesPerPiece = ledDetail.totalRunningMeters
      const { driverLines, controlLines } = looped
        ? buildDriverLines(item, modulesPerPiece * qty, driverTier)
        : (() => {
            const per = buildDriverLines(item, modulesPerPiece, driverTier)
            return {
              driverLines: per.driverLines.map((d) => ({ ...d, qty: d.qty * qty })),
              controlLines: per.controlLines.map((c) => ({ ...c, qty: c.qty * qty })),
            }
          })()

      addDriverControlLines(lineItems, driverLines, controlLines, item.driverOverrides)
    }
  }

  // --- Installation ---
  const installationCost = geom.areaM2 * SQFT_PER_SQM * (quote.installationRatePerSqft || 0) * qty

  // --- Totals ---
  const subtotalTier = lineItems.reduce((s, li) => s + li.tierAmount, 0)
  const itemTotal = subtotalTier + installationCost
  const sqft = geom.areaM2 * SQFT_PER_SQM * qty

  // Guard against NaN/Infinity
  lineItems.forEach((li) => {
    if (!Number.isFinite(li.tierAmount)) {
      li.tierAmount = 0
      errors.push(`Invalid amount computed for ${li.description}.`)
    }
  })

  return {
    itemId: item.id,
    itemName: item.name || 'Untitled item',
    lineItems,
    fabricDetail,
    ledDetail,
    areaM2: geom.areaM2,
    perimeterM: geom.perimeterM,
    sqft,
    installationCost: Number.isFinite(installationCost) ? installationCost : 0,
    subtotalTier: Number.isFinite(subtotalTier) ? subtotalTier : 0,
    itemTotal: Number.isFinite(itemTotal) ? itemTotal : 0,
    errors,
    warnings,
  }
}

function addDriverControlLines(
  lineItems: LineItem[],
  driverLines: DriverBuildResult['driverLines'],
  controlLines: DriverBuildResult['controlLines'],
  overrides: Record<string, number>,
) {
  const applyOverride = (desc: string, qty: number) => {
    if (overrides && overrides[desc] != null && Number.isFinite(overrides[desc])) {
      return Math.max(0, Math.floor(overrides[desc]))
    }
    return qty
  }
  driverLines.forEach((d) => {
    const q = applyOverride(d.description, d.qty)
    if (q <= 0) return
    lineItems.push({
      key: `driver:${d.description}`,
      category: 'driver',
      description: d.description,
      detail: 'LED driver',
      qty: q,
      unit: 'no',
      rate: d.unitPrice,
      tierAmount: q * d.unitPrice,
      costAmount: q * d.cost,
    })
  })
  controlLines.forEach((c) => {
    const q = applyOverride(c.description, c.qty)
    if (q <= 0) return
    lineItems.push({
      key: `control:${c.description}`,
      category: 'control',
      description: c.description,
      detail: 'Lighting control',
      qty: q,
      unit: 'no',
      rate: c.unitPrice,
      tierAmount: q * c.unitPrice,
      costAmount: q * c.cost,
    })
  })
}

// ---------------------------------------------------------------------------
// Manual custom (spec §4.8)
// ---------------------------------------------------------------------------
function calculateCustom(quote: Quote): QuoteBreakdown {
  const lines: LineItem[] = (quote.customLines ?? []).map((cl) => {
    const qty = Number(cl.qty) || 0
    const price = Number(cl.sellingPrice) || 0
    return {
      key: `custom:${cl.id}`,
      category: 'custom' as const,
      description: cl.description || 'Custom line',
      qty,
      unit: 'no',
      rate: price,
      tierAmount: qty * price,
      costAmount: qty * (Number(cl.cost) || 0),
    }
  })
  const materials = lines.reduce((s, l) => s + l.tierAmount, 0)
  const subtotalBeforeGst = materials + (quote.transportCost || 0)
  const gstAmount = quote.includeGst ? subtotalBeforeGst * GST_RATE : 0
  const grandTotal = subtotalBeforeGst + gstAmount
  return {
    itemBreakdowns: [],
    customLineItems: lines,
    materialsTotalTier: materials,
    materialsTotalFinal: materials,
    markupAmount: 0,
    totalInstallation: 0,
    transportCost: quote.transportCost || 0,
    subtotalBeforeGst,
    gstAmount,
    grandTotal,
    totalSqft: 0,
    pricePerSqft: 0,
    isCustom: true,
    errors: [],
    warnings: [],
  }
}

// ---------------------------------------------------------------------------
// Cross-item loop groups (spec §4.6)
// ---------------------------------------------------------------------------
function applyLoopGroups(quote: Quote, breakdowns: ItemBreakdown[]) {
  const driverTier: PriceTier =
    quote.priceTier === 'manual'
      ? baseTierFor(quote.priceTier, quote.manualRates?.otherItemsTier)
      : quote.priceTier

  const groups = new Map<number, CeilingItem[]>()
  quote.items.forEach((it) => {
    const g = it.loopGroup
    if (g != null && g > 0 && it.lightType !== 'none') {
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(it)
    }
  })

  groups.forEach((members) => {
    if (members.length === 0) return
    // combined running metres × qty
    let totalModules = 0
    members.forEach((it) => {
      const geom = getGeometry(it)
      const led = computeLED(it, geom)
      totalModules += led.totalRunningMeters * Math.max(0, Math.floor(Number(it.quantity) || 0))
    })
    // first lit member drives the driver params
    const primary = members[0]
    const { driverLines, controlLines } = buildDriverLines(primary, totalModules, driverTier)
    const bd = breakdowns.find((b) => b.itemId === primary.id)
    if (bd) {
      addDriverControlLines(bd.lineItems, driverLines, controlLines, primary.driverOverrides)
      bd.subtotalTier = bd.lineItems.reduce((s, li) => s + li.tierAmount, 0)
      bd.itemTotal = bd.subtotalTier + bd.installationCost
    }
  })
}

// ---------------------------------------------------------------------------
// Quote roll-up (spec §4.7)
// ---------------------------------------------------------------------------
export function calculateQuote(quote: Quote): QuoteBreakdown {
  if (quote.priceTier === 'manual_custom') {
    return calculateCustom(quote)
  }

  const hasLoopGroups = quote.items.some((it) => (it.loopGroup ?? 0) > 0)

  const itemBreakdowns = quote.items.map((it) =>
    calculateItem(it, quote, {
      skipDrivers: hasLoopGroups && (it.loopGroup ?? 0) > 0 && it.lightType !== 'none',
    }),
  )

  if (hasLoopGroups) {
    applyLoopGroups(quote, itemBreakdowns)
  }

  const errors = itemBreakdowns.flatMap((b) => b.errors)
  const warnings = itemBreakdowns.flatMap((b) => b.warnings)

  const materialsTotalTier = itemBreakdowns.reduce((s, b) => s + b.subtotalTier, 0)
  const markupPct = Number(quote.markupPercent) || 0
  const materialsTotalFinal = materialsTotalTier * (1 + markupPct / 100)
  const markupAmount = materialsTotalFinal - materialsTotalTier
  const totalInstallation = itemBreakdowns.reduce((s, b) => s + b.installationCost, 0)
  const transportCost = Number(quote.transportCost) || 0
  const subtotalBeforeGst = materialsTotalFinal + totalInstallation + transportCost
  const gstAmount = quote.includeGst ? subtotalBeforeGst * GST_RATE : 0
  const grandTotal = subtotalBeforeGst + gstAmount
  const totalSqft = itemBreakdowns.reduce((s, b) => s + b.sqft, 0)
  const pricePerSqft = totalSqft > 0 ? grandTotal / totalSqft : 0

  return {
    itemBreakdowns,
    materialsTotalTier,
    materialsTotalFinal,
    markupAmount,
    totalInstallation,
    transportCost,
    subtotalBeforeGst,
    gstAmount,
    grandTotal,
    totalSqft,
    pricePerSqft,
    isCustom: false,
    errors,
    warnings,
  }
}
