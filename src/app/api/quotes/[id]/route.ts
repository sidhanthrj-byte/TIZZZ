import { NextResponse } from 'next/server'
import { dbDeleteQuote, dbGetQuote, dbSaveQuote } from '@/lib/db'
import { quoteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const quote = await dbGetQuote(params.id)
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ quote })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await dbGetQuote(params.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json().catch(() => ({}))
    const merged = { ...existing, ...body, id: params.id }
    const parsed = quoteSchema.safeParse(merged)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.errors },
        { status: 400 },
      )
    }
    const saved = await dbSaveQuote(parsed.data)
    return NextResponse.json({ quote: saved })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await dbDeleteQuote(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
