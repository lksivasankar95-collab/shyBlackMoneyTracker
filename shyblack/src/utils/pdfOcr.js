/**
 * OCR pipeline for scanned (image-based) bank statement PDFs.
 * pdfjs-dist renders pages to canvas; tesseract.js recognizes the text.
 * Both libraries are lazy-loaded so the main bundle stays lean.
 */

import { isOnline } from './connectivity'

const MIN_TEXT_LENGTH = 120

/**
 * Decides whether extracted PDF text is too sparse to be a real statement
 * (scanned PDFs have no text layer) and OCR is needed.
 */
export function shouldOcrPdf(text) {
  const t = String(text || '').trim()
  if (t.length < MIN_TEXT_LENGTH) return true
  // Bank statements almost always contain currency-style decimals
  return !/[\d,]+\.\d{2}/.test(t)
}

/**
 * Renders every page of a PDF to a canvas and OCRs it with tesseract.js.
 * Browser-only (uses document/canvas). Returns the combined recognized text.
 */
export async function ocrPdfPages(arrayBuffer, options = {}) {
  const {
    onProgress,
    scale = 2,
    maxPages = 12,
    quality = 0.7,
  } = options

  const [pdfjs, tesseract] = await Promise.all([
    import('pdfjs-dist'),
    import('tesseract.js'),
  ])

  const doc = await pdfjs.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise

  const pageCount = Math.min(doc.numPages, maxPages)
  let worker = null
  let text = ''

  const getWorker = () => worker || (worker = tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  }))

  try {
    for (let i = 1; i <= pageCount; i++) {
      if (onProgress) onProgress((i - 1) / pageCount, `page ${i}/${pageCount}`)
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise

      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/jpeg', quality)
        } catch (e) {
          reject(e)
        }
      })

      const w = await getWorker()
      const { data } = await w.recognize(blob)
      text += (data.text || '') + '\n'
    }
  } finally {
    try {
      if (worker) await worker.terminate()
    } catch { /* ignore termination errors */ }
  }
  return text.trim()
}

/**
 * Smart PDF text extraction: tries the embedded text layer first, and falls
 * back to full-page OCR only when the text looks like a scanned statement.
 */
export async function extractPdfWithOcrFallback(extractTextFn, arrayBuffer, onProgress) {
  let text = ''
  try {
    text = (await extractTextFn(arrayBuffer)) || ''
  } catch {
    text = ''
  }
  if (!shouldOcrPdf(text)) return { text, ocrUsed: false }
  if (!isOnline()) return { text, ocrUsed: false, offline: true }
  if (onProgress) onProgress(0.02, 'starting OCR')
  const ocrText = await ocrPdfPages(arrayBuffer, { onProgress })
  return { text: ocrText || text, ocrUsed: true }
}
