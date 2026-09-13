// ============================================================================
// Company / branding registry used by the PDF and the builder company picker.
// Add a company = add one entry. getCompany(id) falls back to DEFAULT_COMPANY.
// ============================================================================

export interface CompanyConfig {
  id: string
  name: string
  shortName: string
  logoText: string // monogram
  tagline: string
  address: string
  city: string
  email: string
  phone: string
  website: string
  gstin: string
  bank: {
    name: string
    accountName: string
    accountNumber: string
    ifsc: string
  }
  footer: string
  accent: string
}

// NOTE: address / GSTIN / bank details below are placeholders — replace with the
// real figures for each company. Names and branding are final.
export const COMPANIES: Record<string, CompanyConfig> = {
  STC: {
    id: 'STC',
    name: 'Siddarth Trading Company',
    shortName: 'Siddarth Trading Co.',
    logoText: 'STC',
    tagline: 'Premium Stretch-Ceiling Systems',
    address: 'Replace with registered address',
    city: 'City, State — PIN',
    email: 'hello@siddarthtrading.com',
    phone: '+91 00000 00000',
    website: 'www.siddarthtrading.com',
    gstin: 'REPLACE-WITH-GSTIN',
    bank: {
      name: 'Replace — Bank name',
      accountName: 'Siddarth Trading Company',
      accountNumber: 'REPLACE-A/C-NO',
      ifsc: 'REPLACE-IFSC',
    },
    footer: 'Precision-engineered stretch ceilings',
    accent: '#a97c50',
  },
  NLS: {
    id: 'NLS',
    name: 'Next Level Solutions',
    shortName: 'Next Level Solutions',
    logoText: 'NLS',
    tagline: 'Engineered Ceiling & Lighting Solutions',
    address: 'Replace with registered address',
    city: 'City, State — PIN',
    email: 'hello@nextlevelsolutions.com',
    phone: '+91 00000 00000',
    website: 'www.nextlevelsolutions.com',
    gstin: 'REPLACE-WITH-GSTIN',
    bank: {
      name: 'Replace — Bank name',
      accountName: 'Next Level Solutions',
      accountNumber: 'REPLACE-A/C-NO',
      ifsc: 'REPLACE-IFSC',
    },
    footer: 'Taking interiors to the next level',
    accent: '#8a6d4b',
  },
}

export const DEFAULT_COMPANY = 'STC'

export function getCompany(id?: string): CompanyConfig {
  if (id && COMPANIES[id]) return COMPANIES[id]
  return COMPANIES[DEFAULT_COMPANY]
}

export const COMPANY_LIST = Object.values(COMPANIES)
