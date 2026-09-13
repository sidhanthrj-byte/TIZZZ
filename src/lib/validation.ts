import { z } from 'zod'
import { FABRIC } from './pricing'

const shapeEnum = z.enum(['rectangle', 'circle', 'triangle', 'l-shape'])
const unitEnum = z.enum(['mm', 'feet', 'meters'])
const lightEnum = z.enum([
  'none',
  'single_color',
  'single_color_dimmable',
  'tunable',
  'tunable_dali',
  'rgb',
  'rgbw',
])
const jointEnum = z.enum(['none', 'center', 'off-center'])

export const dimensionsSchema = z.object({
  dim1: z.number().optional(),
  dim2: z.number().optional(),
  diameter: z.number().optional(),
  side1: z.number().optional(),
  side2: z.number().optional(),
  side3: z.number().optional(),
  length1: z.number().optional(),
  width1: z.number().optional(),
  length2: z.number().optional(),
  width2: z.number().optional(),
})

export const ceilingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  surface: z.enum(['ceiling', 'wall']),
  shape: shapeEnum,
  unit: unitEnum,
  dimensions: dimensionsSchema,
  fabricType: z.string(),
  withPrinting: z.boolean(),
  withFleece: z.boolean(),
  lightType: lightEnum,
  lightDepth: z.number(),
  ledWidth: z.enum(['standard', 'wider']),
  gripperType: z.enum(['CW', 'CC', 'Profile', 'Flexible CW', 'Flexible CC']),
  quantity: z.number(),
  jointType: jointEnum,
  jointPosition: z.number(),
  ledSpacingMM: z.number(),
  ledModuleType: z.enum(['standard', '12dot']),
  daliDriver: z.enum(['dt8', 'da4m']),
  driverOverrides: z.record(z.number()),
  preferredDriverWatt: z
    .enum(['50W', '100W', '150W', '200W', '350W', '400W', '600W'])
    .optional(),
  lightingConfig: z.enum(['looped', 'non_looped']).optional(),
  loopGroup: z.number().optional(),
  dimmableWithoutDali: z.boolean().optional(),
  rgbDali: z.boolean().optional(),
  marginMM: z.number().optional(),
  printingRatePerSqm: z.number().optional(),
  notes: z.string(),
})

export const customLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number(),
  cost: z.number(),
  sellingPrice: z.number(),
})

export const quoteSchema = z.object({
  id: z.string(),
  quoteNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string(),
  clientPhone: z.string(),
  projectName: z.string(),
  location: z.string(),
  date: z.string(),
  validUntil: z.string(),
  priceTier: z.enum(['dealer', 'msp', 'specifiors', 'manual', 'manual_custom']),
  markupPercent: z.number(),
  items: z.array(ceilingItemSchema),
  customLines: z.array(customLineSchema).optional(),
  installationRatePerSqft: z.number(),
  transportCost: z.number(),
  includeGst: z.boolean(),
  displayMode: z.enum(['total', 'per-sqft']),
  manualRates: z
    .object({
      fabricPerSqm: z.number(),
      ledPerMtr: z.number(),
      gripperPerRmt: z.number(),
      otherItemsTier: z.enum(['dealer', 'msp', 'specifiors']),
    })
    .optional(),
  notes: z.string(),
  company: z.string().optional(),
  status: z
    .enum(['draft', 'ready', 'sent', 'approved', 'rejected', 'archived'])
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  grandTotal: z.number().optional(),
  parentId: z.string().optional(),
  rootId: z.string().optional(),
  revision: z.number().optional(),
  revisedBy: z.string().optional(),
})

export type QuoteInput = z.infer<typeof quoteSchema>

// --- Field-level validation for the UI (returns human messages) -------------
export interface ItemValidationResult {
  errors: string[]
  warnings: string[]
}

export function validateItem(item: unknown): ItemValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const parsed = ceilingItemSchema.safeParse(item)
  if (!parsed.success) {
    return { errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`), warnings }
  }
  const it = parsed.data

  if (it.quantity <= 0) errors.push('Quantity must be greater than 0.')
  if (!Number.isFinite(it.quantity)) errors.push('Quantity is invalid.')

  const d = it.dimensions
  const pos = (v?: number) => v != null && v > 0

  switch (it.shape) {
    case 'rectangle':
      if (!pos(d.dim1) || !pos(d.dim2)) errors.push('Length and width must be greater than 0.')
      break
    case 'circle':
      if (!pos(d.diameter)) errors.push('Diameter must be greater than 0.')
      break
    case 'triangle':
      if (!pos(d.dim1) || !pos(d.dim2)) errors.push('Base and height must be greater than 0.')
      break
    case 'l-shape':
      if (!pos(d.length1) || !pos(d.width1) || !pos(d.length2) || !pos(d.width2))
        errors.push('All L-shape dimensions must be greater than 0.')
      break
  }

  if (!FABRIC[it.fabricType]) warnings.push('Unknown fabric type — falling back to Descor Premium.')

  if (it.jointType === 'off-center' && it.jointPosition <= 0)
    errors.push('Off-center joint position must be greater than 0.')

  if (
    it.lightType !== 'single_color_dimmable' &&
    it.lightType !== 'tunable_dali' &&
    it.lightType !== 'rgb' &&
    it.lightType !== 'rgbw' &&
    (it.dimmableWithoutDali || it.rgbDali)
  ) {
    warnings.push('DALI options are ignored for this lighting type.')
  }

  Object.entries(it.driverOverrides ?? {}).forEach(([k, v]) => {
    if (!Number.isFinite(v) || v < 0) errors.push(`Driver override for "${k}" is invalid.`)
  })

  if (it.marginMM != null && it.marginMM < 0) errors.push('Margin cannot be negative.')

  return { errors, warnings }
}

export function validateQuoteMeta(q: {
  markupPercent: number
  installationRatePerSqft: number
  transportCost: number
}): string[] {
  const errors: string[] = []
  if (!Number.isFinite(q.markupPercent) || q.markupPercent < 0)
    errors.push('Markup % must be 0 or greater.')
  if (!Number.isFinite(q.installationRatePerSqft) || q.installationRatePerSqft < 0)
    errors.push('Installation rate must be 0 or greater.')
  if (!Number.isFinite(q.transportCost) || q.transportCost < 0)
    errors.push('Transport cost must be 0 or greater.')
  return errors
}
