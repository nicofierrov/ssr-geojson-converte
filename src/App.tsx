import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { VertexTable } from '@/components/VertexTable'
import { TankTable } from '@/components/TankTable'
import { MapVisualization } from '@/components/MapVisualization'
import { GeoJSONView } from '@/components/GeoJSONView'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Globe, Warning, Check, DownloadSimple } from '@phosphor-icons/react'
import { processStructuredPDF, generateGeoJSONFromStructuredData } from '@/lib/structuredPdfProcessor'
import type { VertexData, TankData } from '@/lib/structuredPdfProcessor'
import { toast } from 'sonner'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [vertices, setVertices] = useState<VertexData[]>([])
  const [tanks, setTanks] = useState<TankData[]>([])
  const [geojson, setGeojson] = useState<any>(null)
  const [confidence, setConfidence] = useState(0)
  const [activeTab, setActiveTab] = useState('vertices')

  const steps = [
    { id: 1, label: 'Cargar', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 2, label: 'Analizar', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 3, label: 'Extraer', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 4, label: 'Convertir', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 5, label: 'Exportar', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' }
  ]

  const [workflowSteps, setWorkflowSteps] = useState(steps)

  useEffect(() => {
    if (file) {
      processFile(file)
    }
  }, [file])

  const updateStepStatus = (stepId: number, status: 'pending' | 'active' | 'complete' | 'error') => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setVertices([])
    setTanks([])
    setGeojson(null)
    setCurrentStep(1)
    
    try {
      updateStepStatus(1, 'complete')
      updateStepStatus(2, 'active')
      toast.info('Analizando estructura del PDF...', { duration: 2000 })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateStepStatus(2, 'complete')
      updateStepStatus(3, 'active')
      toast.info('Extrayendo tablas de coordenadas...', { duration: 2000 })
      
      const data = await processStructuredPDF(file)
      
      setVertices(data.vertices)
      setTanks(data.tanks)
      setConfidence(data.overallConfidence)
      
      updateStepStatus(3, 'complete')
      updateStepStatus(4, 'active')
      toast.info('Convirtiendo coordenadas UTM 18S → WGS84...', { duration: 1500 })
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      updateStepStatus(4, 'complete')
      
      if (data.vertices.length === 0 && data.tanks.length === 0) {
        toast.warning('No se encontraron coordenadas en el PDF', {
          description: 'Verifica que el PDF contenga tablas con coordenadas UTM'
        })
        updateStepStatus(3, 'error')
      } else {
        toast.success(`Extraídos ${data.vertices.length} vértices y ${data.tanks.length} estanques`)
        
        const geoJsonData = generateGeoJSONFromStructuredData(data.vertices, data.tanks, {
          fuente: file.name,
          fechaExtraccion: new Date().toISOString(),
          sistemaCoordinadas: 'UTM 18S → WGS84'
        })
        
        setGeojson(geoJsonData)
        updateStepStatus(5, 'complete')
      }
    } catch (error) {
      toast.error('Error al procesar el PDF', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
      updateStepStatus(currentStep + 1, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerticesUpdate = (updatedVertices: VertexData[]) => {
    setVertices(updatedVertices)
    if (updatedVertices.length > 0 || tanks.length > 0) {
      const geoJsonData = generateGeoJSONFromStructuredData(updatedVertices, tanks, {
        fuente: file?.name || 'manual',
        fechaExtraccion: new Date().toISOString(),
        sistemaCoordinadas: 'UTM 18S → WGS84'
      })
      setGeojson(geoJsonData)
      toast.success('Vértices actualizados')
    }
  }

  const handleTanksUpdate = (updatedTanks: TankData[]) => {
    setTanks(updatedTanks)
    if (vertices.length > 0 || updatedTanks.length > 0) {
      const geoJsonData = generateGeoJSONFromStructuredData(vertices, updatedTanks, {
        fuente: file?.name || 'manual',
        fechaExtraccion: new Date().toISOString(),
        sistemaCoordinadas: 'UTM 18S → WGS84'
      })
      setGeojson(geoJsonData)
      toast.success('Estanques actualizados')
    }
  }

  const handleDownload = () => {
    if (!geojson) return
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geojson-${file?.name.replace('.pdf', '') || 'export'}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('GeoJSON descargado exitosamente')
  }

  const handleReset = () => {
    setFile(null)
    setVertices([])
    setTanks([])
    setGeojson(null)
    setConfidence(0)
    setActiveTab('vertices')
    setCurrentStep(0)
    setWorkflowSteps(steps)
    toast.info('Reiniciado')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={32} weight="duotone" className="text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Extractor GeoJSON</h1>
                <p className="text-sm text-muted-foreground mt-1">Áreas de Servicio y Coordenadas Estanques</p>
              </div>
            </div>
            {geojson && (
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <DownloadSimple size={20} />
                Descargar GeoJSON
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <WorkflowStepper currentStep={currentStep} steps={workflowSteps} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <FileUpload onFileSelect={setFile} isProcessing={isProcessing} />

              {file && (
                <Alert className="border-primary/50 bg-primary/5">
                  <Check className="h-4 w-4 text-primary" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="font-medium">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={handleReset}>Reiniciar</Button>
                  </AlertDescription>
                </Alert>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={66} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">Procesando documento...</p>
                </div>
              )}

              {!isProcessing && (vertices.length > 0 || tanks.length > 0) && (
                <>
                  {confidence < 0.6 && (
                    <Alert variant="destructive">
                      <Warning className="h-4 w-4" />
                      <AlertDescription>
                        Confianza baja en la extracción. Revisa y edita las coordenadas manualmente.
                      </AlertDescription>
                    </Alert>
                  )}

                  {confidence >= 0.6 && confidence < 0.8 && (
                    <Alert>
                      <Warning className="h-4 w-4" />
                      <AlertDescription>
                        Confianza media. Revisa las coordenadas extraídas antes de exportar.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert className="border-green-500/50 bg-green-500/5">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">Extracción completada</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{vertices.length} vértices</Badge>
                          <Badge variant="secondary">{tanks.length} estanques</Badge>
                          <Badge variant="outline">UTM 18S</Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>

            <div>
              {!isProcessing && (vertices.length > 0 || tanks.length > 0) ? (
                <MapVisualization vertices={vertices} tanks={tanks} />
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Carga un PDF para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {!isProcessing && (vertices.length > 0 || tanks.length > 0) && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vertices">Vértices AS ({vertices.length})</TabsTrigger>
                <TabsTrigger value="tanks">Estanques ({tanks.length})</TabsTrigger>
                <TabsTrigger value="geojson" disabled={!geojson}>GeoJSON</TabsTrigger>
              </TabsList>

              <TabsContent value="vertices" className="mt-6">
                <VertexTable vertices={vertices} onUpdate={handleVerticesUpdate} />
              </TabsContent>

              <TabsContent value="tanks" className="mt-6">
                <TankTable tanks={tanks} onUpdate={handleTanksUpdate} />
              </TabsContent>

              <TabsContent value="geojson" className="mt-6">
                <GeoJSONView geojson={geojson} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground text-center">
            Extracción automática de coordenadas UTM 18S desde PDFs estructurados
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
