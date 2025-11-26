import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { ExtractedTextView } from '@/components/ExtractedTextView'
import { GeoJSONView } from '@/components/GeoJSONView'
import { MapPreview } from '@/components/MapPreview'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Globe, Warning, Check } from '@phosphor-icons/react'
import { extractTextFromPDF, parseCoordinates, generateGeoJSON, calculateConfidence } from '@/lib/pdfProcessor'
import type { CoordinateMatch } from '@/lib/pdfProcessor'
import { toast } from 'sonner'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [coordinates, setCoordinates] = useState<CoordinateMatch[]>([])
  const [geojson, setGeojson] = useState<any>(null)
  const [confidence, setConfidence] = useState(0)
  const [activeTab, setActiveTab] = useState('text')

  useEffect(() => {
    if (file) {
      processFile(file)
    }
  }, [file])

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setExtractedText('')
    setCoordinates([])
    setGeojson(null)
    
    try {
      toast.info('Processing PDF...', { duration: 2000 })
      
      const text = await extractTextFromPDF(file)
      setExtractedText(text)
      
      const coords = parseCoordinates(text)
      setCoordinates(coords)
      
      const conf = calculateConfidence(text, coords)
      setConfidence(conf)
      
      if (coords.length === 0) {
        toast.warning('No coordinates found in PDF', {
          description: 'Try editing the text manually to add coordinates'
        })
      } else {
        toast.success(`Found ${coords.length} coordinate${coords.length !== 1 ? 's' : ''}`)
      }
    } catch (error) {
      toast.error('Failed to process PDF', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextUpdate = (newText: string) => {
    setExtractedText(newText)
    const coords = parseCoordinates(newText)
    setCoordinates(coords)
    const conf = calculateConfidence(newText, coords)
    setConfidence(conf)
    setGeojson(null)
    toast.success('Text updated - regenerate GeoJSON to see changes')
  }

  const handleGenerateGeoJSON = () => {
    if (coordinates.length === 0) {
      toast.warning('No coordinates available', {
        description: 'Upload a PDF or edit the text to add coordinate data'
      })
      return
    }

    const geoJsonData = generateGeoJSON(coordinates, {
      source: file?.name || 'manual',
      extractedAt: new Date().toISOString()
    })
    
    setGeojson(geoJsonData)
    setActiveTab('geojson')
    toast.success('GeoJSON generated successfully')
  }

  const handleReset = () => {
    setFile(null)
    setExtractedText('')
    setCoordinates([])
    setGeojson(null)
    setConfidence(0)
    setActiveTab('text')
    toast.info('Reset complete')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Globe size={32} weight="duotone" className="text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">PDF to GeoJSON Converter</h1>
              <p className="text-sm text-muted-foreground mt-1">Extract geographic coordinates from PDF documents</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <FileUpload onFileSelect={setFile} isProcessing={isProcessing} />

            {file && (
              <Alert className="border-primary/50 bg-primary/5">
                <Check className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="font-medium">{file.name}</span>
                  <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={66} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">Analyzing document...</p>
              </div>
            )}

            {extractedText && !isProcessing && (
              <>
                {confidence < 0.5 && (
                  <Alert variant="destructive">
                    <Warning className="h-4 w-4" />
                    <AlertDescription>
                      Low confidence extraction. Please review and edit the text manually.
                    </AlertDescription>
                  </Alert>
                )}

                {confidence >= 0.5 && confidence < 0.8 && (
                  <Alert>
                    <Warning className="h-4 w-4" />
                    <AlertDescription>
                      Medium confidence extraction. Review the highlighted coordinates.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleGenerateGeoJSON}
                    disabled={coordinates.length === 0}
                    size="lg"
                    className="flex-1"
                  >
                    Generate GeoJSON
                  </Button>
                  {geojson && (
                    <span className="text-sm text-muted-foreground">
                      {geojson.features.length} feature{geojson.features.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            {extractedText && !isProcessing && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">Extracted Text</TabsTrigger>
                  <TabsTrigger value="geojson" disabled={!geojson}>GeoJSON</TabsTrigger>
                  <TabsTrigger value="map" disabled={!geojson}>Map</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-6">
                  <ExtractedTextView
                    text={extractedText}
                    coordinates={coordinates}
                    onTextUpdate={handleTextUpdate}
                  />
                </TabsContent>

                <TabsContent value="geojson" className="mt-6">
                  <GeoJSONView geojson={geojson} />
                </TabsContent>

                <TabsContent value="map" className="mt-6">
                  <MapPreview geojson={geojson} />
                </TabsContent>
              </Tabs>
            )}

            {!extractedText && !isProcessing && (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Upload a PDF to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground text-center">
            Extract coordinate data from PDFs and convert to GeoJSON format
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
