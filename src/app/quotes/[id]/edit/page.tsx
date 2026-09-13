import { notFound } from 'next/navigation'
import { QuoteBuilder } from '@/components/QuoteBuilder'
import { dbGetQuote } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  return <QuoteBuilder mode="edit" initial={quote} />
}
