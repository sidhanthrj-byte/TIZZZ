// ============================================================================
// Pongs Quote Maker — Data Model
// Pure types shared by the engine, the UI, and persistence.
// The engine (calculations.ts) imports ONLY types.ts + pricing.ts.
// ============================================================================

export type PriceTier = 'dealer' | 'msp' | 'specifiors' | 'manual' | 'manual_custom'

export type BaseTier = 'dealer' | 'msp' | 'specifiors'

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'l-shape'
export type UnitSystem = 'mm' | 'feet' | 'meters'

export type LightType =
  | 'none'
  | 'single_color'
  | 'single_color_dimmable'
  | 'tunable'
  | 'tunable_dali'
  | 'rgb'
  | 'rgbw'

export type GripperType = 'CW' | 'CC' | 'Profile' | 'Flexible CW' | 'Flexible CC'
export type LEDWidth = 'standard' | 'wider'
export type JointType = 'none' | 'center' | 'off-center'
export type QuoteDisplayMode = 'total' | 'per-sqft'
export type LEDModuleType = 'standard' | '12dot'
export type DaliDriver = 'dt8' | 'da4m'
export type LightingConfig = 'looped' | 'non_looped'

export type QuoteStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'archived'

export const QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'ready',
  'sent',
  'approved',
  'rejected',
  'archived',
]

export type PreferredDriverWatt =
  | '50W'
  | '100W'
  | '150W'
  | '200W'
  | '350W'
  | '400W'
  | '600W'

/** Free-form row for the Manual (Custom) tier — bypasses the engine entirely. */
export interface CustomLine {
  id: string
  description: string
  qty: number
  cost: number
  sellingPrice: number
}

/** Manual rates — used only when priceTier === 'manual'. */
export interface ManualRates {
  fabricPerSqm: number
  ledPerMtr: number
  gripperPerRmt: number
  /** tier for drivers / controls / printing / fleece */
  otherItemsTier: BaseTier
}

/** Shape-specific dimension bag. Only the relevant keys are populated. */
export interface Dimensions {
  // rectangle
  dim1?: number
  dim2?: number
  // circle
  diameter?: number
  // triangle (dim1 = base, dim2 = height, sides for perimeter)
  side1?: number
  side2?: number
  side3?: number
  // l-shape
  length1?: number
  width1?: number
  length2?: number
  width2?: number
}

export interface CeilingItem {
  id: string
  name: string
  surface: 'ceiling' | 'wall'
  shape: ShapeType
  unit: UnitSystem
  dimensions: Dimensions

  fabricType: string // key into FABRIC
  withPrinting: boolean
  withFleece: boolean

  lightType: LightType
  lightDepth: number
  ledWidth: LEDWidth
  gripperType: GripperType

  quantity: number

  jointType: JointType
  jointPosition: number // mm from one end (off-center)

  ledSpacingMM: number // strip-to-strip gap; default 125
  ledModuleType: LEDModuleType
  daliDriver: DaliDriver // tunable_dali only

  driverOverrides: Record<string, number> // description -> forced TOTAL qty
  preferredDriverWatt?: PreferredDriverWatt

  lightingConfig?: LightingConfig // quantity looping
  loopGroup?: number // item looping: items with same >0 group share one driver set

  dimmableWithoutDali?: boolean // single_color_dimmable: non-DALI variant
  rgbDali?: boolean // rgb/rgbw: DALI variant

  marginMM?: number // fabric margin per side (billing only)
  printingRatePerSqm?: number // override

  notes: string
}

export interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  clientEmail: string
  clientPhone: string
  projectName: string
  location: string
  date: string
  validUntil: string

  priceTier: PriceTier
  markupPercent: number

  items: CeilingItem[]
  customLines?: CustomLine[] // manual_custom only

  installationRatePerSqft: number // default 120
  transportCost: number
  includeGst: boolean

  displayMode: QuoteDisplayMode
  manualRates?: ManualRates

  notes: string
  company?: string // key into COMPANIES

  status?: QuoteStatus
  createdAt: string
  updatedAt: string
  grandTotal?: number

  // revision trail (optional)
  parentId?: string
  rootId?: string
  revision?: number
  revisedBy?: string
}

// ============================================================================
// Engine output shapes
// ============================================================================

export interface LineItem {
  key: string
  description: string
  detail?: string
  qty: number
  unit: string
  rate: number
  /** amount at the selected tier (before markup) */
  tierAmount: number
  /** internal cost figure where meaningful (dealer/base), for cost-review only */
  costAmount?: number
  category: 'fabric' | 'printing' | 'fleece' | 'gripper' | 'led' | 'driver' | 'control' | 'custom'
}

export interface FabricPanel {
  rollAxisM: number
  cutM: number
  rollWidthM: number
  panelAreaM2: number
  usedAreaM2: number
  wastageM2: number
}

export interface FabricDetail {
  requiredW: number
  requiredL: number
  orientation: string
  panels: FabricPanel[]
  billedAreaM2: number // per single piece
  usedAreaM2: number
  wastageM2: number
  jointRequired: boolean
  jointType: JointType
  note?: string
  impossible?: boolean
}

export interface LEDDetail {
  strips: number
  spacingMM: number
  runningLengthM: number
  totalRunningMeters: number // per single piece
  wattsPerM: number
  totalWatts: number // per single piece
  ledKey: string
}

export interface ItemBreakdown {
  itemId: string
  itemName: string
  lineItems: LineItem[]
  fabricDetail?: FabricDetail
  ledDetail?: LEDDetail
  areaM2: number
  perimeterM: number
  sqft: number
  installationCost: number
  subtotalTier: number // Σ lineItems.tierAmount
  itemTotal: number // subtotalTier + installationCost
  errors: string[]
  warnings: string[]
}

export interface QuoteBreakdown {
  itemBreakdowns: ItemBreakdown[]
  customLineItems?: LineItem[]
  materialsTotalTier: number
  materialsTotalFinal: number // after markup (materials only)
  markupAmount: number
  totalInstallation: number
  transportCost: number
  subtotalBeforeGst: number
  gstAmount: number
  grandTotal: number
  totalSqft: number
  pricePerSqft: number
  isCustom: boolean
  errors: string[]
  warnings: string[]
}
