'use client'
import { useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'

export function SharePDF({
  fileName,
  selector = '.quote-pdf-page',
}: {
  fileName: string
  selector?: string
}) {
  const [busy, setBusy] = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const pages = Array.from(document.querySelectorAll<HTMLElement>(selector))
      if (pages.length === 0) return

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageW = 210
      const pageH = 297

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const imgH = (canvas.height * pageW) / canvas.width

        if (i > 0) pdf.addPage()

        if (imgH <= pageH) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH)
        } else {
          // split a taller-than-page section across multiple sheets
          let remaining = imgH
          let position = 0
          let first = true
          while (remaining > 0) {
            if (!first) pdf.addPage()
            pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
            remaining -= pageH
            position -= pageH
            first = false
          }
        }
      }

      const blob = pdf.output('blob')
      const file = new File([blob], fileName, { type: 'application/pdf' })

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
          return
        } catch {
          /* fall through to download */
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="btn-primary btn-sm" onClick={generate} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {busy ? 'Generating…' : 'Download / Share PDF'}
    </button>
  )
}
