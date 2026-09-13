import { NextResponse } from 'next/server'
import { dbListQuotes, dbSaveQuote } from '@/lib/db'
import { quoteSchema } from '@/lib/validation'
import { newQuote } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const quotes = await dbListQuotes()
    return NextResponse.json({ quotes })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const merged = { ...newQuote(), ...body }
    const parsed = quoteSchema.safeParse(merged)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.errors },
        { status: 400 },
      )
    }
    const saved = await dbSaveQuote(parsed.data)
    return NextResponse.json({ quote: saved }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
