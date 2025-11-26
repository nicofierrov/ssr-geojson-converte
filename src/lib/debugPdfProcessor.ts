import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface DiagnosticResult {
  success: boolean
  error?: string
  pdfInfo?: {
    numPages: number
    fingerprint: string
    encrypted: boolean
  }
  pages?: Array<{
    pageNum: number
    textLength: number
    textSample: string
    imageRendered: boolean
    imageSize?: { width: number; height: number }
    error?: string
  }>
  timings: {
    loadPdf: number
    renderPages: number
    extractText: number
    total: number
  }
}

export async function runPDFDiagnostics(file: File): Promise<DiagnosticResult> {
  const startTime = Date.now()
  const result: DiagnosticResult = {
    success: false,
    timings: { loadPdf: 0, renderPages: 0, extractText: 0, total: 0 }
  }

  try {
    const loadStart = Date.now()
    const arrayBuffer = await file.arrayBuffer()
    
    console.log('PDF ArrayBuffer size:', arrayBuffer.byteLength)
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0
    })
    
    const pdfDoc = await loadingTask.promise
    result.timings.loadPdf = Date.now() - loadStart
    
    result.pdfInfo = {
      numPages: pdfDoc.numPages,
      fingerprint: pdfDoc.fingerprints?.[0] || 'unknown',
      encrypted: false
    }
    
    console.log('PDF loaded:', result.pdfInfo)
    
    result.pages = []
    
    const maxPages = Math.min(pdfDoc.numPages, 3)
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageResult: any = {
        pageNum,
        textLength: 0,
        textSample: '',
        imageRendered: false
      }
      
      try {
        const page = await pdfDoc.getPage(pageNum)
        console.log(`Page ${pageNum} loaded:`, page.getViewport({ scale: 1 }))
        
        const textStart = Date.now()
        try {
          const textContent = await page.getTextContent()
          const text = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
          
          pageResult.textLength = text.length
          pageResult.textSample = text.substring(0, 200)
          result.timings.extractText += Date.now() - textStart
          
          console.log(`Page ${pageNum} text extracted:`, {
            length: text.length,
            sample: text.substring(0, 100)
          })
        } catch (textError) {
          console.error(`Error extracting text from page ${pageNum}:`, textError)
          pageResult.error = `Text extraction failed: ${textError instanceof Error ? textError.message : 'Unknown error'}`
        }
        
        const renderStart = Date.now()
        try {
          const viewport = page.getViewport({ scale: 2.0 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d', { willReadFrequently: false })
          
          if (!context) {
            throw new Error('Could not get canvas context')
          }
          
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          const renderContext: any = {
            canvasContext: context,
            viewport: viewport
          }
          
          await page.render(renderContext).promise
          
          pageResult.imageRendered = true
          pageResult.imageSize = {
            width: canvas.width,
            height: canvas.height
          }
          result.timings.renderPages += Date.now() - renderStart
          
          console.log(`Page ${pageNum} rendered:`, pageResult.imageSize)
        } catch (renderError) {
          console.error(`Error rendering page ${pageNum}:`, renderError)
          pageResult.error = (pageResult.error ? pageResult.error + '; ' : '') + 
            `Render failed: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`
        }
        
      } catch (pageError) {
        console.error(`Error loading page ${pageNum}:`, pageError)
        pageResult.error = `Page load failed: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`
      }
      
      result.pages.push(pageResult)
    }
    
    result.success = true
    
  } catch (error) {
    console.error('PDF Diagnostics error:', error)
    result.error = error instanceof Error ? error.message : 'Unknown error'
    result.success = false
  }
  
  result.timings.total = Date.now() - startTime
  
  return result
}

export function formatDiagnosticReport(result: DiagnosticResult): string {
  let report = '=== PDF DIAGNOSTIC REPORT ===\n\n'
  
  report += `Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}\n`
  report += `Total Time: ${result.timings.total}ms\n\n`
  
  if (result.error) {
    report += `ERROR: ${result.error}\n\n`
  }
  
  if (result.pdfInfo) {
    report += '--- PDF INFO ---\n'
    report += `Pages: ${result.pdfInfo.numPages}\n`
    report += `Fingerprint: ${result.pdfInfo.fingerprint}\n`
    report += `Encrypted: ${result.pdfInfo.encrypted}\n\n`
  }
  
  report += '--- TIMINGS ---\n'
  report += `Load PDF: ${result.timings.loadPdf}ms\n`
  report += `Extract Text: ${result.timings.extractText}ms\n`
  report += `Render Pages: ${result.timings.renderPages}ms\n\n`
  
  if (result.pages && result.pages.length > 0) {
    report += '--- PAGE ANALYSIS ---\n'
    result.pages.forEach(page => {
      report += `\nPage ${page.pageNum}:\n`
      report += `  Text Length: ${page.textLength} chars\n`
      report += `  Image Rendered: ${page.imageRendered ? 'Yes' : 'No'}\n`
      if (page.imageSize) {
        report += `  Image Size: ${page.imageSize.width}x${page.imageSize.height}\n`
      }
      if (page.error) {
        report += `  ERROR: ${page.error}\n`
      }
      if (page.textSample) {
        report += `  Text Sample: "${page.textSample.substring(0, 100)}..."\n`
      }
    })
  }
  
  return report
}
