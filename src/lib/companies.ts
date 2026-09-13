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

export const COMPANIES: Record<string, CompanyConfig> = {
  STC: {
    id: 'STC',
    name: 'Stretch Ceiling Company',
    shortName: 'STC',
    logoText: 'STC',
    tagline: 'Premium PONGS Stretch Ceilings',
    address: 'Plot 14, Industrial Area, Phase 2',
    city: 'Bengaluru, Karnataka 560058',
    email: 'sales@stretchceiling.co.in',
    phone: '+91 98450 00000',
    website: 'www.stretchceiling.co.in',
    gstin: '29ABCDE1234F1Z5',
    bank: {
      name: 'HDFC Bank',
      accountName: 'Stretch Ceiling Company',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
    },
    footer: 'Authorised PONGS stretch-ceiling partner',
    accent: '#c8a24a',
  },
  PONGS: {
    id: 'PONGS',
    name: 'PONGS Ceilings India',
    shortName: 'PONGS',
    logoText: 'P',
    tagline: 'German Engineering. Indian Craftsmanship.',
    address: '2nd Floor, Design Hub, MG Road',
    city: 'Mumbai, Maharashtra 400001',
    email: 'projects@pongs.in',
    phone: '+91 99000 11111',
    website: 'www.pongs.in',
    gstin: '27PONGS1234P1Z0',
    bank: {
      name: 'ICICI Bank',
      accountName: 'PONGS Ceilings India Pvt Ltd',
      accountNumber: '000401234567',
      ifsc: 'ICIC0000004',
    },
    footer: 'PONGS® — the original stretch ceiling',
    accent: '#1f47f5',
  },
}

export const DEFAULT_COMPANY = 'STC'

export function getCompany(id?: string): CompanyConfig {
  if (id && COMPANIES[id]) return COMPANIES[id]
  return COMPANIES[DEFAULT_COMPANY]
}

export const COMPANY_LIST = Object.values(COMPANIES)
