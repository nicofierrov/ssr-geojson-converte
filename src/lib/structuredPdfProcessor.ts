import { parseUTMCoordinate, isValidUTM18S, isValidChileanBounds } from './utmConverter'

export interface PDFSection {
  type: 'map' | 'vertices' | 'tanks' | 'unknown'
  confidence: number
  content: string
  startPage?: number
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

export interface ExtractedPDFData {
  sections: PDFSection[]
  vertices: VertexData[]
  tanks: TankData[]
  hasMap: boolean
  overallConfidence: number
}

const SECTION_KEYWORDS = {
  vertices: ['vértices', 'vertices', 'área de servicio', 'area de servicio', 'límite', 'limite', 'polígono', 'poligono'],
  tanks: ['estanques', 'tanques', 'coordenadas estanques', 'punto', 'puntos'],
  map: ['mapa', 'plano', 'croquis', 'ubicación', 'ubicacion']
}

const NUMBER_PATTERN = /\d{6,7}(?:[.,]\d+)?/g

export async function analyzePDFStructure(file: File): Promise<PDFSection[]> {
  const text = await extractTextFromPDF(file)
  const sections: PDFSection[] = []
  
  const lowerText = text.toLowerCase()
  
  let hasVertices = false
  let hasTanks = false
  
  for (const keyword of SECTION_KEYWORDS.vertices) {
    if (lowerText.includes(keyword)) {
      hasVertices = true
      break
    }
  }
  
  for (const keyword of SECTION_KEYWORDS.tanks) {
    if (lowerText.includes(keyword)) {
      hasTanks = true
      break
    }
  }
  
  if (hasVertices) {
    const verticesSection = extractSectionText(text, SECTION_KEYWORDS.vertices)
    sections.push({
      type: 'vertices',
      confidence: 0.85,
      content: verticesSection
    })
  }
  
  if (hasTanks) {
    const tanksSection = extractSectionText(text, SECTION_KEYWORDS.tanks)
    sections.push({
      type: 'tanks',
      confidence: 0.85,
      content: tanksSection
    })
  }
  
  sections.push({
    type: 'map',
    confidence: 0.6,
    content: ''
  })
  
  return sections
}

function extractSectionText(fullText: string, keywords: string[]): string {
  const lowerText = fullText.toLowerCase()
  
  let startIndex = -1
  let matchedKeyword = ''
  
  for (const keyword of keywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1 && (startIndex === -1 || index < startIndex)) {
      startIndex = index
      matchedKeyword = keyword
    }
  }
  
  if (startIndex === -1) return ''
  
  const textFromKeyword = fullText.substring(startIndex)
  
  const lines = textFromKeyword.split('\n')
  const relevantLines = lines.slice(0, Math.min(50, lines.length))
  
  return relevantLines.join('\n')
}

export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const text = await parsePDFContent(arrayBuffer)
        resolve(text)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

async function parsePDFContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer)
  const decoder = new TextDecoder('utf-8')
  let text = decoder.decode(uint8Array)
  
  text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  const textObjects: string[] = []
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g
  let match
  
  while ((match = streamPattern.exec(text)) !== null) {
    const streamContent = match[1]
    const textMatch = /\((.*?)\)/g
    let textInStream
    while ((textInStream = textMatch.exec(streamContent)) !== null) {
      if (textInStream[1].trim()) {
        textObjects.push(textInStream[1])
      }
    }
  }
  
  const bjPattern = /BT\s*([\s\S]*?)\s*ET/g
  while ((match = bjPattern.exec(text)) !== null) {
    const content = match[1]
    const tjPattern = /\[(.*?)\]\s*TJ/g
    let tjMatch
    while ((tjMatch = tjPattern.exec(content)) !== null) {
      const innerText = tjMatch[1].replace(/[()]/g, '')
      if (innerText.trim()) {
        textObjects.push(innerText)
      }
    }
  }
  
  return textObjects.join(' ').replace(/\s+/g, ' ').trim() || 
         'No se pudo extraer texto. El PDF puede contener solo imágenes o estar encriptado.'
}

export function extractVerticesFromTable(sectionText: string): VertexData[] {
  const vertices: VertexData[] = []
  const lines = sectionText.split('\n')
  
  const coordinatePairs: Array<{easting: number, northing: number, lineIndex: number}> = []
  
  lines.forEach((line, index) => {
    const numbers = line.match(NUMBER_PATTERN)
    if (numbers && numbers.length >= 2) {
      const potentialEasting = parseFloat(numbers[0].replace(/[,.]/g, (m) => m === ',' ? '.' : ''))
      const potentialNorthing = parseFloat(numbers[1].replace(/[,.]/g, (m) => m === ',' ? '.' : ''))
      
      if (isValidUTM18S(potentialEasting, potentialNorthing)) {
        coordinatePairs.push({
          easting: potentialEasting,
          northing: potentialNorthing,
          lineIndex: index
        })
      }
    }
  })
  
  coordinatePairs.forEach((pair, index) => {
    try {
      const wgs84 = parseUTMCoordinate(pair.easting, pair.northing)
      
      if (isValidChileanBounds(wgs84.latitude, wgs84.longitude)) {
        const line = lines[pair.lineIndex]
        const nameMatch = line.match(/^([A-Z0-9-]+)/)
        
        vertices.push({
          id: `V${index + 1}`,
          name: nameMatch ? nameMatch[1] : undefined,
          easting: pair.easting,
          northing: pair.northing,
          latitude: wgs84.latitude,
          longitude: wgs84.longitude,
          confidence: 0.8
        })
      }
    } catch (error) {
      console.warn('Error convirtiendo vértice:', error)
    }
  })
  
  return vertices
}

export function extractTanksFromTable(sectionText: string): TankData[] {
  const tanks: TankData[] = []
  const lines = sectionText.split('\n')
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('estanque') || lowerLine.includes('tanque')) {
      const numbers = line.match(NUMBER_PATTERN)
      if (numbers && numbers.length >= 2) {
        const potentialEasting = parseFloat(numbers[0].replace(/[,.]/g, (m) => m === ',' ? '.' : ''))
        const potentialNorthing = parseFloat(numbers[1].replace(/[,.]/g, (m) => m === ',' ? '.' : ''))
        
        if (isValidUTM18S(potentialEasting, potentialNorthing)) {
          try {
            const wgs84 = parseUTMCoordinate(potentialEasting, potentialNorthing)
            
            if (isValidChileanBounds(wgs84.latitude, wgs84.longitude)) {
              const nameMatch = line.match(/estanque[s]?\s*([A-Z0-9-]+)/i) || 
                               line.match(/tanque[s]?\s*([A-Z0-9-]+)/i) ||
                               line.match(/^([A-Z0-9-]+)/)
              
              tanks.push({
                id: `T${tanks.length + 1}`,
                name: nameMatch ? nameMatch[1] : `Estanque ${tanks.length + 1}`,
                easting: potentialEasting,
                northing: potentialNorthing,
                latitude: wgs84.latitude,
                longitude: wgs84.longitude,
                confidence: 0.75
              })
            }
          } catch (error) {
            console.warn('Error convirtiendo estanque:', error)
          }
        }
      }
    }
  })
  
  return tanks
}

export async function processStructuredPDF(file: File): Promise<ExtractedPDFData> {
  const sections = await analyzePDFStructure(file)
  
  const verticesSection = sections.find(s => s.type === 'vertices')
  const tanksSection = sections.find(s => s.type === 'tanks')
  const hasMap = sections.some(s => s.type === 'map')
  
  const vertices = verticesSection ? extractVerticesFromTable(verticesSection.content) : []
  const tanks = tanksSection ? extractTanksFromTable(tanksSection.content) : []
  
  const totalItems = vertices.length + tanks.length
  const avgConfidence = totalItems > 0 
    ? ([...vertices, ...tanks].reduce((sum, item) => sum + item.confidence, 0) / totalItems)
    : 0
  
  return {
    sections,
    vertices,
    tanks,
    hasMap,
    overallConfidence: avgConfidence
  }
}

export function generateGeoJSONFromStructuredData(vertices: VertexData[], tanks: TankData[], properties: Record<string, any> = {}): any {
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
