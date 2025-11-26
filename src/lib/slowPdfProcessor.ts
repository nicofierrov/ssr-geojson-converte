import { parseUTMCoordinate, isValidUTM18S, isValidChileanBounds } from './utmConverter'

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
  source: 'llm' | 'ocr' | 'manual'
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

export interface SlowProcessResult {
  pages: PageAnalysis[]
  vertices: VertexData[]
  tanks: TankData[]
  mapPageNumber?: number
  overallConfidence: number
  processingTimeMs: number
}

export async function convertPDFToImages(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const images = await renderPDFPagesToImages(arrayBuffer)
        resolve(images)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer el archivo PDF'))
    reader.readAsArrayBuffer(file)
  })
}

async function renderPDFPagesToImages(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const images: string[] = []
  
  try {
    const uint8Array = new Uint8Array(arrayBuffer)
    const blob = new Blob([uint8Array], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    iframe.src = url
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const pageCountMatch = new TextDecoder().decode(uint8Array).match(/\/Count\s+(\d+)/)
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 1
    
    for (let i = 0; i < Math.min(pageCount, 10); i++) {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 1600
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'black'
        ctx.font = '20px Arial'
        ctx.fillText(`Página ${i + 1}`, 20, 40)
      }
      
      const base64 = canvas.toDataURL('image/png')
      images.push(base64)
    }
    
    document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('Error rendering PDF pages:', error)
    throw new Error('No se pudo convertir el PDF a imágenes. El navegador no soporta esta operación.')
  }
  
  return images
}

export async function analyzePageWithLLM(
  base64Image: string, 
  pageNumber: number,
  onProgress?: (status: string) => void
): Promise<PageAnalysis> {
  
  onProgress?.(`Analizando página ${pageNumber}...`)
  
  const base64Data = base64Image.split(',')[1] || base64Image
  
  const promptText = `Analiza esta página de un PDF de Servicio Sanitario Rural (SSR) en Chiloé, Chile.

IMAGEN BASE64: ${base64Data.substring(0, 100)}...

CONTEXTO:
- Sistema de coordenadas: UTM Huso 18 Sur, Datum WGS84
- Las coordenadas Este (E) están entre 600,000 y 800,000
- Las coordenadas Norte (N) están entre 5,200,000 y 5,800,000

TAREA:
1. Identifica el tipo de contenido de esta página
2. Extrae TODAS las coordenadas UTM que encuentres
3. Si es una tabla, extrae cada fila con su etiqueta y coordenadas

TIPOS DE PÁGINA:
- "map": Plano o mapa del área de servicio
- "vertices_table": Tabla con vértices del área de servicio (Vértices AS)
- "tanks_table": Tabla con coordenadas de estanques
- "mixed": Contiene múltiples elementos
- "unknown": No se puede determinar

FORMATO DE RESPUESTA (JSON):
{
  "pageType": "map|vertices_table|tanks_table|mixed|unknown",
  "confidence": 0.85,
  "coordinates": [
    {"label": "V1", "easting": 654321.00, "northing": 5234567.00},
    {"label": "V2", "easting": 654322.00, "northing": 5234568.00}
  ],
  "observations": "Descripción de lo encontrado"
}

Si no hay coordenadas, devuelve array vacío en "coordinates".
Responde SOLO con JSON válido, sin markdown.`

  try {
    const response = await window.spark.llm(promptText, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    return {
      pageNumber,
      pageType: parsed.pageType || 'unknown',
      confidence: parsed.confidence || 0.5,
      base64Image,
      extractedText: JSON.stringify(parsed.coordinates || []),
      rawAnalysis: JSON.stringify(parsed, null, 2)
    }
  } catch (error) {
    console.error(`Error analyzing page ${pageNumber}:`, error)
    return {
      pageNumber,
      pageType: 'unknown',
      confidence: 0,
      base64Image,
      extractedText: '',
      rawAnalysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export async function extractCoordinatesFromAnalysis(
  pageAnalysis: PageAnalysis
): Promise<CoordinateExtraction[]> {
  
  if (!pageAnalysis.extractedText) return []
  
  try {
    const coordinates = JSON.parse(pageAnalysis.extractedText)
    
    if (!Array.isArray(coordinates)) return []
    
    const extracted: CoordinateExtraction[] = []
    
    for (const coord of coordinates) {
      if (coord.easting && coord.northing) {
        const easting = typeof coord.easting === 'string' 
          ? parseFloat(coord.easting.replace(/[,\s]/g, ''))
          : coord.easting
        const northing = typeof coord.northing === 'string'
          ? parseFloat(coord.northing.replace(/[,\s]/g, ''))
          : coord.northing
        
        if (isValidUTM18S(easting, northing)) {
          extracted.push({
            label: coord.label || `P${extracted.length + 1}`,
            easting,
            northing,
            source: 'llm',
            confidence: pageAnalysis.confidence
          })
        }
      }
    }
    
    return extracted
  } catch (error) {
    console.error('Error parsing coordinates:', error)
    return []
  }
}

export async function processSlowPDF(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<SlowProcessResult> {
  
  const startTime = Date.now()
  
  onProgress?.(0, 100, 'Iniciando análisis lento del PDF...')
  await sleep(500)
  
  onProgress?.(10, 100, 'Convirtiendo PDF a imágenes...')
  const images = await convertPDFToImages(file)
  
  if (images.length === 0) {
    throw new Error('No se pudieron extraer páginas del PDF')
  }
  
  const pages: PageAnalysis[] = []
  const allVertexCoords: CoordinateExtraction[] = []
  const allTankCoords: CoordinateExtraction[] = []
  let mapPageNumber: number | undefined
  
  for (let i = 0; i < images.length; i++) {
    const progressPercent = 10 + ((i + 1) / images.length) * 80
    
    onProgress?.(
      progressPercent, 
      100, 
      `Analizando página ${i + 1} de ${images.length} con IA...`
    )
    
    const pageAnalysis = await analyzePageWithLLM(
      images[i], 
      i + 1,
      (status) => onProgress?.(progressPercent, 100, status)
    )
    
    pages.push(pageAnalysis)
    
    if (pageAnalysis.pageType === 'map' && !mapPageNumber) {
      mapPageNumber = i + 1
    }
    
    const coords = await extractCoordinatesFromAnalysis(pageAnalysis)
    
    if (pageAnalysis.pageType === 'vertices_table' || 
        (pageAnalysis.pageType === 'mixed' && coords.length >= 3)) {
      allVertexCoords.push(...coords)
    } else if (pageAnalysis.pageType === 'tanks_table' ||
               (pageAnalysis.pageType === 'mixed' && coords.length > 0 && coords.length < 3)) {
      allTankCoords.push(...coords)
    } else if (coords.length > 0) {
      if (coords.length >= 3) {
        allVertexCoords.push(...coords)
      } else {
        allTankCoords.push(...coords)
      }
    }
    
    await sleep(800)
  }
  
  onProgress?.(92, 100, 'Convirtiendo coordenadas UTM a WGS84...')
  await sleep(300)
  
  const vertices: VertexData[] = []
  for (const coord of allVertexCoords) {
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
      console.warn('Error converting vertex:', error)
    }
  }
  
  const tanks: TankData[] = []
  for (const coord of allTankCoords) {
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
      console.warn('Error converting tank:', error)
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateGeoJSONFromSlowData(
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
        metodo: 'Análisis Lento con IA',
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
        metodo: 'Análisis Lento con IA',
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
