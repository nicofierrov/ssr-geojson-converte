import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { PencilSimple, Check, X } from '@phosphor-icons/react'
import type { VertexData } from '@/lib/structuredPdfProcessor'

interface VertexTableProps {
  vertices: VertexData[]
  onUpdate: (vertices: VertexData[]) => void
}

export function VertexTable({ vertices, onUpdate }: VertexTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<VertexData>>({})

  const startEdit = (vertex: VertexData) => {
    setEditingId(vertex.id)
    setEditValues({
      easting: vertex.easting,
      northing: vertex.northing,
      name: vertex.name
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = (vertex: VertexData) => {
    const updated = vertices.map(v => 
      v.id === vertex.id 
        ? { ...v, ...editValues }
        : v
    )
    onUpdate(updated)
    setEditingId(null)
    setEditValues({})
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vértices del Área de Servicio</h3>
          <p className="text-sm text-muted-foreground">
            {vertices.length} vértices extraídos (UTM 18S)
          </p>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Este (UTM)</TableHead>
              <TableHead>Norte (UTM)</TableHead>
              <TableHead>Latitud</TableHead>
              <TableHead>Longitud</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vertices.map((vertex) => (
              <TableRow key={vertex.id}>
                <TableCell className="font-mono text-xs">{vertex.id}</TableCell>
                <TableCell>
                  {editingId === vertex.id ? (
                    <Input
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm">{vertex.name || '-'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === vertex.id ? (
                    <Input
                      type="number"
                      value={editValues.easting || ''}
                      onChange={(e) => setEditValues({ ...editValues, easting: parseFloat(e.target.value) })}
                      className="h-8 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm">{vertex.easting.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === vertex.id ? (
                    <Input
                      type="number"
                      value={editValues.northing || ''}
                      onChange={(e) => setEditValues({ ...editValues, northing: parseFloat(e.target.value) })}
                      className="h-8 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm">{vertex.northing.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {vertex.latitude.toFixed(6)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {vertex.longitude.toFixed(6)}
                  </span>
                </TableCell>
                <TableCell>
                  {editingId === vertex.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(vertex)}>
                        <Check size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(vertex)}>
                      <PencilSimple size={16} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {vertices.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="secondary">
            UTM Zona 18S
          </Badge>
          <Badge variant="outline">
            WGS84 convertido
          </Badge>
        </div>
      )}
    </Card>
  )
}
