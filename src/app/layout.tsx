import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PONGS Quote Maker',
  description: 'Professional quotation terminal for PONGS stretch-ceiling projects',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
