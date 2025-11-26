# Actualización: Sistema de Pruebas con PDF Real

## ¿Qué agregué?

He añadido un **Modo Diagnóstico** completo que te permite probar PDFs reales sin consumir créditos de IA.

## Cómo usar

### 1. Activar Modo Diagnóstico

- Haz clic en el botón **"Diagnóstico"** en la esquina superior derecha
- El botón se pondrá azul cuando esté activo

### 2. Cargar tu PDF

- Arrastra tu PDF o haz clic para seleccionarlo
- El sistema ejecutará automáticamente las siguientes pruebas:
  - ✅ Carga del PDF con pdfjs-dist
  - ✅ Renderizado de páginas a imágenes de alta resolución  
  - ✅ Extracción de texto nativo del PDF
  - ✅ Medición de tiempos de procesamiento

### 3. Revisar Resultados

Los resultados aparecerán en un panel debajo del área de carga:

**Si todo está en verde** ✅:
- Tu PDF se cargó correctamente
- Las páginas se renderizaron como imágenes
- Se extrajo texto del PDF
- Verás cuántos caracteres de texto hay en cada página
- Verás una muestra del texto extraído

**Si hay problemas** ❌:
- Verás mensajes de error específicos
- Podrás identificar qué falló (carga, renderizado, o extracción)
- Los detalles te ayudarán a corregir el PDF

### 4. Ver Detalles

Expande "Ver detalles de páginas" para ver:
- Cantidad de texto extraído por página
- Si la imagen se renderizó correctamente
- Tamaño de la imagen generada
- Muestra del texto extraído
- Errores específicos si los hay

### 5. Procesar Normalmente

Una vez que el diagnóstico pase:
1. Haz clic en **"Modo Normal"** para desactivar el diagnóstico
2. Vuelve a cargar el PDF
3. El sistema procesará con IA y extraerá las coordenadas

## Información en Consola

El diagnóstico también imprime un reporte completo en la consola del navegador (F12):

```
=== PDF DIAGNOSTIC REPORT ===

Status: ✓ SUCCESS
Total Time: 1523ms

--- PDF INFO ---
Pages: 8
Fingerprint: a1b2c3d4e5f6...
Encrypted: false

--- TIMINGS ---
Load PDF: 245ms
Extract Text: 156ms
Render Pages: 1122ms

--- PAGE ANALYSIS ---
Page 1:
  Text Length: 856 chars
  Image Rendered: Yes
  Image Size: 2100x2970
  Text Sample: "PLANO DE UBICACION Y AREA DE SERVICIO..."
```

## ¿Qué se está evaluando?

El sistema verifica:

1. **Carga del PDF**: ¿El archivo es un PDF válido?
2. **Renderizado**: ¿Se pueden convertir las páginas a imágenes?
3. **Extracción de texto**: ¿El PDF tiene texto extraíble?
4. **Muestras de texto**: ¿El texto contiene información relevante?

## Próximos pasos

Una vez que confirmes que tu PDF funciona correctamente:

1. Desactiva el modo diagnóstico
2. Carga el PDF nuevamente
3. El sistema procesará automáticamente:
   - Extraerá texto de todas las páginas
   - Buscará patrones de coordenadas UTM con regex
   - Enviará cada página a GPT-4o Vision para análisis inteligente
   - Clasificará páginas (mapa, tabla vértices, tabla estanques)
   - Extraerá y validará todas las coordenadas
   - Convertirá UTM 18S a WGS84
   - Generará el GeoJSON con geometrías correctas

## Documentación Completa

Revisa el archivo **TESTING.md** para:
- Guía completa de uso del modo diagnóstico
- Interpretación de resultados
- Solución de problemas comunes
- Estructura esperada del PDF
- Formato del GeoJSON generado
- Limitaciones y consejos

## Archivos Nuevos

- `/src/lib/debugPdfProcessor.ts` - Lógica del modo diagnóstico
- `/TESTING.md` - Guía completa de pruebas
- `/README-TESTING.md` - Este archivo (resumen rápido)

## Nota Importante

El Modo Diagnóstico NO consume créditos de IA. Solo verifica que el PDF se puede procesar correctamente. Es recomendable usarlo SIEMPRE antes de procesar un PDF nuevo por primera vez.
