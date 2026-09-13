'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Quote, QuoteBreakdown } from '@/lib/types'
import { fmtINR, fmtNum } from '@/lib/calculations'
import { getCompany } from '@/lib/companies'
import { PrintButton } from './PrintButton'
import { SharePDF } from './SharePDF'

const TERMS = [
  'This quotation is valid for the period stated above from the date of issue.',
  'Prices are exclusive of any taxes unless explicitly mentioned; GST is charged at applicable rates.',
  '50% advance is required to confirm the order; balance is due before dispatch/installation.',
  'Lead time is confirmed only upon receipt of advance and final approved drawings.',
  'Site must be ready, clean and accessible with power available prior to installation.',
  'Any civil, electrical or false-ceiling framework is not in our scope unless quoted.',
  'Colours/finishes may vary marginally from samples due to manufacturing tolerances.',
  'Additional work beyond this scope will be charged as a separate quotation.',
  'Goods once manufactured to custom sizes cannot be returned or exchanged.',
  'Warranty covers manufacturing defects only, as per PONGS terms.',
  'Delays caused by site or client-side dependencies are not our responsibility.',
  'This quotation is subject to the jurisdiction of the company’s registered city.',
]

export function ClientPdfDocument({
  quote,
  breakdown,
}: {
  quote: Quote
  breakdown: QuoteBreakdown
}) {
  const company = getCompany(quote.company)
  const perSqft = quote.displayMode === 'per-sqft'
  const isCustom = breakdown.isCustom
  const markupMul = 1 + (quote.markupPercent || 0) / 100

  // Build client-facing rows
  interface Row {
    article: string
    description: string
    subLines: string[]
    hsn: string
    qtyOrArea: string
    unitOrPerSqft: string
    amount: number
  }
  const rows: Row[] = []
  if (isCustom) {
    ;(breakdown.customLineItems ?? []).forEach((li, i) => {
      rows.push({
        article: `SCS-${String(i + 1).padStart(3, '0')}`,
        description: li.description,
        subLines: [],
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
      const sub: string[] = []
      if (item) {
        sub.push(
          `${item.shape.charAt(0).toUpperCase() + item.shape.slice(1)} · ${item.fabricType}`,
        )
        if (item.lightType !== 'none') sub.push(`Lighting: ${item.lightType.replace(/_/g, ' ')}`)
      }
      rows.push({
        article: `SCS-${String(i + 1).padStart(3, '0')}`,
        description: ib.itemName,
        subLines: sub,
        hsn: '3921',
        qtyOrArea: perSqft ? `${fmtNum(ib.sqft, 0)} sqft` : String(item?.quantity ?? 1),
        unitOrPerSqft: perSqft
          ? `${fmtINR(ib.sqft > 0 ? amount / ib.sqft : 0)}`
          : `${fmtINR((item?.quantity ?? 1) > 0 ? amount / (item?.quantity ?? 1) : amount)}`,
        amount,
      })
    })
  }

  const styles = getStyles(company.accent)

  return (
    <div style={{ background: '#e9ecf2', minHeight: '100vh' }}>
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
        {/* ---------- PAGE 1 — COVER ---------- */}
        <div className="quote-pdf-page" style={styles.cover}>
          <div style={styles.coverOverlay} />
          <div style={styles.coverContent}>
            <div>
              <div style={styles.coverMonogram}>{company.logoText}</div>
              <div style={{ marginTop: 8, fontSize: 13, letterSpacing: 2, opacity: 0.8 }}>
                {company.name.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, letterSpacing: 3, opacity: 0.7 }}>PREPARED FOR</div>
              <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8, lineHeight: 1.1 }}>
                {quote.clientName || 'Valued Client'}
              </div>
              <div style={{ fontSize: 18, marginTop: 12, opacity: 0.9 }}>
                {quote.projectName}
              </div>
              <div style={{ fontSize: 14, marginTop: 4, opacity: 0.7 }}>{quote.location}</div>

              <div style={styles.coverMeta}>
                <CoverMetaItem label="Quote No" value={quote.quoteNumber} />
                <CoverMetaItem label="Date" value={quote.date} />
                <CoverMetaItem label="Valid Until" value={quote.validUntil} />
              </div>

              <div style={styles.coverTotalBox}>
                <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.7 }}>ESTIMATED TOTAL</div>
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 4 }}>
                  {fmtINR(breakdown.grandTotal)}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {company.tagline} · {company.website}
            </div>
          </div>
        </div>

        {/* ---------- PAGE 2–3 — QUOTE BODY ---------- */}
        <div className="quote-pdf-page" style={{ padding: 0 }}>
          {/* dark header bar */}
          <div style={styles.bodyHeader}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{company.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{company.tagline}</div>
            </div>
            <div style={styles.monogramSmall}>{company.logoText}</div>
          </div>

          <div style={{ padding: '28px 36px' }}>
            {/* detail cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <DetailCard title="Client Details" accent={company.accent}>
                <DetailRow k="Name" v={quote.clientName} />
                <DetailRow k="Email" v={quote.clientEmail} />
                <DetailRow k="Phone" v={quote.clientPhone} />
                <DetailRow k="Location" v={quote.location} />
              </DetailCard>
              <DetailCard title="Quotation Details" accent={company.accent}>
                <DetailRow k="Quote No" v={quote.quoteNumber} />
                <DetailRow k="Project" v={quote.projectName} />
                <DetailRow k="Date" v={quote.date} />
                <DetailRow k="Valid Until" v={quote.validUntil} />
              </DetailCard>
            </div>

            {/* table */}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '9%' }}>Article No.</th>
                  <th style={{ ...styles.th, width: '41%' }}>Description</th>
                  <th style={{ ...styles.th, width: '9%' }}>HSN</th>
                  <th style={{ ...styles.th, width: '13%', textAlign: 'right' }}>
                    {perSqft ? 'Area' : 'Qty'}
                  </th>
                  <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>
                    {perSqft ? '₹/sqft' : 'Unit Price'}
                  </th>
                  <th style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.article}>
                    <td style={styles.td}>{r.article}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{r.description}</div>
                      {!isCustom &&
                        r.subLines.map((s, i) => (
                          <div key={i} style={{ fontSize: 10, color: '#64748b' }}>
                            {s}
                          </div>
                        ))}
                    </td>
                    <td style={styles.td}>{r.hsn}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.qtyOrArea}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.unitOrPerSqft}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                      {fmtINR(r.amount)}
                    </td>
                  </tr>
                ))}
                {breakdown.transportCost > 0 && (
                  <tr>
                    <td style={styles.td}>—</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>Transport &amp; logistics</div>
                    </td>
                    <td style={styles.td}>9965</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>1</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {fmtINR(breakdown.transportCost)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                      {fmtINR(breakdown.transportCost)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ width: 300 }}>
                <TotalRow k="Subtotal" v={fmtINR(breakdown.subtotalBeforeGst)} />
                {quote.includeGst && <TotalRow k="GST (18%)" v={fmtINR(breakdown.gstAmount)} />}
                <div style={styles.grandTotalRow}>
                  <span>Grand Total</span>
                  <span>{fmtINR(breakdown.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* scope */}
            <SectionBlock title="Scope of Supply" accent={company.accent}>
              <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                Supply and installation of PONGS stretch-ceiling system including imported membrane,
                aluminium gripper profiles, integrated lighting and all associated hardware as
                detailed above. Executed by trained PONGS-certified installers.
              </p>
            </SectionBlock>

            {quote.notes && (
              <SectionBlock title="Notes" accent={company.accent}>
                <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {quote.notes}
                </p>
              </SectionBlock>
            )}

            {/* terms */}
            <SectionBlock title="Terms &amp; Conditions" accent={company.accent}>
              <ol style={{ fontSize: 10, color: '#475569', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
                {TERMS.map((t, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>
                    {t}
                  </li>
                ))}
              </ol>
            </SectionBlock>

            {/* banking + signature */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
              <DetailCard title="Banking Details" accent={company.accent}>
                <DetailRow k="Bank" v={company.bank.name} />
                <DetailRow k="A/C Name" v={company.bank.accountName} />
                <DetailRow k="A/C No" v={company.bank.accountNumber} />
                <DetailRow k="IFSC" v={company.bank.ifsc} />
                <DetailRow k="GSTIN" v={company.gstin} />
              </DetailCard>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 8, marginTop: 60 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Authorised Signatory</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{company.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- PAGE 4 — WHY CHOOSE ---------- */}
        <div className="quote-pdf-page" style={styles.whyPage}>
          <div style={styles.whyOverlay} />
          <div style={styles.whyContent}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>Why {company.shortName}?</div>
            <ul style={{ marginTop: 24, fontSize: 15, lineHeight: 2, listStyle: 'none', padding: 0 }}>
              <li>✓ Authentic German PONGS membrane</li>
              <li>✓ Seamless spans and bespoke geometry</li>
              <li>✓ Integrated, engineered lighting</li>
              <li>✓ Certified installation teams</li>
              <li>✓ Precision-calculated, transparent pricing</li>
            </ul>
            <div style={styles.whyFooter}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{company.name}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                {company.address}, {company.city}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {company.phone} · {company.email} · {company.website}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function CoverMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.6 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

function DetailCard({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          background: '#f8fafc',
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: accent,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '10px 12px' }}>{children}</div>
    </div>
  )
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
      <span style={{ color: '#94a3b8' }}>{k}</span>
      <span style={{ color: '#0f172a', fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>
        {v || '—'}
      </span>
    </div>
  )
}

function TotalRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        padding: '6px 0',
        color: '#475569',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span>{k}</span>
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{v}</span>
    </div>
  )
}

function SectionBlock({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#0f172a',
          borderLeft: `3px solid ${accent}`,
          paddingLeft: 8,
          marginBottom: 8,
        }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
function getStyles(accent: string): Record<string, React.CSSProperties> {
  return {
    cover: {
      backgroundImage:
        "linear-gradient(135deg, #0f1420 0%, #1a2540 100%), url('/cover-bg.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: '#fff',
      padding: 0,
    },
    coverOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(15,20,32,0.55) 0%, rgba(15,20,32,0.9) 100%)',
    },
    coverContent: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      minHeight: 1123,
      padding: 56,
      boxSizing: 'border-box',
    },
    coverMonogram: {
      width: 64,
      height: 64,
      borderRadius: 12,
      border: `2px solid ${accent}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      fontWeight: 700,
      color: accent,
    },
    coverMeta: {
      display: 'flex',
      gap: 40,
      marginTop: 40,
    },
    coverTotalBox: {
      marginTop: 40,
      display: 'inline-block',
      border: `1px solid ${accent}`,
      borderRadius: 10,
      padding: '18px 28px',
      background: 'rgba(0,0,0,0.25)',
    },
    bodyHeader: {
      background: '#0f1420',
      color: '#fff',
      padding: '24px 36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monogramSmall: {
      width: 46,
      height: 46,
      borderRadius: 8,
      border: `2px solid ${accent}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      fontWeight: 700,
      color: accent,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
    },
    th: {
      background: '#0f1420',
      color: '#fff',
      padding: '9px 10px',
      textAlign: 'left',
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    td: {
      padding: '9px 10px',
      borderBottom: '1px solid #e2e8f0',
      color: '#334155',
      verticalAlign: 'top',
    },
    grandTotalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      background: '#0f1420',
      color: '#fff',
      padding: '12px 14px',
      borderRadius: 6,
      marginTop: 8,
      fontSize: 15,
      fontWeight: 700,
    },
    whyPage: {
      backgroundImage:
        "linear-gradient(135deg, #0f1420 0%, #1a2540 100%), url('/why-pongs.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: '#fff',
    },
    whyOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(15,20,32,0.72)',
    },
    whyContent: {
      position: 'relative',
      padding: 56,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: 1123,
      boxSizing: 'border-box',
    },
    whyFooter: {
      marginTop: 'auto',
      paddingTop: 40,
    },
  }
}
