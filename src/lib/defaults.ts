// Factory helpers for creating new items / quotes with sane defaults.
import { v4 as uuid } from 'uuid'
import type { CeilingItem, Quote } from './types'
import { DEFAULT_COMPANY } from './companies'
import { INSTALLATION_RATE_PER_SQFT } from './pricing'

export function newItem(overrides: Partial<CeilingItem> = {}): CeilingItem {
  return {
    id: uuid(),
    name: '',
    surface: 'ceiling',
    shape: 'rectangle',
    unit: 'meters',
    dimensions: { dim1: 0, dim2: 0 },
    fabricType: 'Descor Premium',
    withPrinting: false,
    withFleece: false,
    lightType: 'none',
    lightDepth: 100,
    ledWidth: 'standard',
    gripperType: 'CW',
    quantity: 1,
    jointType: 'none',
    jointPosition: 0,
    ledSpacingMM: 125,
    ledModuleType: 'standard',
    daliDriver: 'dt8',
    driverOverrides: {},
    lightingConfig: 'non_looped',
    loopGroup: 0,
    dimmableWithoutDali: false,
    rgbDali: false,
    marginMM: 0,
    notes: '',
    ...overrides,
  }
}

export function newQuote(overrides: Partial<Quote> = {}): Quote {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const valid = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  return {
    id: uuid(),
    quoteNumber: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectName: '',
    location: '',
    date: today,
    validUntil: valid,
    priceTier: 'dealer',
    markupPercent: 0,
    items: [newItem()],
    customLines: [],
    installationRatePerSqft: INSTALLATION_RATE_PER_SQFT,
    transportCost: 0,
    includeGst: true,
    displayMode: 'total',
    manualRates: {
      fabricPerSqm: 1100,
      ledPerMtr: 170,
      gripperPerRmt: 170,
      otherItemsTier: 'dealer',
    },
    notes: '',
    company: DEFAULT_COMPANY,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
