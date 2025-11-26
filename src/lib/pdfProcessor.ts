export interface CoordinateMatch {
  raw: string
  lat?: number
  lon?: number
  type: 'decimal' | 'dms' | 'utm' | 'unknown'
  confidence: number
}

export interface ExtractedData {
  text: string
  coordinates: CoordinateMatch[]
  confidence: number
}

const DECIMAL_DEGREES_PATTERN = /(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/g
const DMS_PATTERN = /(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)[\"″]?\s*([NSEW])/gi
const NAMED_COORD_PATTERN = /(lat|latitude|lon|long|longitude)[:\s]+(-?\d{1,3}\.\d+)/gi

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
    
    reader.onerror = () => reject(new Error('Failed to read file'))
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
         'Unable to extract text. This PDF may contain only images or be encrypted.'
}

export function parseCoordinates(text: string): CoordinateMatch[] {
  const coordinates: CoordinateMatch[] = []
  const seen = new Set<string>()
  
  const namedMatches = text.matchAll(NAMED_COORD_PATTERN)
  const coordPairs: Record<string, number> = {}
  
  for (const match of namedMatches) {
    const key = match[1].toLowerCase()
    const value = parseFloat(match[2])
    if (key.startsWith('lat')) {
      coordPairs['lat'] = value
    } else if (key.startsWith('lon') || key.startsWith('long')) {
      coordPairs['lon'] = value
    }
  }
  
  if (coordPairs.lat !== undefined && coordPairs.lon !== undefined) {
    const key = `${coordPairs.lat},${coordPairs.lon}`
    if (!seen.has(key) && isValidCoordinate(coordPairs.lat, coordPairs.lon)) {
      seen.add(key)
      coordinates.push({
        raw: `lat: ${coordPairs.lat}, lon: ${coordPairs.lon}`,
        lat: coordPairs.lat,
        lon: coordPairs.lon,
        type: 'decimal',
        confidence: 0.95
      })
    }
  }
  
  const decimalMatches = text.matchAll(DECIMAL_DEGREES_PATTERN)
  for (const match of decimalMatches) {
    const lat = parseFloat(match[1])
    const lon = parseFloat(match[2])
    const key = `${lat},${lon}`
    
    if (!seen.has(key) && isValidCoordinate(lat, lon)) {
      seen.add(key)
      coordinates.push({
        raw: match[0],
        lat,
        lon,
        type: 'decimal',
        confidence: 0.85
      })
    }
  }
  
  const dmsMatches = text.matchAll(DMS_PATTERN)
  const dmsGroups: any[] = []
  for (const match of dmsMatches) {
    dmsGroups.push(match)
  }
  
  for (let i = 0; i < dmsGroups.length - 1; i += 2) {
    const coord1 = dmsGroups[i]
    const coord2 = dmsGroups[i + 1]
    
    if (coord1 && coord2) {
      const decimal1 = dmsToDecimal(
        parseInt(coord1[1]),
        parseInt(coord1[2]),
        parseFloat(coord1[3]),
        coord1[4]
      )
      const decimal2 = dmsToDecimal(
        parseInt(coord2[1]),
        parseInt(coord2[2]),
        parseFloat(coord2[3]),
        coord2[4]
      )
      
      const lat = coord1[4].toUpperCase() === 'N' || coord1[4].toUpperCase() === 'S' ? decimal1 : decimal2
      const lon = coord1[4].toUpperCase() === 'E' || coord1[4].toUpperCase() === 'W' ? decimal1 : decimal2
      const key = `${lat},${lon}`
      
      if (!seen.has(key) && isValidCoordinate(lat, lon)) {
        seen.add(key)
        coordinates.push({
          raw: `${coord1[0]} ${coord2[0]}`,
          lat,
          lon,
          type: 'dms',
          confidence: 0.8
        })
      }
    }
  }
  
  return coordinates
}

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimal = degrees + minutes / 60 + seconds / 3600
  if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
    decimal = -decimal
  }
  return decimal
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

export function generateGeoJSON(coordinates: CoordinateMatch[], properties: Record<string, any> = {}): any {
  const features = coordinates
    .filter(coord => coord.lat !== undefined && coord.lon !== undefined)
    .map((coord, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [coord.lon, coord.lat]
      },
      properties: {
        id: index + 1,
        raw: coord.raw,
        type: coord.type,
        confidence: coord.confidence,
        ...properties
      }
    }))
  
  return {
    type: 'FeatureCollection',
    features
  }
}

export function calculateConfidence(text: string, coordinates: CoordinateMatch[]): number {
  if (coordinates.length === 0) return 0
  if (text.length < 50) return 0.3
  
  const avgConfidence = coordinates.reduce((sum, coord) => sum + coord.confidence, 0) / coordinates.length
  const hasNamedCoords = /lat|lon|latitude|longitude/i.test(text)
  const bonus = hasNamedCoords ? 0.1 : 0
  
  return Math.min(avgConfidence + bonus, 1)
}
