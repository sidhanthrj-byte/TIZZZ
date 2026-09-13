// ============================================================================
// Pongs Quote Maker — Price tables (source of truth: spec §3)
// All prices are three-tier { dealer, msp, specifiors } in INR.
// ============================================================================

import type { BaseTier, PriceTier } from './types'

export interface TierPrice {
  dealer: number
  msp: number
  specifiors: number
}

const t = (dealer: number, msp: number, specifiors: number): TierPrice => ({
  dealer,
  msp,
  specifiors,
})

// --- Fabric (₹/sqm) ---------------------------------------------------------
export const FABRIC: Record<string, TierPrice> = {
  'Descor Premium': t(1100, 1300, 1200),
  'Descor Premium Acoustic': t(1815, 2265, 2015),
  'Descor Translucent': t(2035, 2800, 2400),
  'Soundscape Directex': t(1850, 3000, 2500),
  'Silencio 10': t(1950, 2500, 2300),
  'Silencio 5': t(1950, 2500, 2300),
  'Akustico Weiss': t(1800, 2300, 2200),
  'Descor Premium Dry & Clean': t(1650, 2100, 1850),
  Diffuser: t(800, 1200, 1000),
}

export const FABRIC_TYPES = Object.keys(FABRIC)

// --- Printing / Fleece (₹/sqm) ---------------------------------------------
export const PRINTING: TierPrice = t(1415, 2400, 1850)
export const FLEECE: TierPrice = t(500, 1000, 700)

// --- Gripper (₹/rmt) --------------------------------------------------------
export const GRIPPER: Record<string, TierPrice> = {
  CW: t(170, 320, 280),
  CC: t(190, 340, 300),
  Profile: t(135, 320, 280),
  'Flexible CW': t(230, 510, 480),
  'Flexible CC': t(300, 530, 500),
}

// --- LED (₹/mtr) ------------------------------------------------------------
export const LED: Record<string, TierPrice> = {
  'Single Colour': t(170, 270, 220),
  'Single Colour 12Dot': t(170, 270, 220),
  Tunable: t(270, 370, 320),
  RGB: t(220, 320, 270),
  'RGBW/NW/WW': t(270, 370, 345),
  'Wider Single Colour': t(220, 320, 270),
  'Wider Tunable': t(370, 470, 425),
}

// --- LED wattage per metre --------------------------------------------------
export const LED_WATTS_PER_M = {
  tunable: 13,
  rgb: 13,
  rgbw: 13,
  singleColourStandard: 12.5, // 10-dot
  singleColour12Dot: 15,
}

// --- Standard drivers { watts, price } --------------------------------------
export interface DriverSpec {
  label: string
  watts: number
  price: TierPrice
}

export const STANDARD_DRIVERS: DriverSpec[] = [
  { label: '50W', watts: 50, price: t(1000, 1500, 1300) },
  { label: '100W', watts: 100, price: t(1200, 1900, 1800) },
  { label: '150W', watts: 150, price: t(1500, 2200, 1900) },
  { label: '200W', watts: 200, price: t(1900, 2500, 2000) },
  { label: '350W', watts: 350, price: t(2100, 2900, 2800) },
  { label: '400W', watts: 400, price: t(3200, 4700, 3700) },
  { label: '600W', watts: 600, price: t(4700, 5500, 5000) },
]

export const DRIVER_BY_LABEL: Record<string, DriverSpec> = Object.fromEntries(
  STANDARD_DRIVERS.map((d) => [d.label, d]),
)

// --- DALI drivers -----------------------------------------------------------
export const DALI_DRIVERS = {
  'DT2 200W': { watts: 200, price: t(5600, 6100, 5900) },
  'DT8 150W': { watts: 150, price: t(5600, 6100, 5900) },
}

// --- Controls (₹ each) ------------------------------------------------------
export const CONTROLS: Record<string, TierPrice> = {
  DA4m: t(1800, 2300, 2100),
  DA5M: t(1800, 2300, 2100), // placeholder — replace with real price
  'EV1 Power Repeater': t(1700, 2000, 1900),
  'V1 Controller': t(1300, 1600, 1500),
  'RT1 Remote': t(1600, 2000, 1800),
  'EV2 Power Repeater': t(1800, 2100, 2000),
  'V2 Controller': t(1500, 1900, 1700),
  'RT2 Remote': t(1700, 2100, 1900),
}

// --- Constants --------------------------------------------------------------
export const ROLL_WIDTHS = [2, 3, 4, 5] // m
export const CIRCLE_ROLL_WIDTHS = [1, 2, 3, 4, 5] // m
export const INSTALLATION_RATE_PER_SQFT = 120
export const SQFT_PER_SQM = 10.7639
export const GST_RATE = 0.18
export const DRIVER_LOAD_FACTOR = 0.85

// --- Tier selector ----------------------------------------------------------
// manual & manual_custom fall back to the dealer column for base prices.
export function p(price: TierPrice, tier: PriceTier): number {
  if (tier === 'manual' || tier === 'manual_custom') return price.dealer
  return price[tier as BaseTier]
}

/** Resolve which base tier drives non-manual line items when tier === 'manual'. */
export function baseTierFor(tier: PriceTier, otherItemsTier?: BaseTier): PriceTier {
  if (tier === 'manual') return otherItemsTier ?? 'dealer'
  return tier
}
