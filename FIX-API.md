# Corrección del Problema de API - Spark LLM

## Problema Identificado

El código estaba fallando porque usaba incorrectamente la API de Spark para llamadas LLM:

```typescript
// ❌ INCORRECTO - Intentando usar llmPrompt como tagged template
const prompt = window.spark.llmPrompt`...`

// ❌ INCORRECTO - window.spark.llm no estaba siendo llamado correctamente
const response = await window.spark.llm(prompt, 'gpt-4o', true)
```

## Solución Implementada

Corregido el uso de la API de Spark en `/src/lib/improvedPdfProcessor.ts`:

```typescript
// ✅ CORRECTO - Usar string normal para el prompt
const promptText = `Analiza el texto extraído...`

// ✅ CORRECTO - Llamar window.spark.llm con el string
const response = await window.spark.llm(promptText, 'gpt-4o', true)
```

## Cambios Realizados

### Archivo: `/src/lib/improvedPdfProcessor.ts`

**Función**: `analyzePageWithAI()`

**Cambios**:
1. Se renombró `prompt` a `promptText` para claridad
2. Se usa string template literal normal (no tagged template)
3. Se llama correctamente a `window.spark.llm(promptText, 'gpt-4o', true)`
4. Se actualizó el mensaje del prompt para reflejar que analiza texto (no imagen)

**Líneas modificadas**: 141-207

## Nota Importante sobre Imágenes

⚠️ **La API actual de Spark (`window.spark.llm`) NO soporta análisis de imágenes.**

El código anterior intentaba pasar `base64Image` como parámetro pero nunca se usaba. El análisis se hace únicamente basado en el texto extraído del PDF.

### Funcionalidad Actual (Correcta)

El sistema ahora funciona así:

1. **Extrae texto nativo del PDF** usando `pdfjs-dist`
2. **Busca coordenadas con regex** en el texto
3. **Analiza con IA** el texto (no la imagen) para:
   - Clasificar tipo de página
   - Extraer coordenadas adicionales
   - Corregir errores
4. **Combina resultados** de regex + IA
5. **Genera GeoJSON**

Esto es **más que suficiente** para PDFs digitales con texto seleccionable (que es el caso común de documentación oficial).

## PDFs que Funcionarán Bien

✅ PDFs creados digitalmente (Word, Excel, InDesign, etc.)
✅ PDFs con texto seleccionable
✅ Documentación oficial de servicios sanitarios
✅ Tablas de coordenadas

## PDFs que Podrían Fallar

❌ PDFs escaneados sin OCR previo
❌ Imágenes guardadas como PDF
❌ PDFs puramente gráficos

**Solución para PDFs escaneados**: Usar un servicio OCR externo primero, o procesarlo con software OCR antes de subirlo.

## Resultado

El sistema ahora debería funcionar correctamente con la API de Spark para:
- ✅ Analizar texto de PDFs
- ✅ Extraer coordenadas UTM
- ✅ Clasificar páginas por tipo
- ✅ Generar GeoJSON válido

## Cómo Probar

1. Activa el modo "Diagnóstico" primero
2. Carga tu PDF
3. Verifica que se extrae texto correctamente
4. Si todo está verde, desactiva "Diagnóstico"
5. Procesa el PDF completo con IA
6. Las coordenadas deberían extraerse correctamente ahora
