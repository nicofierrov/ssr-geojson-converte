import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import type { VertexData, TankData } from '@/lib/structuredPdfProcessor'

interface MapVisualizationProps {
  vertices: VertexData[]
  tanks: TankData[]
}

export function MapVisualization({ vertices, tanks }: MapVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || (vertices.length === 0 && tanks.length === 0)) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const allPoints = [
      ...vertices.map(v => ({ lat: v.latitude, lon: v.longitude })),
      ...tanks.map(t => ({ lat: t.latitude, lon: t.longitude }))
    ]

    if (allPoints.length === 0) return

    const lats = allPoints.map(p => p.lat)
    const lons = allPoints.map(p => p.lon)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    const padding = 40
    const width = rect.width - padding * 2
    const height = rect.height - padding * 2

    const latRange = maxLat - minLat || 0.01
    const lonRange = maxLon - minLon || 0.01

    const scaleX = width / lonRange
    const scaleY = height / latRange

    const scale = Math.min(scaleX, scaleY)

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const centerLon = (minLon + maxLon) / 2
    const centerLat = (minLat + maxLat) / 2

    const projectPoint = (lat: number, lon: number) => {
      const x = centerX + (lon - centerLon) * scale
      const y = centerY - (lat - centerLat) * scale
      return { x, y }
    }

    if (vertices.length > 0) {
      ctx.beginPath()
      vertices.forEach((vertex, index) => {
        const { x, y } = projectPoint(vertex.latitude, vertex.longitude)
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.fill()

      vertices.forEach((vertex) => {
        const { x, y } = projectPoint(vertex.latitude, vertex.longitude)
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#3b82f6'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }

    tanks.forEach((tank) => {
      const { x, y } = projectPoint(tank.latitude, tank.longitude)
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#f97316'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#1f2937'
      ctx.font = '11px Inter'
      ctx.fillText(tank.name, x + 10, y + 4)
    })

  }, [vertices, tanks])

  if (vertices.length === 0 && tanks.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">
            No hay datos para visualizar
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Carga un PDF para ver el mapa generado
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Visualización del Mapa</h3>
        <p className="text-sm text-muted-foreground">
          Polígono: {vertices.length} vértices | Puntos: {tanks.length} estanques
        </p>
      </div>
      <div className="border rounded-md bg-muted/20">
        <canvas
          ref={canvasRef}
          className="w-full h-[500px]"
          style={{ width: '100%', height: '500px' }}
        />
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
          <span>Vértices AS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white"></div>
          <span>Estanques</span>
        </div>
      </div>
    </Card>
  )
}
