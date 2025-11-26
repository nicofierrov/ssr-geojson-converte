import { Card } from '@/components/ui/card'
import { MapPin } from '@phosphor-icons/react'
import { useMemo } from 'react'

interface MapPreviewProps {
  geojson: any
}

export function MapPreview({ geojson }: MapPreviewProps) {
  const bounds = useMemo(() => {
    if (!geojson?.features?.length) return null

    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity

    geojson.features.forEach((feature: any) => {
      const [lon, lat] = feature.geometry.coordinates
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLon = Math.min(minLon, lon)
      maxLon = Math.max(maxLon, lon)
    })

    const latRange = maxLat - minLat || 0.1
    const lonRange = maxLon - minLon || 0.1
    const padding = 0.2

    return {
      minLat: minLat - latRange * padding,
      maxLat: maxLat + latRange * padding,
      minLon: minLon - lonRange * padding,
      maxLon: maxLon + lonRange * padding,
    }
  }, [geojson])

  const projectPoint = (lon: number, lat: number) => {
    if (!bounds) return { x: 0, y: 0 }

    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100

    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  if (!geojson?.features?.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <MapPin size={48} className="mx-auto mb-2 opacity-50" />
            <p>No coordinates to display</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Map Preview</h3>
      <div className="relative w-full aspect-[4/3] bg-muted/30 rounded-lg border-2 border-border overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-border" />
            </pattern>
          </defs>
          
          <rect width="100" height="100" fill="url(#grid)" />

          {geojson.features.map((feature: any, idx: number) => {
            const [lon, lat] = feature.geometry.coordinates
            const { x, y } = projectPoint(lon, lat)

            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  className="fill-primary stroke-primary-foreground"
                  strokeWidth="0.5"
                />
                <text
                  x={x}
                  y={y - 3}
                  fontSize="3"
                  textAnchor="middle"
                  className="fill-foreground font-medium"
                >
                  {feature.properties.id}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-muted-foreground bg-background/80 backdrop-blur-sm p-2 rounded">
          <span className="font-mono">{bounds?.minLat.toFixed(4)}°</span>
          <span className="font-mono">{bounds?.maxLat.toFixed(4)}°</span>
        </div>
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm p-2 rounded">
          <div className="font-mono">{bounds?.maxLon.toFixed(4)}°E</div>
        </div>
        <div className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm p-2 rounded">
          <div className="font-mono">{bounds?.minLon.toFixed(4)}°W</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {geojson.features.map((feature: any, idx: number) => (
          <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
            <span className="font-semibold text-primary">#{feature.properties.id}</span>
            <div className="flex-1">
              <p className="font-mono text-xs">
                {feature.geometry.coordinates[1].toFixed(6)}, {feature.geometry.coordinates[0].toFixed(6)}
              </p>
              <p className="text-muted-foreground text-xs mt-1">{feature.properties.raw}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
