import { describe, it, expect } from 'vitest'
import {
  bestRollForWidth,
  calculateItem,
  calculateQuote,
  computeFabric,
  computeLED,
  getGeometry,
  ledKeyFor,
  toM,
  buildDriverLines,
} from './calculations'
import { newItem, newQuote } from './defaults'
import type { CeilingItem, Quote } from './types'

function item(overrides: Partial<CeilingItem> = {}): CeilingItem {
  return newItem(overrides)
}
function quote(items: CeilingItem[], overrides: Partial<Quote> = {}): Quote {
  return newQuote({ items, ...overrides })
}

// ---------------------------------------------------------------------------
describe('units & geometry', () => {
  it('converts units', () => {
    expect(toM(1000, 'mm')).toBeCloseTo(1)
    expect(toM(1, 'feet')).toBeCloseTo(0.3048)
    expect(toM(3, 'meters')).toBe(3)
  })

  it('rectangle geometry', () => {
    const g = getGeometry(item({ shape: 'rectangle', unit: 'meters', dimensions: { dim1: 6, dim2: 4 } }))
    expect(g.areaM2).toBeCloseTo(24)
    expect(g.perimeterM).toBeCloseTo(20)
  })

  it('circle geometry uses bounding square for area', () => {
    const g = getGeometry(item({ shape: 'circle', unit: 'meters', dimensions: { diameter: 4 } }))
    expect(g.areaM2).toBeCloseTo(16) // D*D
    expect(g.perimeterM).toBeCloseTo(Math.PI * 4)
  })

  it('triangle area = 0.5 base*height', () => {
    const g = getGeometry(
      item({ shape: 'triangle', unit: 'meters', dimensions: { dim1: 4, dim2: 3, side1: 5, side2: 4, side3: 3 } }),
    )
    expect(g.areaM2).toBeCloseTo(6)
    expect(g.perimeterM).toBeCloseTo(12)
  })

  it('l-shape area = two rectangles', () => {
    const g = getGeometry(
      item({ shape: 'l-shape', unit: 'meters', dimensions: { length1: 4, width1: 2, length2: 3, width2: 1 } }),
    )
    expect(g.areaM2).toBeCloseTo(4 * 2 + 3 * 1)
    // perimeter = 2(L1+W1+L2+W2) - 2*min(W1,W2)
    expect(g.perimeterM).toBeCloseTo(2 * (4 + 2 + 3 + 1) - 2 * 1)
  })
})

// ---------------------------------------------------------------------------
describe('fabric roll selection', () => {
  it('bestRollForWidth picks smallest fitting roll', () => {
    expect(bestRollForWidth(1.8)).toBe(2)
    expect(bestRollForWidth(2.0)).toBe(2)
    expect(bestRollForWidth(2.5)).toBe(3)
    expect(bestRollForWidth(3.1)).toBe(4)
    expect(bestRollForWidth(4.9)).toBe(5)
    expect(bestRollForWidth(5.0)).toBe(5)
    expect(bestRollForWidth(5.1)).toBeNull()
  })

  it('no joint: picks lower-wastage orientation', () => {
    // 4.8 x 3.2: axis 3.2->roll4 waste=(4-3.2)*4.8=3.84 ; axis 4.8->roll5 waste=(5-4.8)*3.2=0.64
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4.8, dim2: 3.2 } })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.jointRequired).toBe(false)
    expect(fab.panels).toHaveLength(1)
    expect(fab.panels[0].rollWidthM).toBe(5)
    expect(fab.wastageM2).toBeCloseTo(0.64, 2)
  })

  it('one dimension over 5m forces the other as roll axis', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 6.2, dim2: 3.8 } })
    const fab = computeFabric(it, getGeometry(it))
    // 3.8 fits (roll 4), 6.2 does not -> roll axis 3.8, cut 6.2
    expect(fab.jointRequired).toBe(false)
    expect(fab.panels[0].rollAxisM).toBeCloseTo(3.8)
    expect(fab.panels[0].cutM).toBeCloseTo(6.2)
    expect(fab.panels[0].rollWidthM).toBe(4)
  })

  it('both dims over 5m without joint => impossible', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 6, dim2: 6 } })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.jointRequired).toBe(true)
    expect(fab.impossible).toBe(true)
  })

  it('center joint splits larger dim into two panels', () => {
    const it = item({ shape: 'rectangle', jointType: 'center', dimensions: { dim1: 8, dim2: 3 } })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.jointRequired).toBe(false)
    expect(fab.panels).toHaveLength(2)
    // splitting 8 -> 4 each (roll axis 4), cut 3
    expect(fab.panels[0].rollAxisM).toBeCloseTo(4)
  })

  it('off-center joint splits at position', () => {
    const it = item({
      shape: 'rectangle',
      jointType: 'off-center',
      jointPosition: 3000, // 3m from one end of the 8m dim
      dimensions: { dim1: 8, dim2: 3 },
    })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.jointRequired).toBe(false)
    expect(fab.panels).toHaveLength(2)
    const axes = fab.panels.map((p) => p.rollAxisM).sort()
    expect(axes[0]).toBeCloseTo(3)
    expect(axes[1]).toBeCloseTo(5)
  })

  it('circle uses real circle area for usedArea', () => {
    const it = item({ shape: 'circle', dimensions: { diameter: 3 } })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.usedAreaM2).toBeCloseTo(Math.PI * 1.5 * 1.5)
    expect(fab.panels[0].rollWidthM).toBe(3)
    // cut = D + 2*0.2 = 3.4 ; billed = 3 * 3.4
    expect(fab.billedAreaM2).toBeCloseTo(3 * 3.4)
  })

  it('smart margin moves margin off roll axis when it would bump a bracket', () => {
    // 2.0 x 4.0, margin 100mm/side. roll axis 2.0+0.2=2.2 -> would bump 2->3. Move to cut axis.
    const it = item({ shape: 'rectangle', marginMM: 100, dimensions: { dim1: 2.0, dim2: 4.0 } })
    const fab = computeFabric(it, getGeometry(it))
    expect(fab.panels[0].rollWidthM).toBe(2) // stayed in the 2m bracket
  })
})

// ---------------------------------------------------------------------------
describe('gripper', () => {
  it('rounds up to whole metres and multiplies by qty', () => {
    const it = item({ shape: 'rectangle', quantity: 2, gripperType: 'CW', dimensions: { dim1: 3.3, dim2: 2.2 } })
    const bd = calculateItem(it, quote([it]))
    const grip = bd.lineItems.find((l) => l.category === 'gripper')!
    // perimeter = 2*(3.3+2.2)=11 -> ceil 11 * qty 2 = 22
    expect(grip.qty).toBe(22)
  })
})

// ---------------------------------------------------------------------------
describe('LED', () => {
  it('strip count = ceil(short/spacing)+1', () => {
    const it = item({
      shape: 'rectangle',
      lightType: 'single_color',
      ledSpacingMM: 125,
      dimensions: { dim1: 6, dim2: 2 },
    })
    const led = computeLED(it, getGeometry(it))
    // short=2m=2000mm; ceil(2000/125)+1 = 16+1 = 17
    expect(led.strips).toBe(17)
    // long=6m -> running length 6 ; total = 17*6=102
    expect(led.runningLengthM).toBe(6)
    expect(led.totalRunningMeters).toBe(102)
  })

  it('circle reduces strips by 0.8', () => {
    const it = item({ shape: 'circle', lightType: 'single_color', ledSpacingMM: 125, dimensions: { diameter: 2 } })
    const led = computeLED(it, getGeometry(it))
    // strips base ceil(2000/125)+1=17 -> ceil(17*0.8)=14
    expect(led.strips).toBe(14)
  })

  it('wattage per metre by type', () => {
    const sc = computeLED(item({ lightType: 'single_color', ledModuleType: 'standard', dimensions: { dim1: 2, dim2: 2 } }), getGeometry(item({ dimensions: { dim1: 2, dim2: 2 } })))
    expect(sc.wattsPerM).toBe(12.5)
    const dot = computeLED(item({ lightType: 'single_color', ledModuleType: '12dot', dimensions: { dim1: 2, dim2: 2 } }), getGeometry(item({ dimensions: { dim1: 2, dim2: 2 } })))
    expect(dot.wattsPerM).toBe(15)
    const tun = computeLED(item({ lightType: 'tunable', dimensions: { dim1: 2, dim2: 2 } }), getGeometry(item({ dimensions: { dim1: 2, dim2: 2 } })))
    expect(tun.wattsPerM).toBe(13)
  })

  it('ledKey selection', () => {
    expect(ledKeyFor(item({ lightType: 'tunable', ledWidth: 'wider' }))).toBe('Wider Tunable')
    expect(ledKeyFor(item({ lightType: 'tunable' }))).toBe('Tunable')
    expect(ledKeyFor(item({ lightType: 'rgb' }))).toBe('RGB')
    expect(ledKeyFor(item({ lightType: 'rgbw' }))).toBe('RGBW/NW/WW')
    expect(ledKeyFor(item({ lightType: 'single_color', ledModuleType: '12dot' }))).toBe('Single Colour 12Dot')
    expect(ledKeyFor(item({ lightType: 'single_color', ledWidth: 'wider' }))).toBe('Wider Single Colour')
  })
})

// ---------------------------------------------------------------------------
describe('drivers & controls', () => {
  it('single colour packs drivers preferring 200W avoiding 600W', () => {
    const { driverLines } = buildDriverLines(item({ lightType: 'single_color' }), 200, 'dealer')
    // 200 modules @ 12.5wpm; 200W cap=floor(200*.85/12.5)=13 -> ceil bulk
    expect(driverLines.length).toBeGreaterThan(0)
    expect(driverLines.some((d) => d.description.includes('600W'))).toBe(false)
    expect(driverLines.some((d) => d.description.includes('200W'))).toBe(true)
  })

  it('single colour dimmable DALI uses DT2 200W and no controls', () => {
    const { driverLines, controlLines } = buildDriverLines(
      item({ lightType: 'single_color_dimmable', dimmableWithoutDali: false }),
      26,
      'dealer',
    )
    expect(driverLines[0].description).toBe('DT2 200W')
    expect(driverLines[0].qty).toBe(Math.ceil(26 / 13))
    expect(controlLines).toHaveLength(0)
  })

  it('single colour dimmable non-DALI adds EV1/V1/RT1', () => {
    const { driverLines, controlLines } = buildDriverLines(
      item({ lightType: 'single_color_dimmable', dimmableWithoutDali: true }),
      50,
      'dealer',
    )
    const nDrivers = driverLines.reduce((s, d) => s + d.qty, 0)
    expect(controlLines.find((c) => c.description === 'EV1 Power Repeater')!.qty).toBe(nDrivers)
    expect(controlLines.find((c) => c.description === 'V1 Controller')!.qty).toBe(Math.ceil(nDrivers / 3))
    expect(controlLines.find((c) => c.description === 'RT1 Remote')!.qty).toBe(1)
  })

  it('tunable adds EV2/V2/RT2', () => {
    const { driverLines, controlLines } = buildDriverLines(item({ lightType: 'tunable' }), 60, 'dealer')
    const nDrivers = driverLines.reduce((s, d) => s + d.qty, 0)
    expect(controlLines.find((c) => c.description === 'EV2 Power Repeater')!.qty).toBe(nDrivers)
    expect(controlLines.find((c) => c.description === 'V2 Controller')!.qty).toBe(Math.max(1, Math.ceil(nDrivers / 4)))
    expect(controlLines.find((c) => c.description === 'RT2 Remote')!.qty).toBe(1)
  })

  it('tunable_dali DT8 path adds DA4m = ceil(drv/3)', () => {
    const { driverLines, controlLines } = buildDriverLines(
      item({ lightType: 'tunable_dali', daliDriver: 'dt8' }),
      50,
      'dealer',
    )
    const drv = Math.ceil(50 / 10)
    expect(driverLines.find((d) => d.description === 'DT8 150W')!.qty).toBe(drv)
    expect(controlLines.find((c) => c.description === 'DA4m')!.qty).toBe(Math.ceil(drv / 3))
  })

  it('tunable_dali da4m path uses only DA4m drivers', () => {
    const { driverLines, controlLines } = buildDriverLines(
      item({ lightType: 'tunable_dali', daliDriver: 'da4m' }),
      50,
      'dealer',
    )
    const drv = Math.ceil(50 / 10)
    expect(controlLines.find((c) => c.description === 'DA4m')!.qty).toBe(drv)
    expect(driverLines).toHaveLength(0)
  })

  it('rgb analog uses 600W count and EV2/V2/RT2', () => {
    const { driverLines, controlLines } = buildDriverLines(item({ lightType: 'rgb', rgbDali: false }), 30, 'dealer')
    const count = Math.ceil((30 * 13 * 1.2) / 600)
    expect(driverLines.find((d) => d.description === 'Driver 600W')!.qty).toBe(count)
    expect(controlLines.find((c) => c.description === 'EV2 Power Repeater')!.qty).toBe(count)
  })

  it('rgbw DALI uses DA5M one per driver, no repeater', () => {
    const { driverLines, controlLines } = buildDriverLines(item({ lightType: 'rgbw', rgbDali: true }), 30, 'dealer')
    const count = driverLines.find((d) => d.description === 'Driver 600W')!.qty
    expect(controlLines.find((c) => c.description === 'DA5M')!.qty).toBe(count)
    expect(controlLines.find((c) => c.description === 'EV2 Power Repeater')).toBeUndefined()
  })

  it('preferred driver watt forces one size', () => {
    const { driverLines } = buildDriverLines(item({ lightType: 'single_color', preferredDriverWatt: '100W' }), 50, 'dealer')
    expect(driverLines).toHaveLength(1)
    expect(driverLines[0].description).toBe('Driver 100W')
  })

  it('driver override forces total qty', () => {
    const it = item({
      lightType: 'single_color',
      quantity: 1,
      driverOverrides: { 'Driver 200W': 5 },
      dimensions: { dim1: 6, dim2: 2 },
    })
    const bd = calculateItem(it, quote([it]))
    const drv = bd.lineItems.find((l) => l.description === 'Driver 200W')
    if (drv) expect(drv.qty).toBe(5)
  })
})

// ---------------------------------------------------------------------------
describe('looping', () => {
  it('non-looped multiplies driver qty by piece count', () => {
    const it = item({ lightType: 'single_color', lightingConfig: 'non_looped', quantity: 3, dimensions: { dim1: 6, dim2: 2 } })
    const bd = calculateItem(it, quote([it]))
    const looped = item({ ...it, lightingConfig: 'looped', id: it.id })
    const bd2 = calculateItem(looped, quote([looped]))
    const drvNon = bd.lineItems.filter((l) => l.category === 'driver').reduce((s, l) => s + l.qty, 0)
    const drvLoop = bd2.lineItems.filter((l) => l.category === 'driver').reduce((s, l) => s + l.qty, 0)
    expect(drvNon).toBeGreaterThanOrEqual(drvLoop)
  })

  it('cross-item loop group shares one driver set on the primary member', () => {
    const a = item({ lightType: 'single_color', loopGroup: 1, quantity: 1, dimensions: { dim1: 4, dim2: 2 } })
    const b = item({ lightType: 'single_color', loopGroup: 1, quantity: 1, dimensions: { dim1: 4, dim2: 2 } })
    const q = quote([a, b])
    const bd = calculateQuote(q)
    const aDrivers = bd.itemBreakdowns[0].lineItems.filter((l) => l.category === 'driver')
    const bDrivers = bd.itemBreakdowns[1].lineItems.filter((l) => l.category === 'driver')
    expect(bDrivers).toHaveLength(0) // second member has no driver set
    expect(aDrivers.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
describe('quote roll-up', () => {
  it('markup applies to materials only, GST on subtotal', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 }, lightType: 'none' })
    const q = quote([it], { priceTier: 'dealer', markupPercent: 10, transportCost: 1000, includeGst: true, installationRatePerSqft: 120 })
    const bd = calculateQuote(q)
    const mat = bd.materialsTotalTier
    expect(bd.materialsTotalFinal).toBeCloseTo(mat * 1.1)
    const expectedSub = mat * 1.1 + bd.totalInstallation + 1000
    expect(bd.subtotalBeforeGst).toBeCloseTo(expectedSub)
    expect(bd.gstAmount).toBeCloseTo(expectedSub * 0.18)
    expect(bd.grandTotal).toBeCloseTo(expectedSub * 1.18)
  })

  it('installation = area sqft * rate * qty', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 }, quantity: 2, lightType: 'none' })
    const bd = calculateItem(it, quote([it], { installationRatePerSqft: 120 }))
    expect(bd.installationCost).toBeCloseTo(12 * 10.7639 * 120 * 2)
  })

  it('per-sqft price computed', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 }, lightType: 'none' })
    const bd = calculateQuote(quote([it]))
    expect(bd.pricePerSqft).toBeCloseTo(bd.grandTotal / bd.totalSqft)
  })

  it('no NaN / Infinity / negative in totals', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 } })
    const bd = calculateQuote(quote([it]))
    expect(Number.isFinite(bd.grandTotal)).toBe(true)
    expect(bd.grandTotal).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
describe('tiers & manual modes', () => {
  it('msp tier uses msp column', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 }, fabricType: 'Descor Premium', lightType: 'none' })
    const bd = calculateItem(it, quote([it], { priceTier: 'msp' }))
    const fab = bd.lineItems.find((l) => l.category === 'fabric')!
    expect(fab.rate).toBe(1300) // msp
  })

  it('manual tier uses manualRates for fabric/led/gripper', () => {
    const it = item({ shape: 'rectangle', dimensions: { dim1: 4, dim2: 3 }, lightType: 'single_color' })
    const q = quote([it], {
      priceTier: 'manual',
      manualRates: { fabricPerSqm: 999, ledPerMtr: 88, gripperPerRmt: 77, otherItemsTier: 'msp' },
    })
    const bd = calculateItem(it, q)
    expect(bd.lineItems.find((l) => l.category === 'fabric')!.rate).toBe(999)
    expect(bd.lineItems.find((l) => l.category === 'led')!.rate).toBe(88)
    expect(bd.lineItems.find((l) => l.category === 'gripper')!.rate).toBe(77)
  })

  it('manual_custom bypasses engine', () => {
    const q = newQuote({
      priceTier: 'manual_custom',
      items: [],
      transportCost: 500,
      includeGst: true,
      customLines: [
        { id: '1', description: 'Custom A', qty: 2, cost: 100, sellingPrice: 300 },
        { id: '2', description: 'Custom B', qty: 1, cost: 50, sellingPrice: 150 },
      ],
    })
    const bd = calculateQuote(q)
    expect(bd.isCustom).toBe(true)
    const materials = 2 * 300 + 1 * 150
    expect(bd.materialsTotalTier).toBe(materials)
    expect(bd.markupAmount).toBe(0)
    expect(bd.totalInstallation).toBe(0)
    expect(bd.grandTotal).toBeCloseTo((materials + 500) * 1.18)
  })
})

// ---------------------------------------------------------------------------
describe('units in fabric', () => {
  it('feet dimensions convert correctly', () => {
    const it = item({ shape: 'rectangle', unit: 'feet', dimensions: { dim1: 10, dim2: 6 } })
    const g = getGeometry(it)
    expect(g.dim1M).toBeCloseTo(3.048)
    expect(g.dim2M).toBeCloseTo(1.8288)
  })
  it('mm dimensions convert correctly', () => {
    const it = item({ shape: 'rectangle', unit: 'mm', dimensions: { dim1: 4000, dim2: 3000 } })
    const g = getGeometry(it)
    expect(g.areaM2).toBeCloseTo(12)
  })
})
