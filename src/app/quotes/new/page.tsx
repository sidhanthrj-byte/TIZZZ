import { QuoteBuilder } from '@/components/QuoteBuilder'
import { newQuote } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

export default function NewQuotePage() {
  // Fresh quote created client-side; persisted on first autosave.
  const initial = newQuote()
  return <QuoteBuilder mode="new" initial={initial} />
}
