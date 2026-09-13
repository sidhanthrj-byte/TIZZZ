'use client'
import Link from 'next/link'
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  HardHat,
  Sparkles,
  Lightbulb,
  ReceiptText,
} from 'lucide-react'
import type { Quote, QuoteBreakdown } from '@/lib/types'
import { fmtINR, fmtNum } from '@/lib/calculations'
import { getCompany } from '@/lib/companies'
import { PrintButton } from './PrintButton'
import { SharePDF } from './SharePDF'

// ---------------------------------------------------------------------------
// Warm editorial palette (inspired by the reference art direction)
// ---------------------------------------------------------------------------
const C = {
  paper: '#FAF7F2',
  paperAlt: '#F3EEE6',
  ink: '#26211C',
  soft: '#6B6157',
  muted: '#9A9186',
  line: '#E6DED2',
  lineSoft: '#EFE8DD',
  accent: '#A97C50',
  accentDeep: '#8A6238',
  dark: '#1E1A16',
}
const SERIF = "Georgia, 'Times New Roman', 'Noto Serif', serif"

const LIGHT_LABELS: Record<string, string> = {
  single_color: 'Single Colour',
  single_color_dimmable: 'Single Colour Dimmable',
  tunable: 'Tunable White',
  tunable_dali: 'Tunable DALI',
  rgb: 'RGB',
  rgbw: 'RGBW',
}
const lightLabel = (t: string) => LIGHT_LABELS[t] ?? t
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const TERMS = [
  'This quotation is valid for the period stated from the date of issue.',
  'Prices are exclusive of taxes unless stated; GST is charged at applicable rates.',
  '50% advance confirms the order; balance is due before dispatch / installation.',
  'Lead time is confirmed on receipt of advance and final approved drawings.',
  'Site must be ready, clean and accessible with power available before installation.',
  'Civil, electrical or false-ceiling framework is not in scope unless quoted.',
  'Colours and finishes may vary marginally from samples due to tolerances.',
  'Work beyond this scope is charged as a separate quotation.',
  'Goods manufactured to custom sizes cannot be returned or exchanged.',
  'Warranty covers manufacturing defects only, as per applicable terms.',
  'Delays from site or client-side dependencies are not our responsibility.',
  'Subject to the jurisdiction of the company’s registered city.',
]

export function ClientPdfDocument({
  quote,
  breakdown,
}: {
  quote: Quote
  breakdown: QuoteBreakdown
}) {
  const company = getCompany(quote.company)
  const accent = company.accent || C.accent
  const perSqft = quote.displayMode === 'per-sqft'
  const isCustom = breakdown.isCustom
  const markupMul = 1 + (quote.markupPercent || 0) / 100

  interface Row {
    article: string
    title: string
    meta: string
    hsn: string
    qtyOrArea: string
    unitOrPerSqft: string
    amount: number
  }
  const rows: Row[] = []
  if (isCustom) {
    ;(breakdown.customLineItems ?? []).forEach((li, i) => {
      rows.push({
        article: `${String(i + 1).padStart(2, '0')}`,
        title: li.description || 'Custom line',
        meta: '',
        hsn: '3921',
        qtyOrArea: fmtNum(li.qty, 0),
        unitOrPerSqft: fmtINR(li.rate),
        amount: li.tierAmount,
      })
    })
  } else {
    breakdown.itemBreakdowns.forEach((ib, i) => {
      const item = quote.items.find((x) => x.id === ib.itemId)
      const amount = ib.subtotalTier * markupMul + ib.installationCost
      const bits: string[] = []
      if (item) {
        bits.push(item.shape.charAt(0).toUpperCase() + item.shape.slice(1))
        bits.push(item.fabricType)
        if (item.lightType !== 'none') bits.push(lightLabel(item.lightType))
      }
      rows.push({
        article: `${String(i + 1).padStart(2, '0')}`,
        title: ib.itemName,
        meta: bits.join('  ·  '),
        hsn: '3921',
        qtyOrArea: perSqft ? `${fmtNum(ib.sqft, 0)} sqft` : `${item?.quantity ?? 1}`,
        unitOrPerSqft: perSqft
          ? fmtINR(ib.sqft > 0 ? amount / ib.sqft : 0)
          : fmtINR((item?.quantity ?? 1) > 0 ? amount / (item?.quantity ?? 1) : amount),
        amount,
      })
    })
  }

  return (
    <div style={{ background: '#d9d2c7', minHeight: '100vh', fontFamily: SANS }}>
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3">
        <Link href={`/quotes/${quote.id}/edit`} className="btn-ghost btn-sm">
          <ArrowLeft className="h-4 w-4" /> Back to builder
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
          <SharePDF fileName={`${quote.quoteNumber}-${quote.clientName || 'quote'}.pdf`} />
        </div>
      </div>

      <div className="pdf-mobile-outer">
        {/* ================= PAGE 1 — COVER ================= */}
        <div className="quote-pdf-page" style={{ padding: 0, background: C.paper }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 1123 }}>
            {/* Image hero */}
            <div
              style={{
                position: 'relative',
                height: 690,
                backgroundColor: '#b79b7d',
                // Real photo (drop in /public/cover-bg.jpg) sits on top; a warm
                // editorial gradient shows through as a graceful fallback.
                backgroundImage:
                  "url('/cover-bg.jpg'), radial-gradient(130% 100% at 60% 30%, rgba(233,220,199,0.9) 0%, rgba(233,220,199,0) 45%), linear-gradient(155deg, #6f5a44 0%, #9c8163 34%, #cdb493 62%, #e7d8bf 100%)",
                backgroundSize: 'cover, cover, cover',
                backgroundPosition: 'center, center, center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* soft scrims for text legibility */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(30,26,22,0.28) 0%, rgba(30,26,22,0) 32%, rgba(30,26,22,0) 70%, rgba(250,247,242,0.9) 100%)',
                }}
              />
              {/* eyebrow top-left, like the reference */}
              <div
                style={{
                  position: 'absolute',
                  top: 54,
                  left: 56,
                  right: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <span
                  style={{
                    fontFamily: SERIF,
                    fontSize: 22,
                    color: '#fff',
                    letterSpacing: 1,
                    fontWeight: 400,
                    textShadow: '0 1px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  Quotation
                </span>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.6)' }} />
              </div>
              {/* company mark bottom-right of hero */}
              <div
                style={{
                  position: 'absolute',
                  right: 56,
                  bottom: 150,
                  textAlign: 'right',
                  color: '#fff',
                  textShadow: '0 1px 8px rgba(0,0,0,0.45)',
                }}
              >
                <Monogram text={company.logoText} accent={accent} light />
              </div>
            </div>

            {/* Lower ivory band */}
            <div
              style={{
                flex: 1,
                padding: '38px 56px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <Eyebrow accent={accent}>Prepared For</Eyebrow>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 46,
                    lineHeight: 1.05,
                    color: C.ink,
                    marginTop: 10,
                    fontWeight: 400,
                  }}
                >
                  {quote.clientName || 'Valued Client'}
                </div>
                <div style={{ fontSize: 15, color: C.soft, marginTop: 12 }}>
                  {[quote.projectName, quote.location].filter(Boolean).join('  ·  ')}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    gap: 48,
                    paddingTop: 20,
                    borderTop: `1px solid ${C.line}`,
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', gap: 44 }}>
                    <Meta label="Quote No." value={quote.quoteNumber} accent={accent} />
                    <Meta label="Date" value={quote.date} accent={accent} />
                    <Meta label="Valid Until" value={quote.validUntil} accent={accent} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: C.muted,
                      }}
                    >
                      Estimated Total
                    </div>
                    <div
                      style={{
                        fontFamily: SERIF,
                        fontSize: 30,
                        color: C.ink,
                        marginTop: 4,
                        fontWeight: 400,
                      }}
                    >
                      {fmtINR(breakdown.grandTotal)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 26,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11.5,
                    color: C.soft,
                  }}
                >
                  <span style={{ fontWeight: 600, color: C.ink }}>{company.name}</span>
                  <span>
                    {company.email}  ·  {company.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PAGE 2 — QUOTATION ================= */}
        <div className="quote-pdf-page" style={{ padding: 0, background: C.paper }}>
          <Masthead company={company} accent={accent} />
          <div style={{ padding: '34px 56px 48px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: 30,
              }}
            >
              <div>
                <Eyebrow accent={accent}>Quotation</Eyebrow>
                <div style={{ fontFamily: SERIF, fontSize: 34, color: C.ink, marginTop: 6 }}>
                  {quote.quoteNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11.5, color: C.soft, lineHeight: 1.7 }}>
                <div>
                  <span style={{ color: C.muted }}>Date</span> &nbsp;{quote.date}
                </div>
                <div>
                  <span style={{ color: C.muted }}>Valid until</span> &nbsp;{quote.validUntil}
                </div>
              </div>
            </div>

            {/* Prepared for / details, hairline columns (no heavy boxes) */}
            <div style={{ display: 'flex', gap: 40, marginBottom: 34 }}>
              <InfoCol title="Prepared For" accent={accent}>
                <InfoRow k="Client" v={quote.clientName} strong />
                <InfoRow k="Project" v={quote.projectName} />
                <InfoRow k="Location" v={quote.location} />
                <InfoRow k="Contact" v={[quote.clientPhone, quote.clientEmail].filter(Boolean).join(' · ')} />
              </InfoCol>
              <InfoCol title="Issued By" accent={accent}>
                <InfoRow k="Company" v={company.name} strong />
                <InfoRow k="GSTIN" v={company.gstin} />
                <InfoRow k="Email" v={company.email} />
                <InfoRow k="Phone" v={company.phone} />
              </InfoCol>
            </div>

            {/* Line-items table — minimal, hairline-ruled */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr>
                  <Th accent={accent} w="7%">No.</Th>
                  <Th accent={accent} w="45%">Description</Th>
                  <Th accent={accent} w="10%">HSN</Th>
                  <Th accent={accent} w="12%" right>
                    {perSqft ? 'Area' : 'Qty'}
                  </Th>
                  <Th accent={accent} w="13%" right>
                    {perSqft ? '₹ / sqft' : 'Unit Price'}
                  </Th>
                  <Th accent={accent} w="13%" right>
                    Amount
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.article}>
                    <Td>
                      <span style={{ fontFamily: SERIF, color: accent, fontSize: 13 }}>
                        {r.article}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 12 }}>{r.title}</div>
                      {!isCustom && r.meta && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{r.meta}</div>
                      )}
                    </Td>
                    <Td>
                      <span style={{ color: C.soft }}>{r.hsn}</span>
                    </Td>
                    <Td right>{r.qtyOrArea}</Td>
                    <Td right>{r.unitOrPerSqft}</Td>
                    <Td right>
                      <span style={{ fontWeight: 700, color: C.ink }}>{fmtINR(r.amount)}</span>
                    </Td>
                  </tr>
                ))}
                {breakdown.transportCost > 0 && (
                  <tr>
                    <Td>
                      <span style={{ fontFamily: SERIF, color: accent, fontSize: 13 }}>—</span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 12 }}>
                        Transport &amp; Logistics
                      </div>
                    </Td>
                    <Td>
                      <span style={{ color: C.soft }}>9965</span>
                    </Td>
                    <Td right>1</Td>
                    <Td right>{fmtINR(breakdown.transportCost)}</Td>
                    <Td right>
                      <span style={{ fontWeight: 700, color: C.ink }}>
                        {fmtINR(breakdown.transportCost)}
                      </span>
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <div style={{ width: 288 }}>
                <TotalRow k="Subtotal" v={fmtINR(breakdown.subtotalBeforeGst)} />
                {quote.includeGst && <TotalRow k="GST (18%)" v={fmtINR(breakdown.gstAmount)} />}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 12,
                    paddingTop: 14,
                    borderTop: `2px solid ${C.ink}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: C.soft,
                    }}
                  >
                    Grand Total
                  </span>
                  <span style={{ fontFamily: SERIF, fontSize: 26, color: C.ink }}>
                    {fmtINR(breakdown.grandTotal)}
                  </span>
                </div>
                {!isCustom && breakdown.totalSqft > 0 && (
                  <div style={{ textAlign: 'right', fontSize: 10.5, color: C.muted, marginTop: 6 }}>
                    {fmtINR(breakdown.pricePerSqft)} / sqft · {fmtNum(breakdown.totalSqft, 0)} sqft
                  </div>
                )}
              </div>
            </div>

            {/* Scope */}
            <Section title="Scope of Supply" accent={accent}>
              Supply and installation of the stretch-ceiling system including imported membrane,
              aluminium gripper profiles, integrated lighting and associated hardware as detailed
              above, executed by trained, certified installers.
            </Section>

            {quote.notes && (
              <Section title="Notes" accent={accent}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{quote.notes}</span>
              </Section>
            )}
          </div>
          <Footer company={company} pageNo="02" />
        </div>

        {/* ================= PAGE 3 — TERMS & BANKING ================= */}
        <div className="quote-pdf-page" style={{ padding: 0, background: C.paper }}>
          <Masthead company={company} accent={accent} />
          <div style={{ padding: '34px 56px 48px' }}>
            <Eyebrow accent={accent}>Terms &amp; Conditions</Eyebrow>
            <div
              style={{
                marginTop: 14,
                columnCount: 2,
                columnGap: 34,
                fontSize: 10.5,
                color: C.soft,
                lineHeight: 1.65,
              }}
            >
              {TERMS.map((t, i) => (
                <div
                  key={i}
                  style={{
                    breakInside: 'avoid',
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: accent, fontFamily: SERIF, fontSize: 11 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
              <InfoCol title="Banking Details" accent={accent}>
                <InfoRow k="Bank" v={company.bank.name} />
                <InfoRow k="A/C Name" v={company.bank.accountName} />
                <InfoRow k="A/C No." v={company.bank.accountNumber} />
                <InfoRow k="IFSC" v={company.bank.ifsc} />
                <InfoRow k="GSTIN" v={company.gstin} />
              </InfoCol>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ marginTop: 80 }}>
                  <div style={{ height: 1, background: C.ink, width: '70%' }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 8 }}>
                    Authorised Signatory
                  </div>
                  <div style={{ fontSize: 11, color: C.soft }}>{company.name}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 44,
                padding: '22px 26px',
                background: C.paperAlt,
                borderRadius: 4,
                borderLeft: `3px solid ${accent}`,
              }}
            >
              <div style={{ fontFamily: SERIF, fontSize: 17, color: C.ink }}>
                Thank you for considering {company.shortName}
              </div>
              <div style={{ fontSize: 11.5, color: C.soft, marginTop: 6 }}>
                We look forward to bringing precision, craft and light to your space.
              </div>
            </div>
          </div>
          <Footer company={company} pageNo="03" />
        </div>

        {/* ================= PAGE 4 — WHY CHOOSE US ================= */}
        <div className="quote-pdf-page" style={{ padding: 0, background: C.paper, position: 'relative' }}>
          <Masthead company={company} accent={accent} />
          <div
            style={{
              padding: '46px 56px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 1123 - 84,
              boxSizing: 'border-box',
            }}
          >
            {/* two-tone heading */}
            <div style={{ textAlign: 'center' }}>
              <Eyebrow accent={accent}>The {company.shortName} Promise</Eyebrow>
              <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 34, color: C.ink, lineHeight: 1.15 }}>
                Why our clients{' '}
                <span style={{ color: accent }}>choose us</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12.5, color: C.soft, maxWidth: 440, marginInline: 'auto' }}>
                Six commitments behind every ceiling we deliver — the reasons this quote is one you
                can act on with confidence.
              </div>
            </div>

            {/* radial trust diagram */}
            <RadialTrust accent={accent} shortName={company.shortName} logoText={company.logoText} />

            {/* footer contact card */}
            <div
              style={{
                marginTop: 'auto',
                width: '100%',
                borderTop: `1px solid ${C.line}`,
                paddingTop: 22,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 18, color: C.ink }}>{company.name}</div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 5, lineHeight: 1.7 }}>
                  {company.address}, {company.city}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: C.soft, lineHeight: 1.7 }}>
                <div>{company.phone}</div>
                <div>{company.email}</div>
                <div style={{ color: accent, fontWeight: 600 }}>{company.website}</div>
              </div>
            </div>
            <div
              style={{
                textAlign: 'center',
                fontSize: 9,
                letterSpacing: 1,
                color: C.muted,
                textTransform: 'uppercase',
                paddingTop: 14,
              }}
            >
              04
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Radial "why choose us" trust diagram (inspired by hub-and-spoke ecosystem)
// ---------------------------------------------------------------------------
function RadialTrust({
  accent,
  shortName,
  logoText,
}: {
  accent: string
  shortName: string
  logoText: string
}) {
  const SIZE = 560
  const cx = SIZE / 2
  const cy = SIZE / 2
  const R = 208 // ring radius (badge centres)
  const items = [
    { icon: ShieldCheck, title: 'Authentic Membrane', sub: 'Imported, certified fabric' },
    { icon: Award, title: '10-Year Warranty', sub: 'On manufacturing defects' },
    { icon: HardHat, title: 'Certified Installers', sub: 'Trained, in-house teams' },
    { icon: Sparkles, title: 'Seamless Spans', sub: 'Bespoke geometry, no joints' },
    { icon: Lightbulb, title: 'Integrated Lighting', sub: 'Engineered cove & LED' },
    { icon: ReceiptText, title: 'Transparent Pricing', sub: 'Precision-calculated' },
  ]
  // start at top (-90°), 60° apart
  const nodes = items.map((it, i) => {
    const a = (-90 + i * 60) * (Math.PI / 180)
    return { ...it, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  })

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '18px 0 8px' }}>
      {/* dashed ring + spokes */}
      <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={1.5} strokeDasharray="2 7" />
        {nodes.map((n, i) => (
          <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={C.lineSoft} strokeWidth={1} />
        ))}
      </svg>

      {/* center hub */}
      <div
        style={{
          position: 'absolute',
          left: cx - 74,
          top: cy - 74,
          width: 148,
          height: 148,
          borderRadius: '50%',
          background: C.dark,
          color: '#F3EEE6',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(30,26,22,0.25)',
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 22,
            color: '#fff',
            border: `1.5px solid ${accent}`,
            borderRadius: 8,
            padding: '4px 10px',
          }}
        >
          {logoText}
        </div>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8, opacity: 0.75 }}>
          Why Choose
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1, maxWidth: 118, textAlign: 'center', lineHeight: 1.2 }}>
          {shortName}
        </div>
      </div>

      {/* nodes */}
      {nodes.map((n, i) => {
        const Icon = n.icon
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: n.x - 70,
              top: n.y - 34,
              width: 140,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#fff',
                border: `1.5px solid ${C.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(30,26,22,0.06)',
              }}
            >
              <Icon size={24} color={accent} strokeWidth={1.6} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, marginTop: 8 }}>{n.title}</div>
            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1, lineHeight: 1.3 }}>{n.sub}</div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
function Monogram({ text, accent, light }: { text: string; accent: string; light?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 8,
          border: `1.5px solid ${light ? 'rgba(255,255,255,0.7)' : accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SERIF,
          fontSize: 16,
          fontWeight: 400,
          color: light ? '#fff' : accent,
          letterSpacing: 0.5,
        }}
      >
        {text}
      </div>
    </div>
  )
}

function Eyebrow({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: accent,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function Meta({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, marginTop: 3 }}>
        {value || '—'}
      </div>
    </div>
  )
}

function Masthead({
  company,
  accent,
}: {
  company: ReturnType<typeof getCompany>
  accent: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '26px 56px 18px',
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 20, color: C.ink }}>{company.name}</div>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>
          {company.tagline}
        </div>
      </div>
      <Monogram text={company.logoText} accent={accent} />
    </div>
  )
}

function Footer({ company, pageNo }: { company: ReturnType<typeof getCompany>; pageNo: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 26,
        left: 56,
        right: 56,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 9.5,
        letterSpacing: 1,
        color: C.muted,
        textTransform: 'uppercase',
      }}
    >
      <span>{company.website}</span>
      <span>{pageNo}</span>
    </div>
  )
}

function InfoCol({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: accent,
          fontWeight: 600,
          paddingBottom: 8,
          borderBottom: `1px solid ${C.line}`,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.muted }}>{k}</span>
      <span
        style={{
          fontSize: 11.5,
          color: C.ink,
          fontWeight: strong ? 600 : 400,
          textAlign: 'right',
          maxWidth: '68%',
        }}
      >
        {v || '—'}
      </span>
    </div>
  )
}

function Th({
  children,
  w,
  right,
  accent,
}: {
  children: React.ReactNode
  w: string
  right?: boolean
  accent: string
}) {
  return (
    <th
      style={{
        width: w,
        textAlign: right ? 'right' : 'left',
        fontSize: 9.5,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: C.muted,
        fontWeight: 600,
        padding: '0 6px 10px',
        borderBottom: `1.5px solid ${C.ink}`,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td
      style={{
        textAlign: right ? 'right' : 'left',
        padding: '12px 6px',
        borderBottom: `1px solid ${C.lineSoft}`,
        color: C.soft,
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  )
}

function TotalRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        padding: '7px 0',
        color: C.soft,
      }}
    >
      <span>{k}</span>
      <span style={{ fontWeight: 600, color: C.ink }}>{v}</span>
    </div>
  )
}

function Section({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 30 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: accent,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: 11, color: C.soft, lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}
