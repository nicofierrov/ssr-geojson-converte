# Planning Guide

A specialized web application that extracts geographic data from structured Spanish-language PDF documents containing maps and coordinate tables, converting them into GeoJSON format with support for UTM Zone 18S coordinates.

**Experience Qualities**:
1. **Intelligent** - The app automatically identifies PDF structure (map, vertex tables, tank coordinates) and processes each section appropriately.
2. **Precise** - Users trust the UTM-to-WGS84 conversion and table extraction accuracy, with clear validation and comparison tools.
3. **Professional** - The interface feels purpose-built for GIS professionals working with Chilean water service area documentation.

**Complexity Level**: Light Application (multiple features with basic state)
  - The app handles specialized PDF parsing, table OCR, coordinate system conversion (UTM 18S to WGS84), and map comparison capabilities without requiring backend infrastructure.

## Essential Features

### PDF Structure Analysis
- **Functionality**: Automatically analyze uploaded PDF to identify three key sections: map image, "Vértices AS" (Area de Servicio) table, and "Coordenadas Estanques" (tank coordinates) table
- **Purpose**: Intelligently parse structured PDFs without requiring manual section identification
- **Trigger**: User uploads a PDF file
- **Progression**: Upload PDF → Analyze structure → Identify sections → Display findings → Ready for table extraction
- **Success criteria**: All three sections correctly identified with confidence scores; user can manually adjust if needed

### Table OCR & Extraction
- **Functionality**: Extract coordinate data from both tables using OCR, parsing Spanish text labels and numeric coordinate values in UTM 18S format
- **Purpose**: Convert tabular data into machine-readable format for GeoJSON generation
- **Trigger**: Automatic after structure analysis completes
- **Progression**: Sections identified → OCR on tables → Parse rows → Extract coordinates → Validate format → Display results
- **Success criteria**: Tables correctly parsed with vertex names/IDs and UTM coordinates (Este/Northing) extracted

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

### Map Comparison & Validation
- **Functionality**: Display extracted map image alongside generated GeoJSON overlay to visually compare accuracy
- **Purpose**: Allow users to validate that extracted coordinates match the original map
- **Trigger**: Automatic after GeoJSON generation
- **Progression**: GeoJSON ready → Extract map from PDF → Overlay geometries → User compares → Confirms or adjusts
- **Success criteria**: Side-by-side or overlaid view showing map and generated features for visual verification

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
- **Estructura No Detectada**: Display warning if expected sections (map/tables) not found, allow manual section marking
- **Errores de OCR**: Highlight low-confidence table cells, allow manual correction
- **Coordenadas Fuera de Rango**: Validate UTM coordinates are within Zone 18S bounds, flag outliers
- **Tablas Incompletas**: Show which vertices/tanks are missing coordinates, offer to skip or manually add
- **Sistemas de Coordenadas Mixtos**: Detect if some coordinates appear to be in different format, warn user
- **PDFs de Baja Calidad**: Show OCR confidence scores, suggest manual review of all extracted values
- **Polígonos No Cerrados**: Auto-close polygon if first and last vertices don't match, notify user

## Design Direction
The design should feel technical and purpose-built for GIS professionals working with Chilean water service documentation. It should evoke precision and trust while guiding users through a complex multi-step extraction process. A structured, workflow-oriented interface with clear progress indicators serves the data transformation purpose.

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
Animations should emphasize workflow progression and data transformation, with clear step-by-step feedback that builds confidence in the extraction process.

- **Purposeful Meaning**: Structure analysis shows scanning animation; table extraction animates row-by-row parsing; coordinate conversion shows transformation feedback; map overlay fades in to show comparison
- **Hierarchy of Movement**: File upload gets immediate response; analysis phase shows clear progress through sections; OCR processing animates per table; coordinate conversion shows batch transformation; final GeoJSON generation provides satisfying completion

## Component Selection
- **Components**:
  - Upload zone: Custom component with drag-and-drop, PDF icon preview
  - Workflow stepper: Custom component showing 5 steps (Upload → Analysis → Extraction → Conversion → Export)
  - Structure analyzer: Card components showing detected sections with confidence badges
  - Table viewer: Custom table component with editable cells, coordinate validation
  - Coordinate converter: Progress indicator showing UTM→WGS84 conversion
  - Map comparison: Split-pane view with original map and GeoJSON overlay using Canvas
  - Action buttons: Button with Primary variant for main actions, Secondary for adjustments
  - Validation alerts: Alert component for warnings about coordinates or OCR confidence
  - Tabs: Tabs for switching between "Vértices AS", "Estanques", "GeoJSON", and "Comparación"
  
- **Customizations**:
  - Custom workflow progress indicator showing 5 extraction steps
  - Editable table cells with inline validation for coordinate formats
  - UTM coordinate formatter showing zone (18S) and values
  - Canvas-based map overlay showing original PDF map with generated geometries
  - Bilingual labels (Spanish primary, with technical terms)
  - Confidence score badges for OCR results
  
- **States**:
  - Workflow steps: Pending (gray), Active (blue), Complete (green with checkmark), Error (red)
  - Table cells: Default, Editing, Valid (green border), Invalid (red border), Low confidence (yellow highlight)
  - Buttons: Default, hover, active, disabled, processing (with spinner)
  - Map comparison: Aligned mode, side-by-side mode, opacity slider for overlay
  
- **Icon Selection**:
  - UploadSimple: File upload
  - MagnifyingGlass: Structure analysis
  - Table: Table extraction
  - ArrowsClockwise: Coordinate conversion
  - DownloadSimple: Export GeoJSON
  - PencilSimple: Edit table data
  - MapTrifold: Map comparison view
  - CheckCircle: Validation success
  - WarningCircle: Validation warnings
  - Globe: GeoJSON preview
  
- **Spacing**:
  - Workflow container: p-6
  - Section cards: p-5
  - Table padding: p-4
  - Step indicators: gap-3
  - Button padding: px-5 py-2.5
  - Stack spacing: space-y-5
  
- **Mobile**:
  - Vertical workflow stepper instead of horizontal
  - Full-width tables with horizontal scroll
  - Stacked map comparison (top: original, bottom: generated)
  - Collapsible sections using Accordion for each extraction phase
  - 48px minimum touch targets for table cell editing
