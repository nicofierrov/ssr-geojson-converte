import * as pdfjsLib from 'pdfjs-dist'
import { parseUTMCoordinate, isValidUTM18S, isValidChileanBounds } from './utmConverter'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface PageAnalysis {
  pageNumber: number
  pageType: 'map' | 'vertices_table' | 'tanks_table' | 'mixed' | 'unknown'
  confidence: number
  base64Image: string
  extractedText?: string
  rawAnalysis?: string
}

export interface CoordinateExtraction {
  label: string
  easting: number
  northing: number
  source: 'llm' | 'pdf_text' | 'regex'
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
  page: any,
  scale: number = 2.5
): Promise<string> {
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
  
  return canvas.toDataURL('image/png', 0.95)
}

export async function extractPDFText(page: any): Promise<string> {
  try {
    const textContent = await page.getTextContent()
    const textItems = textContent.items.map((item: any) => item.str)
    return textItems.join(' ')
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return ''
  }
}

export function extractCoordinatesFromText(text: string): CoordinateExtraction[] {
  const coordinates: CoordinateExtraction[] = []
  
  const patterns = [
    /([VvTtEePp][\s\-]?\d+|Vértice\s+\d+|Vertice\s+\d+|Estanque\s+\d+|V\d+|T\d+|E\d+|P\d+)\s*[:\-]?\s*(?:E|Este)?[\s:,]*(6\d{5}(?:[,.]?\d+)?)\s*[,;\s]\s*(?:N|Norte)?[\s:,]*(5\d{6}(?:[,.]?\d+)?)/gi,
    /(?:E|Este)[\s:]+(6\d{5}(?:[,.]?\d+)?)\s*[,;\s]\s*(?:N|Norte)[\s:]+(5\d{6}(?:[,.]?\d+)?)/gi,
    /(6\d{5}(?:[,.]?\d+)?)\s*[,;\s]\s*(5\d{6}(?:[,.]?\d+)?)/g
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
            source: 'pdf_text',
            confidence: 0.85
          })
        }
      }
    }
  }
  
  return coordinates
}

export async function analyzePageWithAI(
  base64Image: string,
  pdfText: string,
  pageNumber: number
): Promise<{ pageType: string; coordinates: any[]; confidence: number }> {
  
  const textSnippet = pdfText.substring(0, 3000)
  
  try {
    const promptText = `Analiza el texto extraído de una página PDF de documentación de un Servicio Sanitario Rural (SSR) de Chiloé, Chile.

TEXTO EXTRAÍDO DEL PDF (Página ${pageNumber}):
${textSnippet}

CONTEXTO GEOGRÁFICO:
- Sistema de coordenadas: UTM Huso 18 Sur (EPSG:32718), Datum WGS84
- Rango válido Este (E): 600,000 a 800,000 metros
- Rango válido Norte (N): 5,200,000 a 5,800,000 metros
- Formato común: E 654321.00, N 5234567.00 o 654321.00, 5234567.00

INSTRUCCIONES:
1. Identifica el tipo de contenido de esta página basándote en el texto
2. Extrae TODAS las coordenadas UTM que encuentres en el texto
3. Identifica el label/nombre de cada punto (V1, V2, Estanque 1, etc.)
4. Corrige errores comunes (letra O por número 0, letra I por número 1)

TIPOS DE PÁGINA:
- "vertices_table": Tabla con vértices del área de servicio (AS) o polígono
- "tanks_table": Tabla con ubicaciones de estanques de agua
- "map": Plano o mapa con coordenadas
- "mixed": Contiene múltiples tipos de información
- "unknown": No contiene coordenadas relevantes

Responde SOLO con un objeto JSON válido (sin markdown, sin explicaciones adicionales):
{
  "pageType": "vertices_table",
  "confidence": 0.9,
  "coordinates": [
    {"label": "V1", "easting": 654321.00, "northing": 5234567.00},
    {"label": "V2", "easting": 654322.50, "northing": 5234568.25}
  ],
  "observations": "Breve descripción de lo encontrado"
}

IMPORTANTE: 
- Verifica que todas las coordenadas estén dentro del rango válido
- Si no hay coordenadas, retorna un array vacío: "coordinates": []
- Si detectas errores en los números, corrígelos
- El campo "coordinates" DEBE ser un array (puede estar vacío pero debe existir)`

    const response = await window.spark.llm(promptText, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    return {
      pageType: parsed.pageType || 'unknown',
      coordinates: Array.isArray(parsed.coordinates) ? parsed.coordinates : [],
      confidence: parsed.confidence || 0.5
    }
  } catch (error) {
    console.error('Error en análisis con IA página', pageNumber, ':', error)
    return {
      pageType: 'unknown',
      coordinates: [],
      confidence: 0
    }
  }
}

export async function processWithImprovedMethod(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<ProcessResult> {
  
  const startTime = Date.now()
  
  onProgress?.(0, 100, 'Cargando archivo PDF...')
  
  let pdfDoc: any
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })
    pdfDoc = await loadingTask.promise
  } catch (error) {
    console.error('Error cargando PDF:', error)
    throw new Error(`No se pudo cargar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
  
  const numPages = pdfDoc.numPages
  
  onProgress?.(5, 100, `PDF cargado: ${numPages} páginas detectadas`)
  
  const pages: PageAnalysis[] = []
  const allVertexCoords: CoordinateExtraction[] = []
  const allTankCoords: CoordinateExtraction[] = []
  let mapPageNumber: number | undefined
  
  const maxPagesToProcess = Math.min(numPages, 10)
  
  for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
    const baseProgress = 5 + ((pageNum - 1) / maxPagesToProcess) * 85
    
    try {
      onProgress?.(
        baseProgress,
        100,
        `Procesando página ${pageNum}/${maxPagesToProcess}...`
      )
      
      const page = await pdfDoc.getPage(pageNum)
      
      onProgress?.(
        baseProgress + 2,
        100,
        `Renderizando página ${pageNum}/${maxPagesToProcess}...`
      )
      
      const base64Image = await renderPDFPageToImage(page, 2.5)
      
      onProgress?.(
        baseProgress + 4,
        100,
        `Extrayendo texto de página ${pageNum}/${maxPagesToProcess}...`
      )
      
      const pdfText = await extractPDFText(page)
      
      onProgress?.(
        baseProgress + 6,
        100,
        `Buscando coordenadas en página ${pageNum}/${maxPagesToProcess}...`
      )
      
      const regexCoords = extractCoordinatesFromText(pdfText)
      
      onProgress?.(
        baseProgress + 8,
        100,
        `Analizando página ${pageNum}/${maxPagesToProcess} con IA...`
      )
      
      const aiAnalysis = await analyzePageWithAI(base64Image, pdfText, pageNum)
      
      const aiCoords: CoordinateExtraction[] = aiAnalysis.coordinates
        .filter((c: any) => c.easting && c.northing)
        .map((c: any) => ({
          label: c.label || `P${pageNum}-${allVertexCoords.length + 1}`,
          easting: typeof c.easting === 'string' ? parseFloat(c.easting.replace(/[,\s]/g, '')) : c.easting,
          northing: typeof c.northing === 'string' ? parseFloat(c.northing.replace(/[,\s]/g, '')) : c.northing,
          source: 'llm' as const,
          confidence: aiAnalysis.confidence
        }))
        .filter((c: CoordinateExtraction) => isValidUTM18S(c.easting, c.northing))
      
      const allPageCoords = [...regexCoords, ...aiCoords]
      const uniqueCoords = deduplicateCoordinates(allPageCoords)
      
      const pageAnalysis: PageAnalysis = {
        pageNumber: pageNum,
        pageType: aiAnalysis.pageType as any,
        confidence: aiAnalysis.confidence,
        base64Image,
        extractedText: pdfText.substring(0, 1000),
        rawAnalysis: JSON.stringify(aiAnalysis, null, 2)
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
      
      await sleep(300)
      
    } catch (error) {
      console.error(`Error procesando página ${pageNum}:`, error)
      onProgress?.(
        baseProgress + 8,
        100,
        `Error en página ${pageNum}, continuando...`
      )
    }
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
        metodo: 'PDF.js + IA',
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
        metodo: 'PDF.js + IA',
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
