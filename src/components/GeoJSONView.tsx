import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DownloadSimple } from '@phosphor-icons/react'

interface GeoJSONViewProps {
  geojson: any
}

export function GeoJSONView({ geojson }: GeoJSONViewProps) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geojson-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!geojson) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No GeoJSON generated yet</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">GeoJSON Output</h3>
        <Button onClick={handleDownload} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <DownloadSimple className="mr-2" />
          Download
        </Button>
      </div>

      <pre className="bg-secondary text-secondary-foreground p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[400px] overflow-y-auto">
        {JSON.stringify(geojson, null, 2)}
      </pre>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>Features: {geojson.features?.length || 0}</span>
        <span>•</span>
        <span>Type: {geojson.type}</span>
      </div>
    </Card>
  )
}
