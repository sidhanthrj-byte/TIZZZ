import { NextResponse } from 'next/server'
import { calculateQuote } from '@/lib/calculations'
import { quoteSchema } from '@/lib/validation'
import { newQuote } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

// Optional endpoint — the engine already runs client-side. Useful for integrations.
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
    return NextResponse.json({ breakdown: calculateQuote(parsed.data) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
