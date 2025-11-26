import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'
import { parseUTMCoordinate, isValidUTM18S, isValidChileanBounds } from './utmConverter'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export interface PageAnalysis {
  pageNumber: number
  pageType: 'map' | 'vertices_table' | 'tanks_table' | 'mixed' | 'unknown'
  confidence: number
  base64Image: string
  extractedText?: string
  ocrText?: string
  rawAnalysis?: string
}

export interface CoordinateExtraction {
  label: string
  easting: number
  northing: number
  source: 'llm' | 'ocr' | 'regex'
  confidence: number
}

export interface VertexData {
  id: string
  name?: string
  easting: number
  northing: number
  latitude: number
  longitude: number
  confidence: number
}

export interface TankData {
  id: string
  name: string
  easting: number
  northing: number
  latitude: number
  longitude: number
  confidence: number
}

export interface ProcessResult {
  pages: PageAnalysis[]
  vertices: VertexData[]
  tanks: TankData[]
  mapPageNumber?: number
  overallConfidence: number
  processingTimeMs: number
}

export async function renderPDFPageToImage(
  pdfDoc: any,
  pageNumber: number,
  scale: number = 2.5
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  }
  
  await page.render(renderContext).promise
  
  return canvas.toDataURL('image/png', 1.0)
}

export async function performOCR(base64Image: string): Promise<string> {
  const worker = await createWorker('spa')
  
  try {
    const { data: { text } } = await worker.recognize(base64Image)
    await worker.terminate()
    return text
  } catch (error) {
    console.error('OCR error:', error)
    await worker.terminate()
    return ''
  }
}

export function extractCoordinatesFromText(text: string): CoordinateExtraction[] {
  const coordinates: CoordinateExtraction[] = []
  
  const patterns = [
    /([VvTtEePp][\s\-]?\d+|Vértice\s+\d+|Estanque\s+\d+|V\d+|T\d+|E\d+)\s*[:\-]?\s*(?:E|Este)?[\s:]*(6\d{5}[,.]?\d*)\s*[,;\s]\s*(?:N|Norte)?[\s:]*(5\d{6}[,.]?\d*)/gi,
    /(\d{6}[,.]?\d*)\s*[,;\s]\s*(\d{7}[,.]?\d*)/g,
    /E[\s:]*(6\d{5}[,.]?\d*)\s*N[\s:]*(5\d{6}[,.]?\d*)/gi,
    /Este[\s:]*(6\d{5}[,.]?\d*)\s*Norte[\s:]*(5\d{6}[,.]?\d*)/gi
  ]
  
  let labelCounter = 1
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    
    for (const match of matches) {
      let label = ''
      let eastingStr = ''
      let northingStr = ''
      
      if (match.length === 4 && match[1]) {
        label = match[1].trim()
        eastingStr = match[2]
        northingStr = match[3]
      } else if (match.length === 3) {
        label = `P${labelCounter++}`
        eastingStr = match[1]
        northingStr = match[2]
      }
      
      const easting = parseFloat(eastingStr.replace(/[,\s]/g, ''))
      const northing = parseFloat(northingStr.replace(/[,\s]/g, ''))
      
      if (isValidUTM18S(easting, northing)) {
        const isDuplicate = coordinates.some(
          coord => Math.abs(coord.easting - easting) < 1 && 
                   Math.abs(coord.northing - northing) < 1
        )
        
        if (!isDuplicate) {
          coordinates.push({
            label: label || `P${coordinates.length + 1}`,
            easting,
            northing,
            source: 'regex',
            confidence: 0.85
          })
        }
      }
    }
  }
  
  return coordinates
}

export async function analyzePageWithVision(
  base64Image: string,
  ocrText: string,
  pageNumber: number
): Promise<{ pageType: string; coordinates: any[]; confidence: number }> {
  
  const base64Data = base64Image.split(',')[1] || base64Image
  
  const ocrSnippet = ocrText.substring(0, 2000)
  
  const prompt = `Analiza esta imagen de una página PDF de un Servicio Sanitario Rural (SSR) de Chiloé, Chile.

TEXTO EXTRAÍDO POR OCR:
${ocrSnippet}

CONTEXTO:
- Sistema de coordenadas: UTM Huso 18 Sur (EPSG:32718), Datum WGS84
- Rango válido Este (E): 600,000 a 800,000 metros
- Rango válido Norte (N): 5,200,000 a 5,800,000 metros
- Formato típico: E 654321.00, N 5234567.00

TAREA:
1. Identifica el tipo de contenido principal de la página
2. Extrae TODAS las coordenadas UTM que encuentres (del OCR o visualmente)
3. Identifica el label/nombre de cada coordenada

TIPOS DE PÁGINA:
- "vertices_table": Tabla con vértices del área de servicio (AS)
- "tanks_table": Tabla con coordenadas de estanques
- "map": Plano/mapa con coordenadas visuales
- "mixed": Múltiples elementos
- "unknown": No hay coordenadas

FORMATO DE RESPUESTA (solo JSON válido):
{
  "pageType": "vertices_table",
  "confidence": 0.9,
  "coordinates": [
    {"label": "V1", "easting": 654321.00, "northing": 5234567.00},
    {"label": "V2", "easting": 654322.50, "northing": 5234568.25}
  ],
  "observations": "Tabla con 5 vértices del área de servicio"
}

IMPORTANTE: 
- Verifica que las coordenadas estén en el rango válido
- Si el OCR tiene errores (O en vez de 0, etc), corrígelos
- Array vacío si no hay coordenadas
- Responde SOLO con JSON, sin markdown ni explicaciones`

  try {
    const response = await window.spark.llm(prompt, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    return {
      pageType: parsed.pageType || 'unknown',
      coordinates: Array.isArray(parsed.coordinates) ? parsed.coordinates : [],
      confidence: parsed.confidence || 0.5
    }
  } catch (error) {
    console.error('Error en análisis con visión:', error)
    return {
      pageType: 'unknown',
      coordinates: [],
      confidence: 0
    }
  }
}

export async function processWithOCR(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<ProcessResult> {
  
  const startTime = Date.now()
  
  onProgress?.(0, 100, 'Cargando PDF...')
  
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdfDoc.numPages
  
  onProgress?.(5, 100, `PDF cargado: ${numPages} páginas`)
  
  const pages: PageAnalysis[] = []
  const allVertexCoords: CoordinateExtraction[] = []
  const allTankCoords: CoordinateExtraction[] = []
  let mapPageNumber: number | undefined
  
  const maxPagesToProcess = Math.min(numPages, 15)
  
  for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
    const baseProgress = 5 + ((pageNum - 1) / maxPagesToProcess) * 85
    
    onProgress?.(
      baseProgress,
      100,
      `Renderizando página ${pageNum}/${maxPagesToProcess}...`
    )
    
    const base64Image = await renderPDFPageToImage(pdfDoc, pageNum)
    
    onProgress?.(
      baseProgress + 5,
      100,
      `Ejecutando OCR en página ${pageNum}/${maxPagesToProcess}...`
    )
    
    const ocrText = await performOCR(base64Image)
    
    const regexCoords = extractCoordinatesFromText(ocrText)
    
    onProgress?.(
      baseProgress + 10,
      100,
      `Analizando contenido página ${pageNum}/${maxPagesToProcess} con IA...`
    )
    
    const visionAnalysis = await analyzePageWithVision(base64Image, ocrText, pageNum)
    
    const llmCoords: CoordinateExtraction[] = visionAnalysis.coordinates
      .filter((c: any) => c.easting && c.northing)
      .map((c: any) => ({
        label: c.label || `P${pageNum}-${allVertexCoords.length + 1}`,
        easting: typeof c.easting === 'string' ? parseFloat(c.easting.replace(/[,\s]/g, '')) : c.easting,
        northing: typeof c.northing === 'string' ? parseFloat(c.northing.replace(/[,\s]/g, '')) : c.northing,
        source: 'llm' as const,
        confidence: visionAnalysis.confidence
      }))
      .filter((c: CoordinateExtraction) => isValidUTM18S(c.easting, c.northing))
    
    const allPageCoords = [...regexCoords, ...llmCoords]
    const uniqueCoords = deduplicateCoordinates(allPageCoords)
    
    const pageAnalysis: PageAnalysis = {
      pageNumber: pageNum,
      pageType: visionAnalysis.pageType as any,
      confidence: visionAnalysis.confidence,
      base64Image,
      ocrText,
      extractedText: JSON.stringify(uniqueCoords),
      rawAnalysis: JSON.stringify(visionAnalysis, null, 2)
    }
    
    pages.push(pageAnalysis)
    
    if (pageAnalysis.pageType === 'map' && !mapPageNumber) {
      mapPageNumber = pageNum
    }
    
    if (pageAnalysis.pageType === 'vertices_table' || 
        (pageAnalysis.pageType === 'mixed' && uniqueCoords.length >= 3)) {
      allVertexCoords.push(...uniqueCoords)
    } else if (pageAnalysis.pageType === 'tanks_table') {
      allTankCoords.push(...uniqueCoords)
    } else if (uniqueCoords.length > 0) {
      if (uniqueCoords.length >= 3) {
        allVertexCoords.push(...uniqueCoords)
      } else {
        allTankCoords.push(...uniqueCoords)
      }
    }
    
    await sleep(500)
  }
  
  onProgress?.(92, 100, 'Convirtiendo coordenadas UTM a WGS84...')
  
  const vertices: VertexData[] = []
  const deduplicatedVertexCoords = deduplicateCoordinates(allVertexCoords)
  
  for (const coord of deduplicatedVertexCoords) {
    try {
      const wgs84 = parseUTMCoordinate(coord.easting, coord.northing)
      if (isValidChileanBounds(wgs84.latitude, wgs84.longitude)) {
        vertices.push({
          id: `V${vertices.length + 1}`,
          name: coord.label,
          easting: coord.easting,
          northing: coord.northing,
          latitude: wgs84.latitude,
          longitude: wgs84.longitude,
          confidence: coord.confidence
        })
      }
    } catch (error) {
      console.warn('Error convirtiendo vértice:', error)
    }
  }
  
  const tanks: TankData[] = []
  const deduplicatedTankCoords = deduplicateCoordinates(allTankCoords)
  
  for (const coord of deduplicatedTankCoords) {
    try {
      const wgs84 = parseUTMCoordinate(coord.easting, coord.northing)
      if (isValidChileanBounds(wgs84.latitude, wgs84.longitude)) {
        tanks.push({
          id: `T${tanks.length + 1}`,
          name: coord.label || `Estanque ${tanks.length + 1}`,
          easting: coord.easting,
          northing: coord.northing,
          latitude: wgs84.latitude,
          longitude: wgs84.longitude,
          confidence: coord.confidence
        })
      }
    } catch (error) {
      console.warn('Error convirtiendo estanque:', error)
    }
  }
  
  onProgress?.(98, 100, 'Calculando confianza general...')
  
  const totalItems = vertices.length + tanks.length
  const avgConfidence = totalItems > 0
    ? ([...vertices, ...tanks].reduce((sum, item) => sum + item.confidence, 0) / totalItems)
    : 0
  
  const processingTimeMs = Date.now() - startTime
  
  onProgress?.(100, 100, '¡Análisis completo!')
  
  return {
    pages,
    vertices,
    tanks,
    mapPageNumber,
    overallConfidence: avgConfidence,
    processingTimeMs
  }
}

function deduplicateCoordinates(coords: CoordinateExtraction[]): CoordinateExtraction[] {
  const unique: CoordinateExtraction[] = []
  
  for (const coord of coords) {
    const isDuplicate = unique.some(
      existing => 
        Math.abs(existing.easting - coord.easting) < 2 && 
        Math.abs(existing.northing - coord.northing) < 2
    )
    
    if (!isDuplicate) {
      unique.push(coord)
    }
  }
  
  return unique
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateGeoJSONFromData(
  vertices: VertexData[], 
  tanks: TankData[], 
  properties: Record<string, any> = {}
): any {
  const features: any[] = []
  
  if (vertices.length > 0) {
    const coordinates = vertices.map(v => [v.longitude, v.latitude])
    
    if (coordinates.length > 2) {
      if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
        coordinates.push(coordinates[0])
      }
    }
    
    features.push({
      type: 'Feature',
      properties: {
        tipo: 'Área de Servicio',
        vertices: vertices.length,
        metodo: 'OCR + Visión IA',
        ...properties
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    })
  }
  
  tanks.forEach(tank => {
    features.push({
      type: 'Feature',
      properties: {
        tipo: 'Estanque',
        id: tank.id,
        nombre: tank.name,
        easting: tank.easting,
        northing: tank.northing,
        confianza: tank.confidence,
        metodo: 'OCR + Visión IA',
        ...properties
      },
      geometry: {
        type: 'Point',
        coordinates: [tank.longitude, tank.latitude]
      }
    })
  })
  
  return {
    type: 'FeatureCollection',
    features
  }
}
