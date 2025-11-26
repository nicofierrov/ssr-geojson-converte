# Extractor GeoJSON - OCR + Visión IA

Aplicación web para extraer coordenadas UTM de PDFs de Servicios Sanitarios Rurales (SSR) de Chiloé, Chile, utilizando OCR (Tesseract.js) y análisis con IA (GPT-4o Vision).

## Características Principales

### 🔍 Procesamiento Multi-Capa
1. **Renderizado PDF** - Usa `pdfjs-dist` para renderizar cada página como imagen de alta calidad (2.5x scale)
2. **OCR con Tesseract.js** - Extrae texto automáticamente en español de cada página
3. **Extracción por Regex** - Busca patrones de coordenadas UTM en el texto OCR
4. **Análisis con IA** - GPT-4o Vision analiza visualmente cada página para validar y extraer coordenadas adicionales
5. **Conversión Geográfica** - Transforma UTM 18S (EPSG:32718) a WGS84

### 📊 Tipos de Datos Extraídos
- **Vértices del Área de Servicio (AS)** - Coordenadas que definen el polígono del área de servicio
- **Estanques** - Coordenadas puntuales de ubicación de estanques de agua

### 🎯 Validación Automática
- Valida rangos UTM 18S: Este (600,000-800,000m), Norte (5,200,000-5,800,000m)
- Verifica bounds de Chile continental
- Deduplicación de coordenadas
- Sistema de confianza por página y general

## Tecnologías Utilizadas

### Core
- **React 19** + **TypeScript** - Framework principal
- **Vite** - Build tool
- **Tailwind CSS v4** - Estilos

### Procesamiento de PDFs
- **pdfjs-dist** - Renderizado de páginas PDF a canvas/imágenes
- **Tesseract.js** - Motor OCR en el navegador (español)

### IA y Análisis
- **Spark LLM API** - Integración con GPT-4o Vision para análisis visual
- Patrones regex personalizados para coordenadas UTM

### UI Components
- **shadcn/ui v4** - Biblioteca de componentes (Button, Card, Table, Tabs, etc.)
- **Phosphor Icons** - Iconografía
- **Sonner** - Notificaciones toast
- **Framer Motion** - Animaciones

### Utilidades
- **proj4** (implícito en utmConverter) - Conversión de coordenadas
- **Leaflet** (en MapVisualization) - Visualización de mapas

## Estructura del Proyecto

```
src/
├── components/
│   ├── ui/                      # shadcn components
│   ├── FileUpload.tsx           # Drag & drop para PDFs
│   ├── WorkflowStepper.tsx      # Indicador de progreso visual
│   ├── VertexTable.tsx          # Tabla editable de vértices
│   ├── TankTable.tsx            # Tabla editable de estanques
│   ├── MapVisualization.tsx     # Mapa interactivo
│   └── GeoJSONView.tsx          # Visualizador de GeoJSON
├── lib/
│   ├── ocrPdfProcessor.ts       # ⭐ Procesador principal (OCR + IA)
│   ├── utmConverter.ts          # Conversión UTM ↔ WGS84
│   └── utils.ts                 # Utilidades generales
├── App.tsx                      # Componente principal
└── index.css                    # Estilos y tema

## Flujo de Procesamiento

### 1. Carga del PDF (5%)
- Usuario arrastra/selecciona archivo PDF
- Se lee como ArrayBuffer
- pdfjs-dist carga el documento

### 2. Renderizado de Páginas (5-15%)
- Cada página se renderiza a canvas con escala 2.5x
- Se convierte a imagen PNG base64
- Máximo 15 páginas procesadas

### 3. OCR con Tesseract (15-60%)
- Worker de Tesseract procesa cada imagen
- Extrae texto en español
- **Tiempo: ~2-4 segundos por página**

### 4. Análisis y Extracción (60-90%)
Para cada página:
- **Regex**: Busca patrones de coordenadas en texto OCR
- **IA Vision**: GPT-4o analiza la imagen + texto OCR
  - Identifica tipo de página (tabla de vértices, estanques, mapa)
  - Extrae coordenadas con labels
  - Corrige errores comunes de OCR (O→0)
- **Merge**: Combina resultados, elimina duplicados

### 5. Conversión y Validación (90-98%)
- Convierte coordenadas UTM 18S a WGS84
- Valida rangos geográficos
- Calcula confianza promedio

### 6. Generación GeoJSON (98-100%)
- Crea FeatureCollection
- Polígono para área de servicio
- Puntos para estanques
- Metadata completa

## Patrones de Coordenadas Detectados

El sistema reconoce múltiples formatos:

```
V1: E 654321.00, N 5234567.00
Vértice 1 - 654321.00, 5234567.00
654321, 5234567
E: 654321 N: 5234567
Este 654321.00 Norte 5234567.00
T1 - E654321 N5234567
```

## API Principal

### `processWithOCR(file, onProgress)`
Función principal de procesamiento.

**Parámetros:**
- `file: File` - Archivo PDF
- `onProgress: (current, total, status) => void` - Callback de progreso

**Retorna:** `Promise<ProcessResult>`
```typescript
{
  pages: PageAnalysis[]          // Análisis de cada página
  vertices: VertexData[]         // Vértices extraídos
  tanks: TankData[]              // Estanques extraídos
  mapPageNumber?: number         // Número de página con mapa
  overallConfidence: number      // Confianza 0-1
  processingTimeMs: number       // Tiempo total
}
```

### `generateGeoJSONFromData(vertices, tanks, properties)`
Genera archivo GeoJSON estándar.

**Parámetros:**
- `vertices: VertexData[]` - Vértices del área
- `tanks: TankData[]` - Estanques
- `properties: Record<string, any>` - Metadata adicional

**Retorna:** Objeto GeoJSON FeatureCollection

## Mejoras vs. Versión Anterior

### ❌ Versión Anterior (slowPdfProcessor)
- Renderizado rudimentario con iframe
- Sin OCR real, solo análisis visual con IA
- Placeholders de imágenes
- Menor precisión en extracción de texto

### ✅ Nueva Versión (ocrPdfProcessor)
- ✨ Renderizado profesional con pdfjs-dist
- ✨ OCR real con Tesseract.js (motor OCR probado)
- ✨ Doble capa: Regex + IA Vision
- ✨ Mejor manejo de errores OCR
- ✨ Deduplicación inteligente
- ✨ Mayor precisión y confiabilidad

## Configuración de Desarrollo

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Dependencias Clave Añadidas

```json
{
  "pdfjs-dist": "^4.x",      // Renderizado PDF
  "tesseract.js": "^5.x"      // OCR
}
```

## Notas de Uso

### Rendimiento
- **OCR es intensivo**: ~2-4 segundos por página
- Se limita a 15 páginas máximo para evitar timeouts
- El análisis completo puede tomar 3-10 minutos dependiendo del PDF

### Idioma OCR
- Configurado para español (`'spa'`)
- Tesseract descarga el modelo de idioma la primera vez (~1MB)

### Formatos Soportados
- PDFs con texto renderizado (ideal)
- PDFs escaneados (funciona con OCR)
- Tablas estructuradas (mejor rendimiento)
- Planos/mapas con anotaciones de texto

### Limitaciones
- Máximo 15 páginas procesadas
- Coordenadas deben estar en rango UTM 18S válido
- Requiere conexión a internet (para IA y workers de Tesseract)

## Ejemplo de Uso

```typescript
import { processWithOCR, generateGeoJSONFromData } from '@/lib/ocrPdfProcessor'

const handlePDF = async (file: File) => {
  const result = await processWithOCR(file, (progress, total, status) => {
    console.log(`${progress}%: ${status}`)
  })
  
  console.log(`Extraídos ${result.vertices.length} vértices`)
  console.log(`Extraídos ${result.tanks.length} estanques`)
  console.log(`Confianza: ${(result.overallConfidence * 100).toFixed(1)}%`)
  
  const geojson = generateGeoJSONFromData(
    result.vertices,
    result.tanks,
    { fuente: file.name }
  )
  
  // Descargar o usar geojson...
}
```

## Troubleshooting

### OCR no funciona
- Verifica que Tesseract pueda descargar el modelo de idioma
- Revisa la consola por errores de CORS o red

### Coordenadas no se extraen
- Verifica que el PDF tenga texto seleccionable o esté escaneado con buena calidad
- Revisa el tab "Páginas" para ver el texto OCR extraído
- Las coordenadas deben estar en formato UTM con 6-7 dígitos

### PDF tarda mucho
- Normal para PDFs grandes (OCR es lento)
- Considera optimizar el PDF antes (reducir páginas, mejorar calidad)

### IA no encuentra coordenadas
- El OCR debe extraer primero el texto correctamente
- Verifica que las coordenadas estén en el rango válido UTM 18S

## Contribuciones

Sistema desarrollado para extracción automatizada de coordenadas UTM de documentos técnicos de SSR en Chiloé, Chile.

## Licencia

Uso interno - Proyecto Spark Template
