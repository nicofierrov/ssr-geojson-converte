# Planning Guide

A specialized web application that extracts geographic data from structured Spanish-language PDF documents by converting pages to images and analyzing them with AI, then converting UTM Zone 18S coordinates to GeoJSON format with enhanced accuracy.

**Experience Qualities**:
1. **Thorough** - The app takes a slow, methodical approach by converting PDF pages to images and analyzing each with AI, prioritizing accuracy over speed.
2. **Intelligent** - Uses AI vision models to analyze each page independently, identifying maps, vertex tables, and tank coordinates without relying on text extraction alone.
3. **Transparent** - Shows detailed progress through each phase (conversion, page-by-page analysis, coordinate extraction) with clear status updates and processing time.

**Complexity Level**: Light Application (multiple features with basic state)
  - The app handles PDF-to-image conversion, AI-powered visual analysis, coordinate system conversion (UTM 18S to WGS84), and GeoJSON generation with page-level inspection capabilities.

## Essential Features

### PDF to Image Conversion
- **Functionality**: Convert each page of the uploaded PDF into high-resolution images for visual AI analysis
- **Purpose**: Enable AI vision models to analyze page content visually rather than relying on error-prone text extraction
- **Trigger**: User uploads a PDF file
- **Progression**: Upload PDF → Read file → Render each page as image → Store base64 images → Display page count
- **Success criteria**: All PDF pages successfully converted to images with preview thumbnails available

### Slow Page-by-Page AI Analysis
- **Functionality**: Send each page image to AI vision model with structured prompts to identify content type (map, vertices table, tanks table) and extract coordinates
- **Purpose**: Achieve higher accuracy by visually analyzing each page independently with AI rather than text parsing
- **Trigger**: Automatic after PDF conversion completes
- **Progression**: Images ready → For each page: send to AI → identify page type → extract coordinates → validate format → store results → move to next page → complete
- **Success criteria**: Each page analyzed with type classification and confidence score, all UTM coordinates extracted from visual tables

### Coordinate Extraction & Validation
- **Functionality**: Parse AI responses to extract UTM coordinates, validate they are within Zone 18S bounds, and categorize by type (vertices vs tanks)
- **Purpose**: Ensure extracted coordinates are valid and properly categorized before conversion
- **Trigger**: Automatic as each page analysis completes
- **Progression**: AI returns JSON → parse coordinates → validate UTM 18S format → check Chilean geographic bounds → categorize by source page type → aggregate results
- **Success criteria**: All valid coordinates extracted, invalid ones flagged, proper categorization between vertices and tanks

### UTM 18S to WGS84 Conversion
- **Functionality**: Convert all extracted UTM Zone 18S coordinates to WGS84 decimal degrees for GeoJSON compatibility
- **Purpose**: Transform local coordinate system to globally-recognized standard
- **Trigger**: Automatic after table extraction
- **Progression**: UTM coordinates extracted → Apply zone 18S conversion → Calculate lat/lon → Validate bounds → Ready for GeoJSON
- **Success criteria**: All coordinates successfully converted with Chilean geographic bounds validation

### GeoJSON Generation
- **Functionality**: Create GeoJSON with separate feature collections for "Área de Servicio" (polygon from vertices) and "Estanques" (point features)
- **Purpose**: Generate properly structured geographic data with Spanish property names
- **Trigger**: Automatic after coordinate conversion, or manual trigger after editing
- **Progression**: Converted coordinates → Build polygon from vertices → Create points for tanks → Combine in GeoJSON → Display preview
- **Success criteria**: Valid GeoJSON with polygon geometry for service area and point geometries for tanks

### Progress Monitoring
- **Functionality**: Display detailed real-time progress through conversion, analysis, extraction, and generation phases with percentage completion and time estimates
- **Purpose**: Keep users informed during the slow multi-minute process, showing that analysis is progressing
- **Trigger**: Automatic during processing
- **Progression**: Process starts → show phase (converting/analyzing/extracting) → update percentage → show current page being analyzed → estimate time remaining → complete
- **Success criteria**: Clear progress bar with percentage, current status message, and processing time displayed

### Page Analysis Inspector
- **Functionality**: Allow users to inspect individual analyzed pages with thumbnails, page type classification, confidence scores, and raw AI analysis results
- **Purpose**: Provide transparency into what the AI detected on each page and enable debugging of extraction issues
- **Trigger**: User clicks "Páginas" tab after processing completes
- **Progression**: View pages tab → see grid of analyzed pages → click page → see full details → view page type, confidence, extracted coordinates, thumbnail
- **Success criteria**: All analyzed pages visible with thumbnails, type labels, confidence badges, and ability to inspect raw analysis data

### Data Export
- **Functionality**: Download the generated GeoJSON file with Spanish property names and proper structure
- **Purpose**: Provide the final output for use in GIS applications
- **Trigger**: User clicks "Descargar GeoJSON" button
- **Progression**: Click download → Format JSON → Trigger browser download → File saved
- **Success criteria**: Valid GeoJSON file downloads with proper formatting and Chilean coordinate bounds

### Manual Table Editing
- **Functionality**: Allow users to edit extracted table data before GeoJSON generation to correct OCR errors
- **Purpose**: Correct misread coordinates, vertex names, or tank IDs
- **Trigger**: User clicks edit on extracted table sections
- **Progression**: Click edit → Table becomes editable → User corrects → Save → Re-convert coordinates → Re-generate GeoJSON
- **Success criteria**: Edits persist and correctly update the generated GeoJSON with new coordinates

## Edge Case Handling
- **Página Sin Coordenadas**: If AI cannot find coordinates on a page, log it but continue processing other pages
- **PDF Muy Grande**: Limit analysis to first 10 pages to prevent excessive processing time
- **Conversión a Imagen Falla**: Show clear error if browser cannot render PDF pages, suggest alternative approach
- **Respuesta IA Inválida**: If AI returns malformed JSON, log error but continue with other pages
- **Coordenadas Duplicadas**: De-duplicate coordinates found across multiple pages
- **Confianza Baja en Múltiples Páginas**: Warn user if average confidence across all pages is below threshold
- **Timeout de IA**: Set reasonable timeout for each AI call, skip page if it takes too long

## Design Direction
The design should feel methodical and trustworthy for GIS professionals working with Chilean water service documentation. It should emphasize the thoroughness of the slow analysis approach while keeping users engaged through detailed progress feedback. A calm, process-oriented interface with clear phase indicators serves the multi-minute processing workflow.

## Color Selection
Analogous (adjacent colors on the color wheel) - Using a blue-to-teal technical palette that evokes water, maps, and GIS applications, with orange accents for validation and comparison states.

- **Primary Color**: Technical blue `oklch(0.50 0.15 240)` - Evokes water services, technical precision; used for primary actions and workflow steps
- **Secondary Colors**: Deep teal `oklch(0.40 0.12 200)` for secondary elements, suggesting map layers and geographic data
- **Accent Color**: Warm orange `oklch(0.65 0.18 45)` for comparison highlights, validation markers, and attention-grabbing CTAs
- **Foreground/Background Pairings**:
  - Background (Light blue-gray `oklch(0.97 0.01 240)`): Dark slate text `oklch(0.20 0.03 240)` - Ratio 14.2:1 ✓
  - Card (White `oklch(0.99 0 0)`): Dark slate text `oklch(0.20 0.03 240)` - Ratio 15.1:1 ✓
  - Primary (Technical blue `oklch(0.50 0.15 240)`): White text `oklch(0.99 0 0)` - Ratio 8.1:1 ✓
  - Secondary (Deep teal `oklch(0.40 0.12 200)`): White text `oklch(0.99 0 0)` - Ratio 9.8:1 ✓
  - Accent (Warm orange `oklch(0.65 0.18 45)`): Dark slate text `oklch(0.20 0.03 240)` - Ratio 6.2:1 ✓
  - Muted (Light gray `oklch(0.90 0.01 240)`): Medium slate text `oklch(0.45 0.02 240)` - Ratio 5.8:1 ✓

## Font Selection
The typography should convey technical precision and data accuracy, using Inter for its excellent readability in tabular data and coordinate displays.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold / 30px / -0.02em letter spacing
  - H2 (Workflow Steps): Inter SemiBold / 22px / -0.01em letter spacing
  - H3 (Section Labels): Inter Medium / 16px / normal letter spacing
  - Body (Content): Inter Regular / 14px / normal letter spacing / 1.5 line height
  - Small (Labels): Inter Medium / 12px / normal letter spacing
  - Code (Coordinates & Tables): JetBrains Mono Regular / 13px / monospace for coordinate and table data display

## Animations
Animations should emphasize the slow, thorough nature of the analysis with clear progress through each phase, building confidence that the AI is carefully examining each page.

- **Purposeful Meaning**: PDF conversion shows page-by-page rendering; AI analysis displays current page number and type being detected; coordinate extraction shows validation checks; progress bar smoothly advances through phases
- **Hierarchy of Movement**: File upload gets immediate response; conversion phase shows page count increasing; analysis phase emphasizes per-page examination with page thumbnails appearing; extraction shows coordinate validation; final GeoJSON generation provides satisfying completion with processing time display

## Component Selection
- **Components**:
  - Upload zone: Custom component with drag-and-drop, PDF icon preview
  - Workflow stepper: Custom component showing 5 steps (Cargar PDF → Convertir a Imágenes → Analizar con IA → Extraer Coordenadas → Generar GeoJSON)
  - Progress tracker: Progress bar with percentage, current status message, and elapsed time
  - Page analyzer grid: Grid showing analyzed page thumbnails with type badges and confidence scores
  - Coordinate viewer: Table components showing extracted vertices and tanks with edit capability
  - Map visualizer: Canvas or map component showing polygon and points from extracted data
  - Action buttons: Button with Primary variant for main actions, Secondary for adjustments
  - Validation alerts: Alert component for warnings about low confidence or processing issues
  - Tabs: Tabs for switching between "Vértices AS", "Estanques", "GeoJSON", and "Páginas"
  
- **Customizations**:
  - Real-time progress indicator with phase name, percentage, and estimated time
  - Page analysis inspector showing per-page results with thumbnails
  - Slow processing feedback with "analyzing page X of Y" status
  - Processing time display showing total seconds elapsed
  - Confidence score badges with color coding (green >70%, yellow 50-70%, red <50%)
  - Page type badges for map/vertices_table/tanks_table/mixed/unknown
  
- **States**:
  - Workflow steps: Pending (gray), Active (blue with pulse), Complete (green with checkmark), Error (red)
  - Progress bar: Smooth animation through 0-100%, with phase transitions
  - Page thumbnails: Loading skeleton, Analyzed (with badge), Selected (highlighted border)
  - Buttons: Default, hover, active, disabled, processing (with spinner)
  
- **Icon Selection**:
  - UploadSimple: File upload
  - Images: PDF to image conversion
  - Eye: AI analysis phase
  - ListChecks: Coordinate extraction
  - DownloadSimple: Export GeoJSON
  - Clock: Processing time indicator
  - CheckCircle: Validation success
  - WarningCircle: Low confidence warnings
  - Globe: GeoJSON preview
  
- **Spacing**:
  - Workflow container: p-6
  - Section cards: p-5
  - Progress area: p-4
  - Page grid: gap-4
  - Button padding: px-5 py-2.5
  - Stack spacing: space-y-5
  
- **Mobile**:
  - Vertical workflow stepper instead of horizontal
  - Full-width progress bar with abbreviated status text
  - Single-column page grid
  - Collapsible page analysis details using Accordion
  - 48px minimum touch targets for all interactive elements
