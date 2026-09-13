import { notFound } from 'next/navigation'
import { ClientPdfDocument } from '@/components/ClientPdfDocument'
import { dbGetQuote } from '@/lib/db'
import { calculateQuote } from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export default async function ClientPdfPage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  const breakdown = calculateQuote(quote)
  return <ClientPdfDocument quote={quote} breakdown={breakdown} />
}
