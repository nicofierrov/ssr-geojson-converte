# Guía de Pruebas con PDF Real

## Descripción del Sistema

Este sistema extrae coordenadas UTM 18S de documentos PDF en español, específicamente diseñado para planos de Servicios Sanitarios Rurales (SSR) de Chiloé, Chile.

## Modo de Diagnóstico

### ¿Qué es?

El Modo Diagnóstico es una herramienta de depuración que prueba tu PDF sin consumir créditos de IA. Te permite:

1. Verificar que el PDF se carga correctamente
2. Confirmar que las páginas se pueden renderizar como imágenes
3. Validar que se puede extraer texto del PDF
4. Ver una muestra del texto extraído de cada página

### ¿Cuándo usarlo?

- **SIEMPRE** antes de procesar un PDF nuevo por primera vez
- Cuando el procesamiento normal falla
- Para verificar que un PDF tiene el formato correcto
- Para depurar problemas de extracción de coordenadas

### Cómo usar el Modo Diagnóstico

1. Haz clic en el botón "Diagnóstico" en la esquina superior derecha
2. El botón cambiará a modo activo (azul)
3. Carga tu PDF
4. El sistema ejecutará las siguientes pruebas:
   - Carga del PDF con pdfjs-dist
   - Renderizado de las primeras 3 páginas a imágenes de alta resolución
   - Extracción de texto nativo del PDF
   - Medición de tiempos de procesamiento

5. Revisa los resultados:
   - ✅ **Verde**: Todo funciona correctamente
   - ❌ **Rojo**: Hay problemas que deben resolverse

### Interpretando los Resultados

#### Éxito (Verde)
```
✓ Diagnóstico Exitoso
Páginas: 8
Tiempo de carga: 245ms
Tiempo de renderizado: 1234ms
Tiempo de extracción: 156ms

Página 1:
- Texto extraído: 856 caracteres
- Imagen renderizada: Sí
- Tamaño: 2100x2970
- Muestra: "PLANO DE UBICACION Y AREA DE SERVICIO..."
```

Esto significa que:
- El PDF se cargó correctamente
- Las imágenes se renderizaron
- Se extrajo texto del PDF
- Puedes proceder con el análisis normal

#### Fallo (Rojo)

**Error: "PDF load failed"**
- **Causa**: El PDF está corrupto o no es un PDF válido
- **Solución**: Abre el PDF en un visor y guárdalo nuevamente

**Error: "Could not get canvas context"**
- **Causa**: Problema del navegador con Canvas
- **Solución**: Recarga la página o usa otro navegador (Chrome recomendado)

**Texto extraído: 0 caracteres**
- **Causa**: El PDF es una imagen escaneada sin texto reconocible
- **Impacto**: El sistema dependerá 100% de la IA para extraer coordenadas
- **Acción**: Esto no es un error fatal, pero el procesamiento será más lento

**Imagen renderizada: No**
- **Causa**: Problema renderizando la página
- **Impacto**: La IA no podrá analizar esa página
- **Acción**: Revisa los errores específicos mostrados

## Modo Normal (Procesamiento con IA)

### Flujo del Proceso

Cuando NO estás en Modo Diagnóstico:

1. **Cargar PDF** (5%)
   - Lectura del archivo
   - Validación del formato

2. **Renderizar Páginas** (5-15%)
   - Conversión de cada página PDF a imagen PNG de alta calidad
   - Escala 2.5x para máxima nitidez

3. **Extraer Texto** (15-60%)
   - Extracción de texto nativo del PDF usando pdfjs-dist
   - Búsqueda de patrones de coordenadas con regex
   - Por cada página encontrada con coordenadas

4. **Analizar con IA** (60-90%)
   - Envío de imagen + texto a GPT-4o Vision
   - Clasificación del tipo de página (mapa, tabla vértices, tabla estanques)
   - Extracción inteligente de coordenadas
   - Corrección de errores comunes de OCR

5. **Generar GeoJSON** (90-100%)
   - Validación de coordenadas UTM 18S
   - Conversión a WGS84 (lat/lon)
   - Generación de geometrías (Polygon para áreas, Points para estanques)
   - Creación del archivo GeoJSON estándar

### Qué Esperar

**Tiempo de procesamiento**: 
- PDF de 5 páginas: ~2-4 minutos
- PDF de 10 páginas: ~4-8 minutos

**Confianza**:
- 🟢 **Alta (>80%)**: Las coordenadas son muy probablemente correctas
- 🟡 **Media (60-80%)**: Revisa las coordenadas antes de exportar
- 🔴 **Baja (<60%)**: Edita manualmente las coordenadas

### Estructura del PDF Esperada

El sistema está diseñado para PDFs que contienen:

#### Tabla de Vértices del Área de Servicio (AS)
```
Vértice    Este (E)      Norte (N)
V1         654321.50     5234567.80
V2         654322.30     5234568.90
V3         654323.10     5234569.45
...
```

#### Tabla de Coordenadas de Estanques
```
Estanque   Este          Norte
E1         654400.00     5234600.00
E2         654450.25     5234625.50
```

#### Mapa/Plano
- Plano visual con ubicaciones graficadas
- El sistema intentará extraer coordenadas visibles

### Rangos de Coordenadas Válidas

**UTM Huso 18 Sur (EPSG:32718)**
- **Este (E)**: 600,000 - 800,000 metros
- **Norte (N)**: 5,200,000 - 5,800,000 metros

Las coordenadas fuera de estos rangos serán rechazadas automáticamente.

## Problemas Comunes

### "No se encontraron coordenadas en el PDF"

**Posibles causas**:
1. El PDF no contiene tablas con coordenadas UTM
2. Las coordenadas están en un formato no reconocido
3. El PDF es una imagen escaneada de baja calidad

**Soluciones**:
1. Verifica que el PDF tiene tablas con números tipo: `654321.50, 5234567.80`
2. Ejecuta el Modo Diagnóstico y revisa el texto extraído
3. Si el texto extraído está vacío, considera mejorar la calidad del escaneo

### "Confianza baja en la extracción"

**Posibles causas**:
1. Texto borroso o difícil de leer
2. Formato de tabla no estándar
3. Coordenadas mezcladas con otro tipo de números

**Soluciones**:
1. Edita manualmente las coordenadas en las tablas
2. Verifica que los valores están dentro de los rangos válidos
3. Re-genera el GeoJSON después de editar

### "Error al procesar el PDF"

**Posibles causas**:
1. PDF corrupto
2. PDF protegido con contraseña
3. Problema temporal de red con la API de IA

**Soluciones**:
1. Ejecuta el Modo Diagnóstico para identificar el problema específico
2. Intenta abrir y guardar el PDF nuevamente desde un visor
3. Verifica que el PDF no tenga restricciones de seguridad

## Consejos para Mejores Resultados

### Preparación del PDF

1. **Calidad del documento**:
   - PDFs generados digitalmente funcionan mejor que escaneos
   - Si es un escaneo, usa mínimo 300 DPI
   - Asegúrate de que el texto es legible

2. **Formato de coordenadas**:
   - Usa formato consistente: `654321.50` o `654,321.50`
   - Incluye etiquetas (V1, V2, Estanque 1, etc.)
   - Mantén las tablas bien estructuradas

3. **Tamaño del archivo**:
   - Límite: 10 MB
   - PDFs muy grandes tardarán más en procesarse
   - Considera dividir PDFs muy extensos

### Durante el Procesamiento

1. **No recargues la página** mientras se procesa
2. **Mantén la pestaña activa** (el navegador puede pausar pestañas inactivas)
3. **Revisa el progreso** en la barra de estado
4. **Espera pacientemente** - el análisis con IA toma tiempo

### Después del Procesamiento

1. **Revisa las coordenadas extraídas** en las tablas
2. **Verifica el mapa visual** para confirmar que la geometría tiene sentido
3. **Edita cualquier error** antes de descargar
4. **Descarga el GeoJSON** solo cuando estés satisfecho con los resultados

## Formato del GeoJSON Generado

El archivo generado seguirá este formato estándar:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "tipo": "Área de Servicio",
        "vertices": 15,
        "metodo": "PDF.js + IA",
        "fuente": "plano_ssr.pdf",
        "sistemaCoordinadas": "UTM 18S → WGS84"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-73.123456, -42.234567],
          [-73.123457, -42.234568],
          ...
          [-73.123456, -42.234567]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "tipo": "Estanque",
        "id": "T1",
        "nombre": "Estanque 1",
        "easting": 654321.50,
        "northing": 5234567.80
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-73.123456, -42.234567]
      }
    }
  ]
}
```

## Abriendo el GeoJSON

Una vez descargado, puedes abrir el archivo en:

- **QGIS**: Arrastra el archivo .geojson directamente
- **ArcGIS**: Add Data → selecciona el archivo
- **Google Earth**: Importa como KML (puede requerir conversión)
- **geojson.io**: Pega el contenido para visualización web
- **Leaflet/OpenLayers**: Carga directamente en aplicaciones web

## Soporte y Depuración

Si encuentras problemas:

1. **Ejecuta el Modo Diagnóstico** primero
2. **Abre la consola del navegador** (F12) y busca errores
3. **Revisa los detalles de páginas** en la pestaña "Páginas"
4. **Verifica las muestras de texto** extraídas de cada página
5. **Compara con la estructura esperada** de coordenadas

## Limitaciones Conocidas

- Solo procesa las primeras 10 páginas del PDF
- Coordenadas deben estar en formato UTM 18S (Chiloé, Chile)
- PDFs protegidos con contraseña no son compatibles
- Tablas muy complejas o desalineadas pueden causar errores
- El análisis con IA consume tiempo y requiere conexión a internet
