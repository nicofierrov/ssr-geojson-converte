# Extractor GeoJSON - PDF.js + IA

Aplicación web para extraer coordenadas UTM de PDFs de Servicios Sanitarios Rurales (SSR) de Chiloé, Chile, utilizando extracción de texto nativa de PDF y análisis con IA (GPT-4o Vision).

## 🆕 Modo de Prueba con PDF Real

**NUEVO**: Sistema de diagnóstico integrado para probar PDFs antes del procesamiento completo.

👉 **[Guía Rápida de Pruebas](README-TESTING.md)**
👉 **[Documentación Completa de Pruebas](TESTING.md)**

### ¿Cómo probar con tu PDF?

1. Haz clic en el botón **"Diagnóstico"** en la esquina superior derecha
2. Carga tu PDF
3. El sistema verificará:
   - ✅ Que el PDF se carga correctamente
   - ✅ Que las páginas se pueden renderizar como imágenes
   - ✅ Que se puede extraer texto del PDF
   - ✅ Muestra del texto extraído de cada página

4. Si todo está verde ✅, tu PDF está listo para procesarse
5. Si hay errores ❌, el diagnóstico te dirá exactamente qué falló

**El modo diagnóstico NO consume créditos de IA** - úsalo libremente para verificar tus PDFs.

## Características Principales

### 🔍 Procesamiento Multi-Capa
1. **Renderizado PDF** - Usa `pdfjs-dist` para renderizar cada página como imagen de alta calidad (2.5x scale)
2. **Extracción Nativa de Texto** - Extrae texto directamente de la estructura del PDF (sin OCR si no es necesario)
3. **Extracción por Regex** - Busca patrones de coordenadas UTM en el texto extraído
4. **Análisis con IA** - GPT-4o Vision analiza visualmente cada página para validar y extraer coordenadas adicionales
5. **Conversión Geográfica** - Transforma UTM 18S (EPSG:32718) a WGS84

### 🐛 Modo Diagnóstico
- **Prueba sin consumir créditos IA** - Verifica que tu PDF funciona antes del procesamiento completo
- **Análisis de estructura** - Confirma que el PDF se puede cargar y renderizar
- **Extracción de texto de prueba** - Muestra una muestra del texto de cada página
- **Identificación de problemas** - Detecta PDFs corruptos, problemas de renderizado, o falta de texto

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
- **pdfjs-dist** - Renderizado de páginas PDF a canvas/imágenes y extracción nativa de texto

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
│   ├── improvedPdfProcessor.ts    # ⭐ Procesador principal (PDF.js + IA)
│   ├── debugPdfProcessor.ts       # 🐛 Sistema de diagnóstico de PDFs
│   ├── utmConverter.ts            # Conversión UTM ↔ WGS84
│   └── utils.ts                   # Utilidades generales
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

### 3. Extracción Nativa de Texto (15-60%)
- pdfjs-dist extrae texto usando getTextContent()
- Texto estructurado del PDF (sin OCR necesario para PDFs digitales)
- Búsqueda de patrones de coordenadas con regex
- **Tiempo: instantáneo - ~100ms por página**

### 4. Análisis y Extracción (60-90%)
Para cada página:
- **Regex**: Busca patrones de coordenadas en texto nativo del PDF
- **IA Vision**: GPT-4o analiza la imagen + texto extraído
  - Identifica tipo de página (tabla de vértices, estanques, mapa)
  - Extrae coordenadas con labels
  - Corrige errores comunes de extracción
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

### `processWithImprovedMethod(file, onProgress)`
Función principal de procesamiento con PDF.js + IA.

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

### `runPDFDiagnostics(file)`
Ejecuta diagnóstico de PDF sin procesar con IA.

**Parámetros:**
- `file: File` - Archivo PDF

**Retorna:** `Promise<DiagnosticResult>`
```typescript
{
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
```

### `generateGeoJSONFromData(vertices, tanks, properties)`
Genera archivo GeoJSON estándar.

**Parámetros:**
- `vertices: VertexData[]` - Vértices del área
- `tanks: TankData[]` - Estanques
- `properties: Record<string, any>` - Metadata adicional

**Retorna:** Objeto GeoJSON FeatureCollection

## Mejoras vs. Versión Anterior

### ❌ Versión Anterior (con OCR/Tesseract)
- OCR lento (~2-4 segundos por página)
- Errores comunes de reconocimiento de caracteres
- Dependencia de calidad de imagen
- Descarga adicional de modelos de idioma

### ✅ Nueva Versión (PDF.js nativo + IA)
- ✨ Extracción de texto nativa del PDF (instantánea)
- ✨ Sin errores de OCR en PDFs digitales
- ✨ Modo diagnóstico para depuración
- ✨ Procesamiento más rápido (~100ms vs 2-4s por página)
- ✨ IA como complemento, no dependencia primaria
- ✨ Mejor manejo de errores con reportes detallados

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

## Dependencias Clave

```json
{
  "pdfjs-dist": "^5.x"      // Renderizado PDF y extracción de texto
}
```

Nota: NO se requiere Tesseract.js. La extracción de texto se hace nativamente desde el PDF.

## Notas de Uso

### Rendimiento
- **Extracción de texto es rápida**: ~100ms por página (nativa del PDF)
- **Análisis con IA es la parte lenta**: ~2-5 segundos por página
- Se limita a 10 páginas máximo para evitar timeouts
- El análisis completo puede tomar 2-8 minutos dependiendo del PDF

### Modo Diagnóstico
- **Usa el modo diagnóstico PRIMERO** antes de procesar PDFs nuevos
- No consume créditos de IA
- Identifica problemas antes del procesamiento completo
- Ver TESTING.md para guía completa

### Formatos Soportados
- **PDFs digitales con texto** (ideal - extracción instantánea)
- **PDFs escaneados** (requiere que la IA lea visualmente - más lento)
- Tablas estructuradas (mejor rendimiento)
- Planos/mapas con anotaciones de texto

### Limitaciones
- Máximo 10 páginas procesadas
- Coordenadas deben estar en rango UTM 18S válido
- Requiere conexión a internet (para IA)
- PDFs escaneados sin texto dependen 100% de IA Vision

## Ejemplo de Uso

### Modo Normal
```typescript
import { processWithImprovedMethod, generateGeoJSONFromData } from '@/lib/improvedPdfProcessor'

const handlePDF = async (file: File) => {
  const result = await processWithImprovedMethod(file, (progress, total, status) => {
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

### Modo Diagnóstico
```typescript
import { runPDFDiagnostics, formatDiagnosticReport } from '@/lib/debugPdfProcessor'

const diagnosePDF = async (file: File) => {
  const result = await runPDFDiagnostics(file)
  
  if (result.success) {
    console.log('✓ PDF is ready to process')
    console.log(`Pages: ${result.pdfInfo?.numPages}`)
    console.log(`Load time: ${result.timings.loadPdf}ms`)
  } else {
    console.error('✗ PDF has issues:', result.error)
  }
  
  // Print detailed report
  console.log(formatDiagnosticReport(result))
}
```

## Troubleshooting

### Usar SIEMPRE el Modo Diagnóstico Primero
Antes de reportar cualquier problema:
1. Activa el modo diagnóstico
2. Carga tu PDF
3. Revisa los resultados
4. Consulta TESTING.md para soluciones

### PDF no se carga
- **Diagnóstico**: Verifica el error específico en modo diagnóstico
- **Solución**: PDF corrupto - abre y guarda nuevamente desde un visor

### Texto extraído: 0 caracteres
- **Diagnóstico**: El PDF es una imagen escaneada sin texto digital
- **Impacto**: La IA deberá leer visualmente (más lento, menos preciso)
- **Solución**: Considera usar PDFs digitales en lugar de escaneos

### Coordenadas no se extraen
- **Diagnóstico**: Revisa la muestra de texto en el modo diagnóstico
- **Solución**: Verifica que el formato de coordenadas sea reconocible
- Las coordenadas deben tener 6-7 dígitos para Este y Norte

### PDF tarda mucho
- **Normal**: El análisis con IA es lento (~2-5s por página)
- **Solución**: Limita el PDF a las páginas relevantes antes de cargar

### IA no encuentra coordenadas
- **Diagnóstico**: Verifica que el texto extraído contiene números
- **Solución**: Asegúrate de que las coordenadas estén en rango UTM 18S válido

## Contribuciones

Sistema desarrollado para extracción automatizada de coordenadas UTM de documentos técnicos de SSR en Chiloé, Chile.

## Licencia

Uso interno - Proyecto Spark Template
