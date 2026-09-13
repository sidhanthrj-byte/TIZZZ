// ============================================================================
// Persistence — Turso / libSQL. Each quote is a single JSON row.
// Falls back to an in-memory store when env vars are absent (local/dev/CI),
// so the app and build never hard-fail on missing credentials.
// ============================================================================
import { createClient, type Client } from '@libsql/client'
import { v4 as uuid } from 'uuid'
import type { Quote } from './types'
import { calculateQuote } from './calculations'

let client: Client | null = null
let initPromise: Promise<void> | null = null

// In-memory fallback (per server instance)
const memory = new Map<string, Quote>()
let memoryCounter = 0

function getClient(): Client | null {
  if (client) return client
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) return null
  client = createClient({ url, authToken })
  return client
}

async function ensureInit(): Promise<void> {
  const c = getClient()
  if (!c) return
  if (!initPromise) {
    initPromise = c
      .execute(
        `CREATE TABLE IF NOT EXISTS quotes (
          id TEXT PRIMARY KEY,
          quote_number TEXT,
          client_name TEXT,
          project_name TEXT,
          status TEXT,
          grand_total REAL,
          data TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        )`,
      )
      .then(() => {})
  }
  return initPromise
}

function rowToQuote(row: Record<string, unknown>): Quote {
  return JSON.parse(String(row.data)) as Quote
}

export async function dbNextQuoteNumber(): Promise<string> {
  const c = getClient()
  if (!c) {
    memoryCounter += 1
    return `Q-${String(memoryCounter).padStart(4, '0')}`
  }
  await ensureInit()
  const res = await c.execute('SELECT quote_number FROM quotes')
  let max = 0
  for (const r of res.rows) {
    const qn = String((r as Record<string, unknown>).quote_number ?? '')
    const m = qn.match(/Q-(\d+)/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `Q-${String(max + 1).padStart(4, '0')}`
}

export async function dbListQuotes(): Promise<Quote[]> {
  const c = getClient()
  if (!c) {
    return Array.from(memory.values()).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    )
  }
  await ensureInit()
  const res = await c.execute('SELECT data FROM quotes ORDER BY updated_at DESC')
  return res.rows.map((r) => rowToQuote(r as Record<string, unknown>))
}

export async function dbGetQuote(id: string): Promise<Quote | null> {
  const c = getClient()
  if (!c) return memory.get(id) ?? null
  await ensureInit()
  const res = await c.execute({ sql: 'SELECT data FROM quotes WHERE id = ?', args: [id] })
  if (res.rows.length === 0) return null
  return rowToQuote(res.rows[0] as Record<string, unknown>)
}

export async function dbSaveQuote(quote: Quote): Promise<Quote> {
  const now = new Date().toISOString()
  const toSave: Quote = { ...quote, updatedAt: now }
  if (!toSave.createdAt) toSave.createdAt = now
  if (!toSave.id) toSave.id = uuid()
  if (!toSave.quoteNumber) toSave.quoteNumber = await dbNextQuoteNumber()

  const breakdown = calculateQuote(toSave)
  toSave.grandTotal = breakdown.grandTotal

  const c = getClient()
  if (!c) {
    memory.set(toSave.id, toSave)
    return toSave
  }
  await ensureInit()
  await c.execute({
    sql: `INSERT INTO quotes (id, quote_number, client_name, project_name, status, grand_total, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            quote_number=excluded.quote_number,
            client_name=excluded.client_name,
            project_name=excluded.project_name,
            status=excluded.status,
            grand_total=excluded.grand_total,
            data=excluded.data,
            updated_at=excluded.updated_at`,
    args: [
      toSave.id,
      toSave.quoteNumber,
      toSave.clientName,
      toSave.projectName,
      toSave.status ?? 'draft',
      toSave.grandTotal ?? 0,
      JSON.stringify(toSave),
      toSave.createdAt,
      toSave.updatedAt,
    ],
  })
  return toSave
}

export async function dbDeleteQuote(id: string): Promise<void> {
  const c = getClient()
  if (!c) {
    memory.delete(id)
    return
  }
  await ensureInit()
  await c.execute({ sql: 'DELETE FROM quotes WHERE id = ?', args: [id] })
}

export function isPersistent(): boolean {
  return !!process.env.TURSO_DATABASE_URL
}
