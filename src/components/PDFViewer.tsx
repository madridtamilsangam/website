import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getPdfContent } from '../services/api'

interface PDFViewerProps {
  pdfFileId: string
}

// Set up the worker for pdfjs - use locally imported worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export default function PDFViewer({ pdfFileId }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)

  // Validate that we have a PDF file ID
  if (!pdfFileId || !pdfFileId.trim()) {
    return (
      <div className="pdf-viewer-error">
        <p>No PDF file configured</p>
      </div>
    )
  }

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch PDF bytes through our own backend (avoids Google Drive CORS issues)
        const { base64 } = await getPdfContent(pdfFileId)
        const pdfData = base64ToUint8Array(base64)

        const pdf = await pdfjs.getDocument({ data: pdfData }).promise

        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)
        setCurrentPage(1)

        // Render first page
        await renderPage(1, pdf)
      } catch (err) {
        console.error('PDF loading error:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load PDF'
        setError(`${errorMsg} (File ID: ${pdfFileId})`)
      } finally {
        setLoading(false)
      }
    }

    loadPDF()
  }, [pdfFileId])

  const renderPage = async (pageNum: number, pdfDoc?: PDFDocumentProxy | null) => {
    const pdf = pdfDoc || pdfDocRef.current
    if (!pdf || !canvasRef.current) return

    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }

      await page.render(renderContext).promise
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render page')
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      renderPage(newPage)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      renderPage(newPage)
    }
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>Error loading PDF: {error}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer">
      {loading && <div className="pdf-loading">Loading PDF...</div>}

      {!loading && totalPages > 0 && (
        <>
          <div className="pdf-canvas-wrapper">
            <canvas ref={canvasRef} className="pdf-canvas" />
          </div>

          <div className="pdf-controls">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="pdf-button pdf-prev-btn"
              title="Previous page"
            >
              ← Previous
            </button>

            <div className="pdf-page-info">
              Page <span className="page-number">{currentPage}</span> of{' '}
              <span className="page-total">{totalPages}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="pdf-button pdf-next-btn"
              title="Next page"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
