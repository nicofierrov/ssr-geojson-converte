# Planning Guide

A web application that extracts geographic data from PDF documents and converts it into GeoJSON format, enabling users to transform paper maps and documents into digital, machine-readable geographic data.

**Experience Qualities**:
1. **Efficient** - The process should feel streamlined and automated, minimizing manual intervention while providing clear progress feedback.
2. **Precise** - Users should trust the accuracy of the extracted data, with clear validation and editing capabilities.
3. **Accessible** - The interface should be straightforward enough for non-technical users while powerful enough for GIS professionals.

**Complexity Level**: Light Application (multiple features with basic state)
  - The app handles file uploads, OCR processing, data extraction, and preview/export capabilities, but doesn't require user accounts or complex backend infrastructure.

## Essential Features

### PDF Upload & Processing
- **Functionality**: Accept PDF files via drag-and-drop or file picker, process them using OCR to extract text and spatial data
- **Purpose**: Entry point for users to begin the extraction workflow
- **Trigger**: User selects or drops a PDF file onto the upload zone
- **Progression**: Select file → Upload → OCR processing → Text extraction complete → Display results
- **Success criteria**: PDF successfully uploaded, text extracted, and parsed data ready for conversion

### GeoJSON Generation
- **Functionality**: Parse extracted text for coordinate patterns (lat/long, UTM, etc.), structure names, and generate valid GeoJSON
- **Purpose**: Core value proposition - transform unstructured PDF data into structured geographic format
- **Trigger**: User clicks "Generate GeoJSON" after reviewing extracted data
- **Progression**: Click generate → Parse text for coordinates → Detect format → Structure GeoJSON → Display preview
- **Success criteria**: Valid GeoJSON output with correctly mapped coordinates and properties

### Interactive Preview
- **Functionality**: Display extracted geographic data on an interactive map preview
- **Purpose**: Allow users to visually validate the extracted data before export
- **Trigger**: Automatically shown after GeoJSON generation
- **Progression**: GeoJSON generated → Render on map → User pans/zooms → Inspects features → Confirms accuracy
- **Success criteria**: Map displays all features correctly, clickable markers show properties

### Data Export
- **Functionality**: Download the generated GeoJSON file
- **Purpose**: Provide the final output for use in GIS applications
- **Trigger**: User clicks "Download GeoJSON" button
- **Progression**: Click download → Format JSON → Trigger browser download → File saved
- **Success criteria**: Valid GeoJSON file downloads with proper formatting

### Manual Editing
- **Functionality**: Allow users to edit extracted text or coordinate data before conversion
- **Purpose**: Correct OCR errors or adjust misinterpreted values
- **Trigger**: User clicks edit on extracted data sections
- **Progression**: Click edit → Text becomes editable → User corrects → Save → Re-generate GeoJSON
- **Success criteria**: Edits persist and correctly update the generated GeoJSON

## Edge Case Handling
- **Poor Quality PDFs**: Display warning if OCR confidence is low, suggest manual review
- **No Coordinates Found**: Show helpful message guiding user to manually add coordinate data
- **Invalid Coordinate Formats**: Highlight unrecognized patterns, offer format examples
- **Large Files**: Show processing progress indicator, handle timeouts gracefully
- **Multiple Coordinate Systems**: Auto-detect and label different coordinate formats found
- **Empty or Text-Only PDFs**: Inform user no geographic data detected, show extracted text anyway

## Design Direction
The design should feel professional and technical yet approachable, emphasizing clarity and workflow progression. It should evoke trust and precision while maintaining simplicity. A minimal interface serves the data-focused purpose, with clear visual hierarchy guiding users through the extraction pipeline.

## Color Selection
Complementary (opposite colors) - Using a blue-green technical palette paired with warm amber accents to create a professional, map-like aesthetic that feels both trustworthy and action-oriented.

- **Primary Color**: Deep teal `oklch(0.45 0.12 200)` - Evokes maps, GIS, and geographic data; used for primary actions and key UI elements
- **Secondary Colors**: Slate gray `oklch(0.30 0.02 240)` for backgrounds and supportive elements, suggesting technical precision
- **Accent Color**: Warm amber `oklch(0.70 0.15 50)` for CTAs, success states, and drawing attention to generated outputs
- **Foreground/Background Pairings**:
  - Background (White `oklch(0.98 0 0)`): Dark slate text `oklch(0.25 0.02 240)` - Ratio 12.1:1 ✓
  - Card (Light gray `oklch(0.96 0 0)`): Dark slate text `oklch(0.25 0.02 240)` - Ratio 11.5:1 ✓
  - Primary (Deep teal `oklch(0.45 0.12 200)`): White text `oklch(0.98 0 0)` - Ratio 7.2:1 ✓
  - Secondary (Slate gray `oklch(0.30 0.02 240)`): White text `oklch(0.98 0 0)` - Ratio 11.8:1 ✓
  - Accent (Warm amber `oklch(0.70 0.15 50)`): Dark slate text `oklch(0.25 0.02 240)` - Ratio 4.9:1 ✓
  - Muted (Light slate `oklch(0.92 0.01 240)`): Medium slate text `oklch(0.50 0.02 240)` - Ratio 5.1:1 ✓

## Font Selection
The typography should convey technical precision and modern professionalism, using Inter for its excellent readability and geometric clarity that complements data-driven interfaces.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold / 32px / -0.02em letter spacing
  - H2 (Section Headers): Inter SemiBold / 24px / -0.01em letter spacing
  - H3 (Subsections): Inter Medium / 18px / normal letter spacing
  - Body (Content): Inter Regular / 15px / normal letter spacing / 1.6 line height
  - Small (Labels): Inter Medium / 13px / normal letter spacing
  - Code (Coordinates): JetBrains Mono Regular / 14px / monospace for coordinate display

## Animations
Animations should feel purposeful and technical, emphasizing the transformation of data from raw PDF to structured GeoJSON. Subtle transitions communicate processing states while maintaining a professional, efficient workflow.

- **Purposeful Meaning**: Loading states use smooth fade-ins and progress animations to communicate AI/OCR processing; success states have satisfying confirmations that reinforce data quality
- **Hierarchy of Movement**: File upload gets immediate feedback; processing states show clear progress; map rendering animates to draw attention to the visual preview; export actions provide quick, confident confirmation

## Component Selection
- **Components**:
  - Upload zone: Custom component with drag-and-drop using Tailwind border-dashed and hover states
  - Processing indicator: Progress component with percentage and status text
  - Data display: Card components for extracted text sections with Separator between sections
  - Editor: Textarea for manual text editing with clear save/cancel actions
  - Map preview: Custom component using a simple coordinate grid visualization
  - Action buttons: Button components with Primary variant for "Generate" and "Download", Secondary for "Edit"
  - Alerts: Alert component for warnings and errors during processing
  - Tabs: Tabs component to switch between "Extracted Text", "GeoJSON Preview", and "Map View"
  
- **Customizations**:
  - Custom file upload dropzone with animated dashed border on hover/drag
  - Coordinate highlighting in extracted text using Badge components
  - Custom map visualization component (simple SVG-based coordinate plot)
  - JSON syntax highlighting for GeoJSON preview using custom styling
  
- **States**:
  - Buttons: Default with teal background, hover with slight brightness increase, active with subtle scale-down, disabled with reduced opacity and no pointer events
  - Upload zone: Default with dashed border, drag-over with solid border and background tint, uploading with animated border, success with green accent
  - Text areas: Default with border, focus with ring and border color change, error with red border
  
- **Icon Selection**:
  - UploadSimple: File upload action
  - FileText: Representing PDF documents
  - MapPin: Geographic/coordinate data
  - DownloadSimple: Export action
  - Check: Success confirmations
  - Warning: Error states
  - PencilSimple: Edit actions
  - Globe: Map/GeoJSON preview
  
- **Spacing**:
  - Container padding: p-8
  - Card padding: p-6
  - Section gaps: gap-6
  - Button padding: px-4 py-2
  - Input padding: p-3
  - Stack spacing: space-y-4
  
- **Mobile**:
  - Single column layout on mobile (stack upload, preview, and actions vertically)
  - Reduce padding to p-4 for containers, p-4 for cards
  - Full-width buttons for primary actions
  - Collapsible sections for extracted text on mobile using Accordion
  - Touch-friendly 44px minimum tap targets for all interactive elements
