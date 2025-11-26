import * as pdfjsLib from 'pdfjs-dist'


).toString()
export interface PageAnalysis {
  pageType: 'map'
  base64Imag

export interface AIAnalysisResu
  coordenadas: Array
    este: number
  }>
  base64Image: string
  aiAnalysis?: AIAnalysisResult
}

export interface AIAnalysisResult {
  tipo: string
  coordenadas: Array<{
    label: string
    este: number
    norte: number
  }>
  texto_extraido: string
  observaciones: string
}

export interface VertexData {
  id: string
  name?: string
  easting: number
  northing: number
  pages: PageAnaly
  longitude: number
  confidence: number
}

export interface TankData {
  page: any,
  name: string
  easting: number
  northing: number
  latitude: number
  longitude: number
  confidence: number
}

export interface ProcessResult {
  await page.render(ren
  vertices: VertexData[]
  tanks: TankData[]
  mapPageNumber?: number
  overallConfidence: number
  processingTimeMs: number
 

export async function renderPDFPageToImage(
  page: any,
  scale: number = 2.0
): Promise<string> {
  const viewport = page.getViewport({ scale })
3.
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height
IM
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  }
  
  await page.render(renderContext).promise
  
  return canvas.toDataURL('image/png', 0.92)
}

export async function analyzePageWithAI(
  base64Image: string,
  pageNumber: number
): Promise<AIAnalysisResult> {
  const base64Data = base64Image.split(',')[1]
  
  const prompt = spark.llmPrompt`Analiza esta imagen de un plano técnico de Servicio Sanitario Rural (SSR) en Chile.

PÁGINA: ${pageNumber}

CONTEXTO:
- Las coordenadas están en formato UTM Huso 18 Sur, Datum WGS84
- El Este (E) comienza con 6 (ejemplo: 645123.45)
- El Norte (N) comienza con 5 (ejemplo: 5234567.89)
- Pueden estar etiquetadas como V1, V2, V3... (vértices) o E1, E2... (estanques)

IDENTIFICAR:
1. Tipo de contenido: "vertices_area", "estanques", "mapa", "leyenda", "mixto", "desconocido"
2. TODAS las coordenadas UTM que encuentres en tablas o texto
3. Las etiquetas/nombres asociados a cada coordenada

FORMATO DE RESPUESTA (JSON):
{
  "tipo": "vertices_area|estanques|mapa|mixto|desconocido",
  "coordenadas": [
    {"label": "V1", "este": 645123.45, "norte": 5234567.89},
    {"label": "V2", "este": 645234.56, "norte": 5234678.90}
    
  "texto_extraido": "resumen del texto visible",
  "observaciones": "notas sobre calidad, problemas o ambigüedades"
}

IMPORTANTE:
- Si no encuentras coordenadas, devuelve array vacío
- Asegúrate de que Este empiece con 6 y Norte con 5
      let pageType: PageAnalysis['pageT
- Responde SOLO con JSON válido, sin markdown`

  try {
    const response = await spark.llm(prompt, 'gpt-4o', true)
    const result = JSON.parse(response)
    
    return {
      const confidence = aiAnalysis.coord
      coordenadas: result.coordenadas || [],
      texto_extraido: result.texto_extraido || '',
      observaciones: result.observaciones || ''
     
  } catch (error) {
    console.error(`Error analyzing page ${pageNumber}:`, error)
    return {
          if (!coord.este 
      coordenadas: [],
          if (coord.norte
      observaciones: `Error en análisis IA: ${error instanceof Error ? error.message : 'unknown'}`
    }
  }
 

export async function processWithAIOnly(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<ProcessResult> {
  const startTime = performance.now()
  
  try {
    onProgress?.(5, 100, 'Cargando PDF...')
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const numPages = pdf.numPages
    
    onProgress?.(10, 100, `PDF cargado: ${numPages} páginas`)
    
    const pages: PageAnalysis[] = []
    const allVertices: VertexData[] = []
    const allTanks: TankData[] = []
    let mapPageNumber: number | undefined
    
    for (let i = 1; i <= numPages; i++) {
      const progressPercent = 10 + Math.floor((i / numPages) * 80)
      onProgress?.(progressPercent, 100, `Analizando página ${i}/${numPages}...`)
      
      const page = await pdf.getPage(i)
      
      const base64Image = await renderPDFPageToImage(page, 2.0)
      
      onProgress?.(progressPercent + 2, 100, `Procesando con IA página ${i}/${numPages}...`)
      
        }
      
      let pageType: PageAnalysis['pageType'] = 'unknown'
      if (aiAnalysis.tipo.includes('vertices') || aiAnalysis.tipo.includes('area')) {
        pageType = 'vertices_table'
      } else if (aiAnalysis.tipo.includes('estanque')) {
        pageType = 'tanks_table'
      } else if (aiAnalysis.tipo.includes('mapa')) {
        pageType = 'map'
        mapPageNumber = i
      mapPageNumber,
        pageType = 'mixed'
    }
      
      const confidence = aiAnalysis.coordenadas.length > 0 ? 0.85 : 0.3
      

        pageNumber: i,
        pageType,
        confidence,
        base64Image,
        aiAnalysis
    cons
      
    features.push({
        for (const coord of aiAnalysis.coordenadas) {
        name: 'Área de Servicio',
        ..
          if (coord.este < 600000 || coord.este > 700000) continue
          if (coord.norte < 5000000 || coord.norte > 6000000) continue
          
          const [lng, lat] = utmToLatLng(coord.este, coord.norte, 18, true)
          
          if (pageType === 'vertices_table' || aiAnalysis.tipo.includes('vertices')) {
  for (const vertex of vertice
              id: `v-${coord.label || allVertices.length + 1}`,
              name: coord.label,
              easting: coord.este,
        easting: vertex.easting,
              latitude: lat,
      },
              confidence: 0.9
            })
          } else if (pageType === 'tanks_table' || aiAnalysis.tipo.includes('estanque')) {
  }
              id: `t-${coord.label || allTanks.length + 1}`,
              name: coord.label || `Estanque ${allTanks.length + 1}`,
              easting: coord.este,
              northing: coord.norte,
              latitude: lat,
              longitude: lng,
              confidence: 0.9
            })
          } else {
            if (coord.label.toLowerCase().includes('e') && !coord.label.toLowerCase().includes('v')) {
              allTanks.push({
  
                name: coord.label,
    crs: {
                northing: coord.norte,
        name: 'EPSG:4326'
                longitude: lng,
                confidence: 0.85
              })
            } else {
              allVertices.push({
    features
                name: coord.label,

                northing: coord.norte,
                latitude: lat,
                longitude: lng,
                confidence: 0.85
              })

          }

      }


    onProgress?.(95, 100, 'Generando resultados...')

    const overallConfidence = (allVertices.length + allTanks.length) > 0 ? 0.85 : 0.3
    const processingTimeMs = performance.now() - startTime
    
    onProgress?.(100, 100, '¡Completado!')
    
    return {

      vertices: allVertices,

      mapPageNumber,
      overallConfidence,
      processingTimeMs

  } catch (error) {

    throw new Error(`Error al procesar PDF: ${error instanceof Error ? error.message : 'unknown'}`)

}

export function generateGeoJSONFromData(
  vertices: VertexData[],
  tanks: TankData[],
  metadata?: Record<string, any>
) {

  
  if (vertices.length >= 3) {
    const coordinates = vertices.map(v => [v.longitude, v.latitude])

    

      type: 'Feature',

        name: 'Área de Servicio',
        tipo: 'area_servicio',
        vertices: vertices.length,
        ...metadata
      },

        type: 'Polygon',
        coordinates: [coordinates]
      }

  }

  for (const vertex of vertices) {

      type: 'Feature',
      properties: {
        name: vertex.name || vertex.id,

        easting: vertex.easting,
        northing: vertex.northing,
        confidence: vertex.confidence

      geometry: {

        coordinates: [vertex.longitude, vertex.latitude]

    })

  
  for (const tank of tanks) {
    features.push({

      properties: {

        tipo: 'estanque',

        northing: tank.northing,
        confidence: tank.confidence
      },

        type: 'Point',
        coordinates: [tank.longitude, tank.latitude]
      }

  }

  return {

    crs: {
      type: 'name',
      properties: {

      }

    metadata: {

      sistema_salida: 'WGS84 Geographic (EPSG:4326)',

      ...metadata

    features

}
