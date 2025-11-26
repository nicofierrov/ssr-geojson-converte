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
import { Globe, Warning, Check, DownloadSimple, Clock, Sparkle } from '@phosphor-icons/react'
import { processWithAIOnly, generateGeoJSONFromData } from '@/lib/aiOnlyProcessor'
import type { VertexData, TankData, PageAnalysis } from '@/lib/aiOnlyProcessor'
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
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [pages, setPages] = useState<PageAnalysis[]>([])
  const [processingTimeMs, setProcessingTimeMs] = useState(0)

  const steps = [
    { id: 1, label: 'Cargar PDF', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 2, label: 'Renderizar Imágenes', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 3, label: 'Analizar con IA', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 4, label: 'Extraer Coordenadas', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' },
    { id: 5, label: 'Generar GeoJSON', status: 'pending' as 'pending' | 'active' | 'complete' | 'error' }
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
    setPages([])
    setProcessingProgress(0)
    setProcessingStatus('')
    setCurrentStep(1)
    
    try {
      updateStepStatus(1, 'complete')
      updateStepStatus(2, 'active')
      
      toast.info('Iniciando análisis con IA...', { 
        duration: 3000,
        description: 'Procesando PDF sin OCR tradicional'
      })
      
      const result = await processWithAIOnly(file, (current, total, status) => {
        setProcessingProgress(current)
        setProcessingStatus(status)
        
        if (current <= 10) {
          setCurrentStep(1)
          updateStepStatus(1, 'active')
        } else if (current <= 30) {
          setCurrentStep(2)
          updateStepStatus(1, 'complete')
          updateStepStatus(2, 'active')
        } else if (current <= 70) {
          setCurrentStep(3)
          updateStepStatus(2, 'complete')
          updateStepStatus(3, 'active')
        } else if (current <= 90) {
          setCurrentStep(4)
          updateStepStatus(3, 'complete')
          updateStepStatus(4, 'active')
        } else {
          setCurrentStep(5)
          updateStepStatus(4, 'complete')
          updateStepStatus(5, 'active')
        }
      })
      
      setPages(result.pages)
      setVertices(result.vertices)
      setTanks(result.tanks)
      setConfidence(result.overallConfidence)
      setProcessingTimeMs(result.processingTimeMs)
      
      updateStepStatus(5, 'complete')
      
      if (result.vertices.length === 0 && result.tanks.length === 0) {
        toast.warning('No se encontraron coordenadas en el PDF', {
          description: 'El análisis con IA no pudo extraer coordenadas. Verifica el PDF.'
        })
        updateStepStatus(3, 'error')
      } else {
        toast.success(`Análisis completo en ${Math.round(result.processingTimeMs / 1000)}s`, {
          description: `${result.vertices.length} vértices y ${result.tanks.length} estanques extraídos con IA`
        })
        
        const geoJsonData = generateGeoJSONFromData(result.vertices, result.tanks, {
          fuente: file.name,
          fechaExtraccion: new Date().toISOString(),
          sistemaCoordinadas: 'UTM 18S → WGS84',
          metodo: 'IA Vision (GPT-4o)',
          tiempoProcesamiento: `${Math.round(result.processingTimeMs / 1000)}s`,
          paginasAnalizadas: result.pages.length
        })
        
        setGeojson(geoJsonData)
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
      const geoJsonData = generateGeoJSONFromData(updatedVertices, tanks, {
        fuente: file?.name || 'manual',
        fechaExtraccion: new Date().toISOString(),
        sistemaCoordinadas: 'UTM 18S → WGS84',
        metodo: 'IA Vision (editado)'
      })
      setGeojson(geoJsonData)
      toast.success('Vértices actualizados')
    }
  }

  const handleTanksUpdate = (updatedTanks: TankData[]) => {
    setTanks(updatedTanks)
    if (vertices.length > 0 || updatedTanks.length > 0) {
      const geoJsonData = generateGeoJSONFromData(vertices, updatedTanks, {
        fuente: file?.name || 'manual',
        fechaExtraccion: new Date().toISOString(),
        sistemaCoordinadas: 'UTM 18S → WGS84',
        metodo: 'IA Vision (editado)'
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
    setPages([])
    setProcessingProgress(0)
    setProcessingStatus('')
    setProcessingTimeMs(0)
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
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Sparkle size={16} weight="fill" />
                  IA Vision - Extracción de Coordenadas UTM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {geojson && (
                <Button onClick={handleDownload} size="lg" className="gap-2">
                  <DownloadSimple size={20} />
                  Descargar GeoJSON
                </Button>
              )}
            </div>
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
                <div className="space-y-3">
                  <Progress value={processingProgress} className="h-2" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">{processingStatus}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(processingProgress)}% completado</p>
                  </div>
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
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary">{vertices.length} vértices</Badge>
                          <Badge variant="secondary">{tanks.length} estanques</Badge>
                          <Badge variant="outline">UTM 18S</Badge>
                          {pages.length > 0 && (
                            <Badge variant="outline">{pages.length} páginas</Badge>
                          )}
                          {processingTimeMs > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Clock size={12} />
                              {Math.round(processingTimeMs / 1000)}s
                            </Badge>
                          )}
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="vertices">Vértices AS ({vertices.length})</TabsTrigger>
                <TabsTrigger value="tanks">Estanques ({tanks.length})</TabsTrigger>
                <TabsTrigger value="geojson" disabled={!geojson}>GeoJSON</TabsTrigger>
                <TabsTrigger value="pages" disabled={pages.length === 0}>Páginas ({pages.length})</TabsTrigger>
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

              <TabsContent value="pages" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Páginas Analizadas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pages.map(page => (
                      <div key={page.pageNumber} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Página {page.pageNumber}</h4>
                          <Badge variant={page.confidence > 0.7 ? 'default' : 'secondary'}>
                            {Math.round(page.confidence * 100)}% confianza
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tipo: <span className="font-medium">{page.pageType}</span>
                        </p>
                        {page.base64Image && (
                          <img 
                            src={page.base64Image} 
                            alt={`Página ${page.pageNumber}`} 
                            className="w-full h-32 object-cover rounded border border-border"
                          />
                        )}
                        {page.aiAnalysis && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver análisis IA ({page.aiAnalysis.coordenadas.length} coords)
                            </summary>
                            <div className="mt-2 p-2 bg-muted rounded text-xs space-y-2">
                              <p><strong>Tipo:</strong> {page.aiAnalysis.tipo}</p>
                              {page.aiAnalysis.coordenadas.length > 0 && (
                                <p><strong>Coordenadas:</strong> {page.aiAnalysis.coordenadas.map(c => c.label).join(', ')}</p>
                              )}
                              {page.aiAnalysis.observaciones && (
                                <p><strong>Obs:</strong> {page.aiAnalysis.observaciones}</p>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <Sparkle size={16} weight="fill" className="text-accent" />
            Extracción automática con IA Vision de coordenadas UTM 18S
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
